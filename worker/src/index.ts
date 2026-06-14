/**
 * MRCPCH Study Platform - Cloudflare Worker Backend (ES Module)
 * Connects directly to Cloudflare D1, R2, KV, and Turnstile.
 */

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  TURNSTILE_SECRET_KEY?: string;
  R2_PUBLIC_BASE_URL?: string;
}

// Helper to generate simple JSON responses
function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

// CORS Preflight handler
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}


type Role = 'Student' | 'Admin' | 'SuperAdmin';
type AuthUser = { id: string; email: string; role: Role; exp: number; typ: 'access' | 'refresh' };
const enc = new TextEncoder();
const dec = new TextDecoder();
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const allowedRoles = new Set(['Student', 'Admin', 'SuperAdmin']);

function id(prefix: string) { return `${prefix}_${crypto.randomUUID()}`; }
function b64url(bytes: ArrayBuffer | Uint8Array) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = ''; for (const b of u8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(input: string) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signJwt(env: Env, user: { id: string; email: string; role: Role }, typ: 'access' | 'refresh') {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...user, typ, iat: now, exp: now + (typ === 'access' ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS), jti: id('tok') };
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const data = `${head}.${body}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env.JWT_SECRET), enc.encode(data));
  return `${data}.${b64url(sig)}`;
}
async function verifyJwt(env: Env, token: string): Promise<AuthUser | null> {
  const parts = token.split('.'); if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.JWT_SECRET), fromB64url(sig), enc.encode(`${head}.${body}`));
  if (!ok) return null;
  const payload = JSON.parse(dec.decode(fromB64url(body))) as AuthUser;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
async function hashPassword(password: string, salt: string = crypto.randomUUID() as string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$210000$${salt}$${b64url(bits)}`;
}
async function verifyPassword(password: string, stored: string) {
  const [, , salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  return await hashPassword(password, salt) === stored;
}
async function issueSession(env: Env, user: { id: string; email: string; role: Role }) {
  const token = await signJwt(env, user, 'access');
  const refreshToken = await signJwt(env, user, 'refresh');
  await env.KV.put(`refresh:${user.id}:${refreshToken.slice(-32)}`, '1', { expirationTtl: REFRESH_TTL_SECONDS });
  return { token, refreshToken };
}
function requireRole(user: AuthUser | null, roles: Role[]) { return !!user && roles.includes(user.role); }
async function verifyTurnstile(request: Request, env: Env, token?: string) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const form = new FormData(); form.append('secret', env.TURNSTILE_SECRET_KEY); form.append('response', token); form.append('remoteip', request.headers.get('CF-Connecting-IP') || '');
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const json = await res.json() as { success: boolean };
  return json.success;
}
function assertQuestion(q: any, i = 0) {
  if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(q.correctAnswer)) throw new Error(`Validation failure at index ${i}: incomplete fields.`);
  if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) throw new Error(`Validation failure at index ${i}: invalid correctAnswer index.`);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    // 1. JWT Authentication Parser Middleware
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/, '');
    const currentUser = await verifyJwt(env, token);

    // ==========================================
    // AUTHENTICATION CONTROLLER
    // ==========================================

    // POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
      try {
        const { email, password, fullName, turnstileToken } = await request.json() as any;
        if (!email || !password || !fullName || !(await verifyTurnstile(request, env, turnstileToken))) {
          return jsonResponse({ error: 'Missing required fields' }, 400);
        }

        // Generate ID
        const userId = id('u');
        const passwordHash = await hashPassword(password);

        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, "Student", 1)'
        )
        .bind(userId, email, passwordHash, fullName)
        .run();

        const session = await issueSession(env, { id: userId, email, role: 'Student' });
        return jsonResponse({
          ...session,
          user: { id: userId, email, fullName, role: 'Student', isActive: true },
        }, 201);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Database error occurred' }, 500);
      }
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const { email, password, turnstileToken } = await request.json() as any;
        if (!email || !password || !(await verifyTurnstile(request, env, turnstileToken))) {
          return jsonResponse({ error: 'Missing required credentials' }, 400);
        }

        const userRecord: any = await env.DB.prepare(
          'SELECT * FROM users WHERE email = ? LIMIT 1'
        ).bind(email).first();

        if (!userRecord || !(await verifyPassword(password, userRecord.password_hash))) {
          return jsonResponse({ error: 'Invalid email or password' }, 401);
        }

        if (userRecord.is_active === 0) {
          return jsonResponse({ error: 'Your account has been deactivated' }, 403);
        }

        const session = await issueSession(env, {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
        });

        return jsonResponse({
          ...session,
          user: {
            id: userRecord.id,
            email: userRecord.email,
            fullName: userRecord.full_name,
            role: userRecord.role,
            isActive: true,
          },
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }


    // POST /api/auth/google - verifies a Google ID token and creates/updates the user.
    if (path === '/api/auth/google' && method === 'POST') {
      const { idToken } = await request.json() as any;
      if (!idToken || !env.GOOGLE_CLIENT_ID) return jsonResponse({ error: 'Missing Google OAuth configuration' }, 400);
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!googleRes.ok) return jsonResponse({ error: 'Invalid Google token' }, 401);
      const profile = await googleRes.json() as { aud: string; email: string; name?: string; sub: string; email_verified?: string };
      if (profile.aud !== env.GOOGLE_CLIENT_ID || profile.email_verified !== 'true') return jsonResponse({ error: 'Google token audience or email verification failed' }, 401);
      let userRecord: any = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(profile.email).first();
      if (!userRecord) {
        const userId = id('u');
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, "Student", 1)')
          .bind(userId, profile.email, await hashPassword(crypto.randomUUID()), profile.name || profile.email).run();
        userRecord = { id: userId, email: profile.email, full_name: profile.name || profile.email, role: 'Student', is_active: 1 };
      }
      if (userRecord.is_active === 0) return jsonResponse({ error: 'Your account has been deactivated' }, 403);
      const session = await issueSession(env, { id: userRecord.id, email: userRecord.email, role: userRecord.role });
      return jsonResponse({ ...session, user: { id: userRecord.id, email: userRecord.email, fullName: userRecord.full_name, role: userRecord.role, isActive: true } });
    }

    // POST /api/auth/refresh - exchanges a valid refresh token for a new session.
    if (path === '/api/auth/refresh' && method === 'POST') {
      const { refreshToken } = await request.json() as any;
      const refreshUser = await verifyJwt(env, refreshToken || '');
      if (!refreshUser || refreshUser.typ !== 'refresh') return jsonResponse({ error: 'Invalid refresh token' }, 401);
      const cached = await env.KV.get(`refresh:${refreshUser.id}:${refreshToken.slice(-32)}`);
      if (!cached) return jsonResponse({ error: 'Refresh token has been revoked' }, 401);
      const session = await issueSession(env, { id: refreshUser.id, email: refreshUser.email, role: refreshUser.role });
      return jsonResponse(session);
    }

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
      if (currentUser) await env.KV.delete(`refresh:${currentUser.id}:${token.slice(-32)}`);
      return jsonResponse({ message: 'Successfully logged out' });
    }

    // ==========================================
    // MIDDLEWARE EXCLUSION FOR PUBLIC ROUTES
    // ==========================================
    // If not authenticated, reject private APIs
    if (!currentUser) {
      // Allow viewing raw materials as public occasionally, but guard for other APIs
      const isPublicGet = (path.startsWith('/api/question-banks') || path.startsWith('/api/materials')) && method === 'GET';
      if (!isPublicGet) {
        return jsonResponse({ error: 'Unauthorized. Please login first.' }, 401);
      }
    }

    // ==========================================
    // USERS MANAGEMENT CONTROLLER (Admin / Super)
    // ==========================================
    if (path.startsWith('/api/users')) {
      const isAuthorized = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
      if (!isAuthorized) {
        return jsonResponse({ error: 'Forbidden. Admin privileges required.' }, 403);
      }

      // GET /api/users
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, email, full_name as fullName, role, is_active as isActive, created_at as createdAt FROM users').all();
        return jsonResponse(results);
      }

      // POST /api/users
      if (method === 'POST') {
        const { email, password, fullName, role } = await request.json() as any;
        const newId = id('u');
        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)'
        ).bind(newId, email, await hashPassword(password || crypto.randomUUID()), fullName, allowedRoles.has(role) ? role : 'Student').run();

        return jsonResponse({ id: newId, email, fullName, role, isActive: true }, 201);
      }

      // PUT /api/users/:id
      if (method === 'PUT') {
        const userId = path.split('/').pop();
        const { fullName, role, isActive } = await request.json() as any;

        await env.DB.prepare(
          'UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(fullName, role, isActive ? 1 : 0, userId).run();

        return jsonResponse({ message: 'User updated successfully' });
      }

      // DELETE /api/users/:id
      if (method === 'DELETE') {
        const userId = path.split('/').pop();
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
        return jsonResponse({ message: 'User deleted successfully' });
      }
    }

    // ==========================================
    // QUESTION BANK CONTROLLER
    // ==========================================
    if (path.startsWith('/api/question-banks')) {
      const bankId = path.split('/')[3]; // e.g., /api/question-banks/qb_cards

      // GET /api/question-banks
      if (method === 'GET') {
        // Try to fetch from KV caching for fast read first
        const cacheKey = 'mrcpch_kv_banks';
        const cached = await env.KV.get(cacheKey);
        if (cached) {
          return jsonResponse(JSON.parse(cached), 200, { 'X-Cache-Status': 'HIT' });
        }

        const { results } = await env.DB.prepare(`
          SELECT qb.*, COUNT(q.id) as question_count 
          FROM question_banks qb
          LEFT JOIN questions q ON qb.id = q.bank_id
          WHERE qb.is_archived = 0
          GROUP BY qb.id
        `).all();

        const formattedResults = results.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          createdBy: r.created_by,
          createdAt: r.created_at,
          questionCount: r.question_count,
        }));

        // Write into KV Cache
        await env.KV.put(cacheKey, JSON.stringify(formattedResults), { expirationTtl: 300 }); // 5 min cache
        return jsonResponse(formattedResults);
      }

      const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
      if (!isAdmin) {
        return jsonResponse({ error: 'Forbidden. Admin privileges required.' }, 403);
      }

      // POST /api/question-banks
      if (method === 'POST') {
        const { name, description, category } = await request.json() as any;
        const newBankId = id('qb');
        await env.DB.prepare(
          'INSERT INTO question_banks (id, name, description, category, created_by, is_archived) VALUES (?, ?, ?, ?, ?, 0)'
        ).bind(newBankId, name, description, category, currentUser.id).run();

        // Evict key from KV Cache
        await env.KV.delete('mrcpch_kv_banks');

        return jsonResponse({ id: newBankId, name, description, category }, 201);
      }

      // PUT /api/question-banks/:id
      if (method === 'PUT' && bankId) {
        const { name, description, category, isArchived } = await request.json() as any;
        await env.DB.prepare(
          'UPDATE question_banks SET name = ?, description = ?, category = ?, is_archived = ? WHERE id = ?'
        ).bind(name, description, category, isArchived ? 1 : 0, bankId).run();

        // Evict cache
        await env.KV.delete('mrcpch_kv_banks');
        return jsonResponse({ message: 'Question bank updated' });
      }

      // DELETE /api/question-banks/:id
      if (method === 'DELETE' && bankId) {
        await env.DB.prepare('DELETE FROM question_banks WHERE id = ?').bind(bankId).run();
        // Evict cache
        await env.KV.delete('mrcpch_kv_banks');
        return jsonResponse({ message: 'Question bank deleted' });
      }
    }

    // ==========================================
    // QUESTIONS MODULE (GET by Bank, POST questions)
    // ==========================================
    if (path === '/api/questions') {
      // GET /api/questions?bankId=qb_cards
      if (method === 'GET') {
        const filterBank = url.searchParams.get('bankId');
        if (!filterBank) {
          return jsonResponse({ error: 'Missing bankId query parameter' }, 400);
        }

        const { results } = await env.DB.prepare(
          'SELECT * FROM questions WHERE bank_id = ?'
        ).bind(filterBank).all();

        const formattedQuestions = results.map((q: any) => ({
          id: q.id,
          bankId: q.bank_id,
          question: q.question,
          options: JSON.parse(q.options_json),
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          tags: q.tags ? q.tags.split(',') : [],
          difficulty: q.difficulty,
          createdAt: q.created_at,
        }));

        return jsonResponse(formattedQuestions);
      }

      // POST /api/questions (Create question - Admin only)
      if (method === 'POST') {
        const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
        if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

        const { bankId, question, options, correctAnswer, explanation, tags, difficulty } = await request.json() as any;
        assertQuestion({ question, options, correctAnswer });
        const newQuestId = id('q');

        await env.DB.prepare(
          'INSERT INTO questions (id, bank_id, question, options_json, correct_answer, explanation, tags, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          newQuestId,
          bankId,
          question,
          JSON.stringify(options),
          correctAnswer,
          explanation,
          Array.isArray(tags) ? tags.join(',') : tags || '',
          difficulty || 'Medium'
        ).run();

        // Clear cached banks count
        await env.KV.delete('mrcpch_kv_banks');

        return jsonResponse({ id: newQuestId, question, options, correctAnswer, difficulty }, 201);
      }
    }

    // ==========================================
    // EXAM ENGINE CONTROLLERS
    // ==========================================

    // POST /api/exams/start
    if (path === '/api/exams/start' && method === 'POST') {
      const { bankId } = await request.json() as any;
      const { results } = await env.DB.prepare('SELECT id FROM questions WHERE bank_id = ?').bind(bankId).all();
      return jsonResponse({
        sessionId: id('sess'),
        questionIds: results.map((r: any) => r.id),
      });
    }

    // POST /api/exams/submit
    if (path === '/api/exams/submit' && method === 'POST') {
      const { bankId, answers } = await request.json() as any; // Record<questionId, selectedIdx>
      if (!bankId || !answers) {
        return jsonResponse({ error: 'Missing answers or bankId' }, 400);
      }

      // Fetch official keys from D1
      const { results: qKeys } = await env.DB.prepare(
        'SELECT id, correct_answer FROM questions WHERE bank_id = ?'
      ).bind(bankId).all();

      let score = 0;
      const totalQuestions = qKeys.length;
      const attemptId = id('att');

      // Create Attempt Record
      const completedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - 30 * 60000).toISOString(); // Simulated 30min dur

      const batchStatements = [];

      for (const q of qKeys) {
        const questionId = q.id as string;
        const correctAns = q.correct_answer as number;
        const selected = answers[questionId] !== undefined ? answers[questionId] : -1;
        const isCore = selected === correctAns;
        if (isCore) score++;

        // Add to child items
        batchStatements.push(
          env.DB.prepare(
            'INSERT INTO attempt_answers (id, attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            id('att_ans'),
            attemptId,
            questionId,
            selected,
            isCore ? 1 : 0
          )
        );
      }

      const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

      // Primary insertion
      await env.DB.prepare(
        'INSERT INTO attempts (id, user_id, bank_id, score, total_questions, percentage, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        attemptId,
        currentUser!.id,
        bankId,
        score,
        totalQuestions,
        percentage,
        startedAt,
        completedAt
      ).run();

      // Run child insertions in transaction
      if (batchStatements.length > 0) {
        await env.DB.batch(batchStatements);
      }

      // Log action audit
      await env.DB.prepare(
        'INSERT INTO activity_logs (id, user_id, action, metadata) VALUES (?, ?, "EXAM_SUBMITTED", ?)'
      ).bind(
        id('log'),
        currentUser!.id,
        JSON.stringify({ attemptId, score, percentage })
      ).run();

      return jsonResponse({
        id: attemptId,
        score,
        totalQuestions,
        percentage,
        completedAt,
      });
    }

    // ==========================================
    // JSON QUESTIONS IMPORT ENGINES (JSON upload parser)
    // ==========================================
    if (path === '/api/import-json' && method === 'POST') {
      const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
      if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

      try {
        const body = await request.json() as any;
        const { name, questions } = body;

        if (!name || !Array.isArray(questions) || questions.length === 0) {
          return jsonResponse({ error: 'Invalid schema. Provide a name and questions array.' }, 400);
        }

        // Schema validation
        const verifiedList = [];
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          assertQuestion(q, i);
          const existing = await env.DB.prepare('SELECT id FROM questions WHERE question = ? LIMIT 1').bind(q.question).first();
          if (existing) continue;
          verifiedList.push(q);
        }

        // Create new bank
        const bankId = id('qb_imp');
        await env.DB.prepare(
          'INSERT INTO question_banks (id, name, description, category, created_by) VALUES (?, ?, "Imported Bank via JSON", "General", ?)'
        ).bind(bankId, name, currentUser.id).run();

        // Prep questions inserts
        const batch = [];
        for (const q of verifiedList) {
          const qId = id('q');
          batch.push(
            env.DB.prepare(
              'INSERT INTO questions (id, bank_id, question, options_json, correct_answer, explanation, tags, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, "Medium")'
            ).bind(
              qId,
              bankId,
              q.question,
              JSON.stringify(q.options),
              q.correctAnswer,
              q.explanation || 'No explanation provided.',
              q.tags ? q.tags.join(',') : ''
            )
          );
        }

        if (batch.length > 0) {
          await env.DB.batch(batch);
        }

        await env.KV.delete('mrcpch_kv_banks');

        return jsonResponse({
          success: true,
          message: `Successfully imported ${verifiedList.length} questions.`,
          bankId,
          importedCount: verifiedList.length,
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

    // ==========================================
    // STUDY MATERIALS MODULE
    // ==========================================
    if (path.startsWith('/api/materials')) {
      // GET /api/materials
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM study_materials').all();
        const formatted = results.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          fileUrl: m.file_url,
          uploadedBy: m.uploaded_by,
          uploadedAt: m.uploaded_at,
        }));
        return jsonResponse(formatted);
      }

      // POST /api/materials/upload (Upload reference - Admin Only)
      if (method === 'POST') {
        const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
        if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);

        const { title, description, category, fileName, fileDataB64 } = await request.json() as any;
        if (!title || !category || !fileName || !fileDataB64) {
          return jsonResponse({ error: 'Missing required files data' }, 400);
        }

        // Parse file stream
        const fileContent = Uint8Array.from(atob(fileDataB64), c => c.charCodeAt(0));
        const fileId = id('f');
        const objectKey = `materials/${fileId}_${fileName}`;

        // Stream binary file directly into Cloudflare R2
        await env.BUCKET.put(objectKey, fileContent, {
          httpMetadata: { contentType: 'application/pdf' },
        });

        // Resolve absolute URL
        const fileUrl = `${env.R2_PUBLIC_BASE_URL || 'https://assets.example.com'}/${objectKey}`;

        await env.DB.prepare(
          'INSERT INTO study_materials (id, title, description, category, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(fileId, title, description, category, fileUrl, currentUser.id).run();

        return jsonResponse({ id: fileId, title, fileUrl }, 201);
      }
    }

    // ==========================================
    // ANALYTICS & DASHBOARD SUMMARY CONTROLLER
    // ==========================================
    if (path === '/api/analytics' && method === 'GET') {
      try {
        // Fetch users info
        const totalStudentsResult: any = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = "Student"').first();
        const activeStudentsResult: any = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = "Student" AND is_active = 1').first();
        const totalBanksResult: any = await env.DB.prepare('SELECT COUNT(*) as cnt FROM question_banks').first();
        const totalQuestionsResult: any = await env.DB.prepare('SELECT COUNT(*) as cnt FROM questions').first();

        // Exam metrics
        const totalAttempts: any = await env.DB.prepare('SELECT COUNT(*) as cnt FROM attempts').first();
        const avgPercentage: any = await env.DB.prepare('SELECT AVG(percentage) as val FROM attempts').first();

        // Category performance summary grouping
        const { results: categoryAverages } = await env.DB.prepare(`
          SELECT qb.category, AVG(a.percentage) as avg_score, COUNT(a.id) as attempts_count
          FROM attempts a
          JOIN question_banks qb ON a.bank_id = qb.id
          GROUP BY qb.category
        `).all();

        // Recent attempts log
        const { results: recentAttempts } = await env.DB.prepare(`
          SELECT a.id, u.full_name as studentName, qb.name as bankName, a.score, a.total_questions as totalQuestions, a.percentage, a.completed_at as completedAt
          FROM attempts a
          JOIN users u ON a.user_id = u.id
          JOIN question_banks qb ON a.bank_id = qb.id
          ORDER BY a.completed_at DESC LIMIT 5
        `).all();

        return jsonResponse({
          totalStudents: totalStudentsResult?.cnt || 0,
          activeStudents: activeStudentsResult?.cnt || 0,
          totalQuestionBanks: totalBanksResult?.cnt || 0,
          totalQuestions: totalQuestionsResult?.cnt || 0,
          totalAttempts: totalAttempts?.cnt || 0,
          averageScore: parseFloat((avgPercentage?.val || 0).toFixed(1)),
          categoryAverages,
          recentAttempts,
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // 404 Handler
    return jsonResponse({ error: `Not Found: ${path}` }, 404);
  },
};
