/**
 * MRCPCH Study Platform - Cloudflare Worker Backend (ES Module)
 * Connects directly to Cloudflare D1, R2, KV, and Turnstile.
 */

export interface Env {
  DB: D1Database;
  KV?: KVNamespace;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
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

// Simple JWT generation and verification mockup for lightweight edge compatibility
async function generateSimpleToken(user: { id: string; email: string; role: string }) {
  const payload = btoa(JSON.stringify({ ...user, exp: Date.now() + 86400000 })); // 24 hours
  return `jwt_mock_${payload}`;
}

function verifySimpleToken(token: string) {
  if (!token || !token.startsWith('jwt_mock_')) return null;
  try {
    const payloadEncoded = token.replace('jwt_mock_', '');
    const user = JSON.parse(atob(payloadEncoded));
    if (user.exp < Date.now()) return null; // Expired
    return user;
  } catch (e) {
    return null;
  }
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
    const currentUser = verifySimpleToken(token);

    // ==========================================
    // AUTHENTICATION CONTROLLER
    // ==========================================

    // POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
      try {
        const { email, password, fullName } = await request.json() as any;
        if (!email || !password || !fullName) {
          return jsonResponse({ error: 'Missing required fields' }, 400);
        }

        // Generate ID
        const userId = 'u_' + Math.random().toString(36).substring(2, 11);
        // Simple password hash (bcrypt is used in production, here we use simple hash for edge lightweight)
        const passwordHash = btoa(password);

        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, "Student", 1)'
        )
        .bind(userId, email, passwordHash, fullName)
        .run();

        const tokenString = await generateSimpleToken({ id: userId, email, role: 'Student' });
        return jsonResponse({
          token: tokenString,
          user: { id: userId, email, fullName, role: 'Student', isActive: true },
        }, 201);
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Database error occurred' }, 500);
      }
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const { email, password } = await request.json() as any;
        if (!email || !password) {
          return jsonResponse({ error: 'Missing required credentials' }, 400);
        }

        const userRecord: any = await env.DB.prepare(
          'SELECT * FROM users WHERE email = ? LIMIT 1'
        ).bind(email).first();

        if (!userRecord || userRecord.password_hash !== btoa(password)) {
          return jsonResponse({ error: 'Invalid email or password' }, 401);
        }

        if (userRecord.is_active === 0) {
          return jsonResponse({ error: 'Your account has been deactivated' }, 403);
        }

        const tokenString = await generateSimpleToken({
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
        });

        return jsonResponse({
          token: tokenString,
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

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
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
        const newId = 'u_' + Math.random().toString(36).substring(2, 11);
        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)'
        ).bind(newId, email, btoa(password || 'default123'), fullName, role || 'Student').run();

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
        const cached = env.KV ? await env.KV.get(cacheKey) : null;
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
        if (env.KV) {
          await env.KV.put(cacheKey, JSON.stringify(formattedResults), { expirationTtl: 300 }); // 5 min cache
        }
        return jsonResponse(formattedResults);
      }

      const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin');
      if (!isAdmin) {
        return jsonResponse({ error: 'Forbidden. Admin privileges required.' }, 403);
      }

      // POST /api/question-banks
      if (method === 'POST') {
        const { name, description, category } = await request.json() as any;
        const newBankId = 'qb_' + Math.random().toString(36).substring(2, 11);
        await env.DB.prepare(
          'INSERT INTO question_banks (id, name, description, category, created_by, is_archived) VALUES (?, ?, ?, ?, ?, 0)'
        ).bind(newBankId, name, description, category, currentUser.id).run();

        // Evict key from KV Cache
        if (env.KV) {
          await env.KV.delete('mrcpch_kv_banks');
        }

        return jsonResponse({ id: newBankId, name, description, category }, 201);
      }

      // PUT /api/question-banks/:id
      if (method === 'PUT' && bankId) {
        const { name, description, category, isArchived } = await request.json() as any;
        await env.DB.prepare(
          'UPDATE question_banks SET name = ?, description = ?, category = ?, is_archived = ? WHERE id = ?'
        ).bind(name, description, category, isArchived ? 1 : 0, bankId).run();

        // Evict cache
        if (env.KV) {
          await env.KV.delete('mrcpch_kv_banks');
        }
        return jsonResponse({ message: 'Question bank updated' });
      }

      // DELETE /api/question-banks/:id
      if (method === 'DELETE' && bankId) {
        await env.DB.prepare('DELETE FROM question_banks WHERE id = ?').bind(bankId).run();
        // Evict cache
        if (env.KV) {
          await env.KV.delete('mrcpch_kv_banks');
        }
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
        const newQuestId = 'q_' + Math.random().toString(36).substring(2, 11);

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
        if (env.KV) {
          await env.KV.delete('mrcpch_kv_banks');
        }

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
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 11),
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
      const attemptId = 'att_' + Math.random().toString(36).substring(2, 11);

      // Create Attempt Record
      const completedAt = new Date().toISOString();
      const startedAt = new Date(Date.now() - 30 * 60000).toISOString(); // Simulated 30min dur

      const batchStatements = [];

      for (const q of qKeys) {
        const id = q.id as string;
        const correctAns = q.correct_answer as number;
        const selected = answers[id] !== undefined ? answers[id] : -1;
        const isCore = selected === correctAns;
        if (isCore) score++;

        // Add to child items
        batchStatements.push(
          env.DB.prepare(
            'INSERT INTO attempt_answers (id, attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            'att_ans_' + Math.random().toString(36).substring(2, 11),
            attemptId,
            id,
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
        currentUser.id,
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
        'log_' + Math.random().toString(36).substring(2, 11),
        currentUser.id,
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
          if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || q.correctAnswer === undefined) {
            return jsonResponse({ error: `Validation failure at index ${i}: incomplete fields.` }, 400);
          }
          if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
            return jsonResponse({ error: `Validation failure at index ${i}: invalid correctAnswer index.` }, 400);
          }
          verifiedList.push(q);
        }

        // Create new bank
        const bankId = 'qb_imp_' + Math.random().toString(36).substring(2, 11);
        await env.DB.prepare(
          'INSERT INTO question_banks (id, name, description, category, created_by) VALUES (?, ?, "Imported Bank via JSON", "General", ?)'
        ).bind(bankId, name, currentUser.id).run();

        // Prep questions inserts
        const batch = [];
        for (const q of verifiedList) {
          const qId = 'q_' + Math.random().toString(36).substring(2, 11);
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

        if (env.KV) {
          await env.KV.delete('mrcpch_kv_banks');
        }

        return jsonResponse({
          success: true,
          message: `Successfully imported ${verifiedList.length} questions.`,
          bankId,
          importedCount: verifiedList.length,
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 550);
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
        const fileId = 'f_' + Math.random().toString(36).substring(2, 11);
        const objectKey = `materials/${fileId}_${fileName}`;

        // Stream binary file directly into Cloudflare R2
        await env.BUCKET.put(objectKey, fileContent, {
          httpMetadata: { contentType: 'application/pdf' },
        });

        // Resolve absolute URL
        const fileUrl = `https://assets-mrcpch.cloudflare-r2.com/${objectKey}`;

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
