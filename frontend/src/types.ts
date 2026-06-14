export type UserRole = 'Student' | 'Admin' | 'SuperAdmin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  category: string;
  createdBy: string;
  createdAt: string;
  questionCount?: number;
  isArchived?: boolean;
}

export interface Question {
  id: string;
  bankId: string;
  question: string;
  options: string[]; // Handled as JSON string in D1, parsed in frontend
  correctAnswer: number; // 0-based index
  explanation: string;
  tags: string[]; // Commas in D1, array in frontend
  difficulty: 'Easy' | 'Medium' | 'Hard';
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  startedAt: string;
  completedAt: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  metadata: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  questionId: string;
}
