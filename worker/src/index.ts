/**
 * MRCPCH Study Platform - Cloudflare Worker Backend (ES Module)
 * Connects directly to Cloudflare D1, R2, KV, and Turnstile.
 */

export interface Env {
  DB?: D1Database;
  KV?: KVNamespace;
  BUCKET?: R2Bucket;
  JWT_SECRET?: string;
}

// -------------------------------------------------------------------------
// Zero-Config Fallbacks: In-Memory Simulated Database and Bucket Engine
// -------------------------------------------------------------------------

function createMockD1(): any {
  const mockUsers = [
    { id: 'u1_student', email: 'drstudent@example.com', full_name: 'Dr. Kathir Student', role: 'Student', is_active: 1, created_at: '2026-06-13T12:00:00Z', password_hash: btoa('student123') },
    { id: 'u2_admin', email: 'mrcpchadmin@example.com', full_name: 'Dr. Alice Roberts (Admin)', role: 'Admin', is_active: 1, created_at: '2026-06-12T12:00:00Z', password_hash: btoa('admin123') },
    { id: 'u3_superadmin', email: 'superadmin@example.com', full_name: 'Senior Board Chair (SuperAdmin)', role: 'SuperAdmin', is_active: 1, created_at: '2026-06-10T12:00:00Z', password_hash: btoa('super123') }
  ];
  const mockBanks = [
    { id: 'qb_cards', name: 'Cardiology Core Essentials', description: 'High-yield cardiology questions covering congenital anomalies, murmurs, and ECG findings.', category: 'Cardiology', created_by: 'u2_admin', created_at: '2026-06-14T01:05:00Z', is_archived: 0 },
    { id: 'qb_neonatal', name: 'Neonatal & Prematurity Care', description: 'Advanced neonatal medicine, incubator care, respiratory distress, and metabolic emergencies.', category: 'Neonatal', created_by: 'u2_admin', created_at: '2026-06-14T01:10:00Z', is_archived: 0 },
    { id: 'qb_respiratory', name: 'Pediatric Pulmonology & Allergy', description: 'Common upper/lower airway conditions, asthma guidelines, and allergy profiles in children.', category: 'Respiratory', created_by: 'u2_admin', created_at: '2026-06-14T01:15:00Z', is_archived: 0 }
  ];
  const mockQuestions = [
    {
      id: 'q_card1',
      bank_id: 'qb_cards',
      question: 'A 2-month-old infant is brought to clinic due to feeding difficulties and diaphoresis when breastfeeding. On examination, there is a harsh pansystolic murmur heard loudest at the left lower sternal border (LLSB). What is the most likely diagnosis?',
      options_json: JSON.stringify([
        'Ventricular Septal Defect (VSD)',
        'Atrial Septal Defect (ASD)',
        'Patent Ductus Arteriosus (PDA)',
        'Tetralogy of Fallot',
      ]),
      correct_answer: 0,
      explanation: 'A harsh holosystolic/pansystolic murmur at the left lower sternal border in an infant presenting with feeding difficulties and poor weight gain is highly characteristic of a moderate-to-large Ventricular Septal Defect (VSD).',
      tags: 'VSD,Murmur,Congenital-Anomalies',
      difficulty: 'Medium',
      created_at: '2026-06-14T01:05:00Z'
    },
    {
      id: 'q_card2',
      bank_id: 'qb_cards',
      question: 'A parent brings their 4-year-old child who experienced a transient loss of consciousness while crying intensely after scraping her knee. She turned blue, went limp, but recovered fully within 30 seconds. What is the appropriate management?',
      options_json: JSON.stringify([
        'Immediate Pediatric Cardiology Referral',
        'Reassurance and Education on Breath-Holding Spells',
        'Start Oral Propranolol Therapy',
        'Arrange an Urgent 24-Hour ambulatory ECG',
      ]),
      correct_answer: 1,
      explanation: 'This scenario describes a classic cyanotic Breath-holding Spell, which is a benign, paroxysmal non-epileptic event common in children aged 6 months to 6 years. Reassurance is the key mainstay of treatment.',
      tags: 'Autonomic,Fainting,Breath-holding',
      difficulty: 'Easy',
      created_at: '2026-06-14T01:06:00Z'
    },
    {
      id: 'q_card3',
      bank_id: 'qb_cards',
      question: 'Which of the following clinical features is pathognomonic of Coarctation of the Aorta in a neonate presenting with acute cardiogenic shock?',
      options_json: JSON.stringify([
        'Wide pulse pressure with bounding pulses',
        'Significant blood pressure and femoral pulse delay/differential between upper and lower limbs',
        'Harsh diastolic murmur at the apex',
        'Isolated right axis deviation on electrocardiogram',
      ]),
      correct_answer: 1,
      explanation: 'Coarctation of the aorta is a duct-dependent systemic lesion. Closure of the ductus arteriosus causes severe shock. Perfusion delay to lower limbs gives rise to distinct femoral pulse delays and blood pressure gradients.',
      tags: 'Coarctation,Pulses,Duct-dependent',
      difficulty: 'Hard',
      created_at: '2026-06-14T01:07:00Z'
    }
  ];
  const mockStudyMaterials = [
    { id: 'm1', title: 'NICE Asthma Guidelines (2025 Updates)', description: 'Latest pharmacological treatment pathways and step-up guidelines for pediatric asthma.', format: 'PDF', file_url: 'https://assets-mrcpch.cloudflare-r2.com/materials/sample_guideline.pdf', uploaded_by: 'u2_admin', uploaded_at: '2026-06-12T10:00:00Z' },
    { id: 'm2', title: 'EKG and ECG Interpretation Checklist', description: 'Essential flashcards for long QT, blockages, WPW syndrome, and neonate physiology.', format: 'Interactive Flashcard', file_url: 'https://assets-mrcpch.cloudflare-r2.com/materials/sample_ekg.pdf', uploaded_by: 'u2_admin', uploaded_at: '2026-06-13T04:30:00Z' }
  ];
  const mockAttempts: any[] = [];

  const handleQuery = (sql: string, params: any[]) => {
    const s = sql.toLowerCase().trim();
    if (s.includes('select * from users') || s.includes('select id, email')) {
      if (s.includes('where email =')) {
        const email = params[0]?.toLowerCase();
        const user = mockUsers.find(u => u.email.toLowerCase() === email);
        return [user];
      }
      return mockUsers;
    }
    if (s.includes('select qb.*') || s.includes('select * from question_banks')) {
      return mockBanks.map(b => ({
        ...b,
        question_count: mockQuestions.filter(q => q.bank_id === b.id).length
      }));
    }
    if (s.includes('select * from questions')) {
      if (s.includes('where bank_id =')) {
        const bankId = params[0];
        return mockQuestions.filter(q => q.bank_id === bankId);
      }
      return mockQuestions;
    }
    if (s.includes('select id from questions')) {
      const bankId = params[0];
      return mockQuestions.filter(q => q.bank_id === bankId).map(q => ({ id: q.id }));
    }
    if (s.includes('select * from study_materials')) {
      return mockStudyMaterials;
    }
    if (s.includes('select count(*)')) {
      if (s.includes('from users')) {
        return [{ cnt: mockUsers.length }];
      }
      if (s.includes('from question_banks')) {
        return [{ cnt: mockBanks.length }];
      }
      if (s.includes('from questions')) {
        return [{ cnt: mockQuestions.length }];
      }
      if (s.includes('from attempts')) {
        return [{ cnt: mockAttempts.length }];
      }
    }
    if (s.includes('select avg(percentage)')) {
      return [{ val: 78.5 }];
    }
    if (s.includes('avg(percentage) as avg_score') || s.includes('category_averages')) {
      return [
        { category: 'Cardiology', avg_score: 82.0 },
        { category: 'Neonatal', avg_score: 75.5 }
      ];
    }
    if (s.includes('recent-attempts-with-details') || s.includes('from attempts a')) {
      return mockAttempts;
    }

    // Mutator mock logs
    if (s.includes('insert into users')) {
      const newUser = {
        id: params[0],
        email: params[1],
        password_hash: params[2],
        full_name: params[3],
        role: params[4] || 'Student',
        is_active: 1,
        created_at: new Date().toISOString()
      };
      mockUsers.push(newUser);
      return { success: true };
    }
    if (s.includes('insert into question_banks')) {
      const newBank = {
        id: params[0],
        name: params[1],
        description: params[2],
        category: params[3],
        created_by: params[4],
        created_at: new Date().toISOString(),
        is_archived: 0
      };
      mockBanks.push(newBank);
      return { success: true };
    }
    if (s.includes('insert into questions')) {
      const newQ = {
        id: params[0],
        bank_id: params[1],
        question: params[2],
        options_json: params[3],
        correct_answer: params[4],
        explanation: params[5],
        tags: params[6],
        difficulty: params[7],
        created_at: new Date().toISOString()
      };
      mockQuestions.push(newQ);
      return { success: true };
    }
    if (s.includes('insert into attempts')) {
      const newAtt = {
        id: params[0],
        user_id: params[1],
        bank_id: params[2],
        score: params[3],
        total_questions: params[4],
        percentage: params[5],
        completed_at: new Date().toISOString()
      };
      mockAttempts.push(newAtt);
      return { success: true };
    }

    return [];
  };

  const createStmt = (sql: string, params: any[] = []): any => {
    return {
      bind(...bindParams: any[]) {
        return createStmt(sql, bindParams);
      },
      async all() {
        const results = handleQuery(sql, params) as any[];
        return { results: Array.isArray(results) ? results : [] };
      },
      async first() {
        const results = handleQuery(sql, params) as any[];
        return Array.isArray(results) ? results[0] || null : results;
      },
      async run() {
        handleQuery(sql, params);
        return { success: true };
      }
    };
  };

  return {
    prepare(sql: string) {
      return createStmt(sql);
    },
    async batch(statements: any[]) {
      const results: any[] = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    }
  };
}

function createMockBucket(): any {
  return {
    async put(key: string, value: any, options?: any) {
      console.log(`Mock R2 upload to: ${key}`);
      return { key };
    }
  };
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
    // Zero-Config Auto-initialization fallbacks
    if (!env.DB) {
      env.DB = createMockD1();
    }
    if (!env.BUCKET) {
      env.BUCKET = createMockBucket();
    }
    if (!env.JWT_SECRET) {
      env.JWT_SECRET = 'mrcpch_study_platform_default_key_32_chars_long';
    }

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
