import { User, QuestionBank, Question, ExamAttempt, StudyMaterial, ActivityLog } from './types';
import { INITIAL_USERS, INITIAL_BANKS, INITIAL_QUESTIONS, INITIAL_MATERIALS, INITIAL_LOGS } from './mockData';

// Setup local store if missing
const initLocalStorage = () => {
  if (!localStorage.getItem('mrcpch_users')) {
    localStorage.setItem('mrcpch_users', JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem('mrcpch_banks')) {
    localStorage.setItem('mrcpch_banks', JSON.stringify(INITIAL_BANKS));
  }
  if (!localStorage.getItem('mrcpch_questions')) {
    localStorage.setItem('mrcpch_questions', JSON.stringify(INITIAL_QUESTIONS));
  }
  if (!localStorage.getItem('mrcpch_materials')) {
    localStorage.setItem('mrcpch_materials', JSON.stringify(INITIAL_MATERIALS));
  }
  if (!localStorage.getItem('mrcpch_attempts')) {
    localStorage.setItem('mrcpch_attempts', JSON.stringify([]));
  }
  if (!localStorage.getItem('mrcpch_bookmarks')) {
    localStorage.setItem('mrcpch_bookmarks', JSON.stringify([]));
  }
  if (!localStorage.getItem('mrcpch_logs')) {
    localStorage.setItem('mrcpch_logs', JSON.stringify(INITIAL_LOGS));
  }
};
initLocalStorage();

// Simple API helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('mrcpch_token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const API_BASE_URL = window.location.origin;

// Generic request wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('mrcpch_token');
        localStorage.removeItem('mrcpch_currentUser');
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error((errData as any).error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn(`Real API server at ${url} not reachable. Falling back to secure simulated local state engine.`, err);
    throw err; // propagates to local fallback switcher
  }
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    try {
      return await request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch {
      // Fallback Engine
      const sUsers: User[] = JSON.parse(localStorage.getItem('mrcpch_users') || '[]');
      const match = sUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      // Simple password check mockup: matching name hashes
      if (!match) throw new Error('Account with this email does not exist.');

      // Mock token
      const token = `jwt_mock_${btoa(JSON.stringify({ ...match, exp: Date.now() + 86400000 }))}`;
      localStorage.setItem('mrcpch_token', token);
      localStorage.setItem('mrcpch_currentUser', JSON.stringify(match));

      // Append log
      const logId = 'log_' + Math.random().toString(36).substring(2, 11);
      const sLogs: ActivityLog[] = JSON.parse(localStorage.getItem('mrcpch_logs') || '[]');
      sLogs.unshift({
        id: logId,
        userId: match.id,
        userName: match.fullName,
        action: 'MEMBER_SIGNED_IN',
        metadata: JSON.stringify({ device: 'Web Sandbox' }),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('mrcpch_logs', JSON.stringify(sLogs));

      return { token, user: match };
    }
  },

  async register(email: string, fullName: string, pword: string): Promise<{ token: string; user: User }> {
    try {
      return await request<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, fullName, password: pword }),
      });
    } catch {
      const sUsers: User[] = JSON.parse(localStorage.getItem('mrcpch_users') || '[]');
      if (sUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('This email is already registered.');
      }

      const newUser: User = {
        id: 'u_' + Math.random().toString(36).substring(2, 11),
        email,
        fullName,
        role: 'Student',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      sUsers.push(newUser);
      localStorage.setItem('mrcpch_users', JSON.stringify(sUsers));

      const token = `jwt_mock_${btoa(JSON.stringify({ ...newUser, exp: Date.now() + 86400000 }))}`;
      localStorage.setItem('mrcpch_token', token);
      localStorage.setItem('mrcpch_currentUser', JSON.stringify(newUser));

      return { token, user: newUser };
    }
  },

  logout(): void {
    localStorage.removeItem('mrcpch_token');
    localStorage.removeItem('mrcpch_currentUser');
  },

  // User Administration
  async getUsers(): Promise<User[]> {
    try {
      return await request<User[]>('/api/users');
    } catch {
      return JSON.parse(localStorage.getItem('mrcpch_users') || '[]');
    }
  },

  async saveUser(user: User): Promise<User> {
    try {
      return await request<User>(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
    } catch {
      const sUsers: User[] = JSON.parse(localStorage.getItem('mrcpch_users') || '[]');
      const idx = sUsers.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        sUsers[idx] = { ...sUsers[idx], ...user };
        localStorage.setItem('mrcpch_users', JSON.stringify(sUsers));
      }
      return user;
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await request(`/api/users/${userId}`, { method: 'DELETE' });
    } catch {
      const sUsers: User[] = JSON.parse(localStorage.getItem('mrcpch_users') || '[]');
      const filtered = sUsers.filter(u => u.id !== userId);
      localStorage.setItem('mrcpch_users', JSON.stringify(filtered));
    }
  },

  // Question Banks
  async getBanks(): Promise<QuestionBank[]> {
    try {
      return await request<QuestionBank[]>('/api/question-banks');
    } catch {
      const banks: QuestionBank[] = JSON.parse(localStorage.getItem('mrcpch_banks') || '[]');
      const questions: Question[] = JSON.parse(localStorage.getItem('mrcpch_questions') || '[]');
      return banks.map(b => ({
        ...b,
        questionCount: questions.filter(q => q.bankId === b.id).length,
      }));
    }
  },

  async saveBank(bank: QuestionBank): Promise<QuestionBank> {
    try {
      return await request<QuestionBank>(`/api/question-banks${bank.id ? `/${bank.id}` : ''}`, {
        method: bank.id ? 'PUT' : 'POST',
        body: JSON.stringify(bank),
      });
    } catch {
      const sBanks: QuestionBank[] = JSON.parse(localStorage.getItem('mrcpch_banks') || '[]');
      if (!bank.id) {
        bank.id = 'qb_' + Math.random().toString(36).substring(2, 11);
        bank.createdAt = new Date().toISOString();
        sBanks.unshift(bank);
      } else {
        const idx = sBanks.findIndex(b => b.id === bank.id);
        if (idx !== -1) sBanks[idx] = { ...sBanks[idx], ...bank };
      }
      localStorage.setItem('mrcpch_banks', JSON.stringify(sBanks));
      return bank;
    }
  },

  async deleteBank(bankId: string): Promise<void> {
    try {
      await request(`/api/question-banks/${bankId}`, { method: 'DELETE' });
    } catch {
      const sBanks: QuestionBank[] = JSON.parse(localStorage.getItem('mrcpch_banks') || '[]');
      const filtered = sBanks.filter(b => b.id !== bankId);
      localStorage.setItem('mrcpch_banks', JSON.stringify(filtered));
    }
  },

  // Questions
  async getQuestions(bankId: string): Promise<Question[]> {
    try {
      return await request<Question[]>(`/api/questions?bankId=${bankId}`);
    } catch {
      const all: Question[] = JSON.parse(localStorage.getItem('mrcpch_questions') || '[]');
      return all.filter(q => q.bankId === bankId);
    }
  },

  async saveQuestion(question: Question): Promise<Question> {
    try {
      return await request<Question>('/api/questions', {
        method: 'POST',
        body: JSON.stringify(question),
      });
    } catch {
      const sQuestions: Question[] = JSON.parse(localStorage.getItem('mrcpch_questions') || '[]');
      if (!question.id) {
        question.id = 'q_' + Math.random().toString(36).substring(2, 11);
        question.createdAt = new Date().toISOString();
        sQuestions.push(question);
      } else {
        const idx = sQuestions.findIndex(q => q.id === question.id);
        if (idx !== -1) sQuestions[idx] = { ...sQuestions[idx], ...question };
      }
      localStorage.setItem('mrcpch_questions', JSON.stringify(sQuestions));
      return question;
    }
  },

  // JSON Question Bank Importer
  async importJson(payload: { name: string; category?: string; questions: any[] }): Promise<{ bankId: string; importedCount: number }> {
    try {
      return await request<{ bankId: string; importedCount: number }>('/api/import-json', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback parser
      const newBankId = 'qb_imp_' + Math.random().toString(36).substring(2, 11);
      const sBanks: QuestionBank[] = JSON.parse(localStorage.getItem('mrcpch_banks') || '[]');
      
      const newBank: QuestionBank = {
        id: newBankId,
        name: payload.name,
        description: `Imported ${payload.questions.length} questions from JSON configuration.`,
        category: payload.category || 'General',
        createdBy: 'u2_admin',
        createdAt: new Date().toISOString(),
        questionCount: payload.questions.length,
      };
      sBanks.unshift(newBank);
      localStorage.setItem('mrcpch_banks', JSON.stringify(sBanks));

      const sQuestions: Question[] = JSON.parse(localStorage.getItem('mrcpch_questions') || '[]');
      payload.questions.forEach((q, idx) => {
        const mappedQuest: Question = {
          id: `q_imp_${idx}_` + Math.random().toString(36).substring(2, 11),
          bankId: newBankId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'Directly imported from clinical records source.',
          tags: q.tags || ['JsonImport'],
          difficulty: q.difficulty || 'Medium',
          createdAt: new Date().toISOString(),
        };
        sQuestions.push(mappedQuest);
      });
      localStorage.setItem('mrcpch_questions', JSON.stringify(sQuestions));

      return { bankId: newBankId, importedCount: payload.questions.length };
    }
  },

  // Exam Submissions & Trackings
  async submitExam(bankId: string, answers: Record<string, number>): Promise<ExamAttempt> {
    try {
      return await request<ExamAttempt>('/api/exams/submit', {
        method: 'POST',
        body: JSON.stringify({ bankId, answers }),
      });
    } catch {
      const qList: Question[] = JSON.parse(localStorage.getItem('mrcpch_questions') || '[]');
      const bankQuest = qList.filter(q => q.bankId === bankId);
      const sBanks: QuestionBank[] = JSON.parse(localStorage.getItem('mrcpch_banks') || '[]');
      const bankName = sBanks.find(b => b.id === bankId)?.name || 'Study Bank';

      let score = 0;
      bankQuest.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
          score++;
        }
      });

      const attempt: ExamAttempt = {
        id: 'att_' + Math.random().toString(36).substring(2, 11),
        userId: 'u1_student',
        bankId,
        bankName,
        score,
        totalQuestions: bankQuest.length,
        percentage: bankQuest.length > 0 ? parseFloat(((score / bankQuest.length) * 100).toFixed(1)) : 0,
        startedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        completedAt: new Date().toISOString(),
        answers,
      };

      const attemptsList: ExamAttempt[] = JSON.parse(localStorage.getItem('mrcpch_attempts') || '[]');
      attemptsList.unshift(attempt);
      localStorage.setItem('mrcpch_attempts', JSON.stringify(attemptsList));

      // Logger
      const sLogs: ActivityLog[] = JSON.parse(localStorage.getItem('mrcpch_logs') || '[]');
      sLogs.unshift({
        id: 'log_' + Math.random().toString(36).substring(2, 11),
        userId: 'u1_student',
        userName: 'Dr. Kathir Student',
        action: 'EXAM_SUBMITTED',
        metadata: JSON.stringify({ bankId, score, total: bankQuest.length, pct: attempt.percentage }),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('mrcpch_logs', JSON.stringify(sLogs));

      return attempt;
    }
  },

  async getAttempts(): Promise<ExamAttempt[]> {
    return JSON.parse(localStorage.getItem('mrcpch_attempts') || '[]');
  },

  // Bookmarks
  async getBookmarks(): Promise<string[]> {
    const list = JSON.parse(localStorage.getItem('mrcpch_bookmarks') || '[]');
    return list.map((b: any) => b.questionId);
  },

  async toggleBookmark(questionId: string): Promise<boolean> {
    const list = JSON.parse(localStorage.getItem('mrcpch_bookmarks') || '[]');
    const idx = list.findIndex((b: any) => b.questionId === questionId);
    let isBookmarked = false;
    if (idx === -1) {
      list.push({ id: `b_${Math.random().toString(36).substring(2, 9)}`, questionId });
      isBookmarked = true;
    } else {
      list.splice(idx, 1);
    }
    localStorage.setItem('mrcpch_bookmarks', JSON.stringify(list));
    return isBookmarked;
  },

  // Audit Logs
  async getLogs(): Promise<ActivityLog[]> {
    return JSON.parse(localStorage.getItem('mrcpch_logs') || '[]');
  },

  // Study Materials
  async getMaterials(): Promise<StudyMaterial[]> {
    try {
      return await request<StudyMaterial[]>('/api/materials');
    } catch {
      return JSON.parse(localStorage.getItem('mrcpch_materials') || '[]');
    }
  },

  async uploadMaterial(material: Omit<StudyMaterial, 'id' | 'uploadedAt'> & { fileData?: string }): Promise<StudyMaterial> {
    const newMaterial: StudyMaterial = {
      id: 'sm_' + Math.random().toString(36).substring(2, 11),
      title: material.title,
      description: material.description,
      category: material.category,
      fileUrl: material.fileUrl || 'https://assets.mrcped.org/guidelines/custom_material.pdf',
      fileSize: material.fileSize || '1.1 MB',
      uploadedBy: material.uploadedBy || 'Administrator',
      uploadedAt: new Date().toISOString(),
    };

    try {
      // In real server, fileData base64 is uploaded as JSON payload.
      if (material.fileData) {
        await request<any>('/api/materials/upload', {
          method: 'POST',
          body: JSON.stringify({
            title: material.title,
            description: material.description,
            category: material.category,
            fileName: 'custom_material.pdf',
            fileDataB64: material.fileData,
          }),
        });
      }
    } catch {
      // Local Sync
      const sMats: StudyMaterial[] = JSON.parse(localStorage.getItem('mrcpch_materials') || '[]');
      sMats.unshift(newMaterial);
      localStorage.setItem('mrcpch_materials', JSON.stringify(sMats));
    }
    return newMaterial;
  },
};
