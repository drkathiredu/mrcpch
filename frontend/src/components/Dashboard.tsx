import React, { useState, useEffect } from 'react';
import { User, ExamAttempt, QuestionBank } from '../types';
import { api } from '../api';
import { BookOpen, Award, CheckCircle2, TrendingUp, Calendar, ArrowRight, BookMarked, Layers } from 'lucide-react';

interface DashboardProps {
  user: User;
  onNavigate: (page: string) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [attRes, bankRes] = await Promise.all([
          api.getAttempts(),
          api.getBanks(),
        ]);
        setAttempts(attRes);
        setBanks(bankRes);
      } catch (err) {
        console.error("Failed to load dashboard statistics", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Statistics calculation for current Student
  const totalExams = attempts.length;
  const avgScore = totalExams > 0 ? parseFloat((attempts.reduce((acc, curr) => acc + curr.percentage, 0) / totalExams).toFixed(1)) : 0;
  const bestScore = totalExams > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0;

  // Topic Performance Mockup grouping from attempts
  const topicStats = [
    { name: 'Cardiology', count: 18, score: totalExams > 0 ? Math.round(avgScore * 0.95) : 78, color: 'bg-teal-500' },
    { name: 'Neonatal Care', count: 12, score: totalExams > 0 ? Math.round(avgScore * 0.88) : 64, color: 'bg-purple-500' },
    { name: 'Respiratory', count: 15, score: totalExams > 0 ? Math.round(avgScore * 1.05) : 85, color: 'bg-indigo-500' },
    { name: 'Emergencies', count: 8, score: 72, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and User Greeting Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.fullName}!</h1>
            <p className="mt-2 text-teal-100 font-normal">
              Continuous revision builds permanent pathways. Keep practicing for your upcoming MRCPCH exams.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('banks')}
            className="self-start md:self-auto flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl text-teal-800 font-semibold shadow hover:bg-teal-50 transition-all text-sm"
          >
            Launch Revision
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-12 translate-x-6">
          <BookOpen className="w-80 h-80" />
        </div>
      </div>

      {user.role === 'Student' ? (
        <>
          {/* Main Summary Metric tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Exams Taken</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalExams}</h3>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                <BookMarked className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Score</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{avgScore}%</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Best Performance</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{bestScore}%</h3>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Question Banks Available</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{banks.length}</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Layers className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Graphical grids & reports */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Interactive SVG Graph */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Exam Score Performance</h3>
                  <p className="text-xs text-slate-400">Chronological list of all practice examinations taken</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Score (%)
                </div>
              </div>

              {totalExams === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <TrendingUp className="w-12 h-12 text-slate-300 stroke-1" />
                  <p className="mt-3 text-sm font-medium">No diagnostic exam history yet</p>
                  <button 
                    onClick={() => onNavigate('banks')}
                    className="mt-4 text-xs font-semibold text-teal-600"
                  >
                    Start your first test bank
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-64 overflow-visible">
                  <svg className="w-full h-full" viewBox="0 0 500 240" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="40" y1="30" x2="480" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="150" x2="480" y2="150" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="210" x2="480" y2="210" stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* Y Axis descriptors */}
                    <text x="15" y="34" className="fill-slate-400 text-[10px] font-mono">100</text>
                    <text x="15" y="94" className="fill-slate-400 text-[10px] font-mono">50</text>
                    <text x="15" y="214" className="fill-slate-400 text-[10px] font-mono">0</text>

                    {/* Polyline Path */}
                    <path
                      d={attempts
                        .slice()
                        .reverse()
                        .map((attempt, index) => {
                          const scale = attempts.length > 1 ? attempts.length - 1 : 1;
                          const x = 40 + (index / scale) * 410;
                          const y = 210 - (attempt.percentage / 100) * 180;
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Highlighted circles */}
                    {attempts.slice().reverse().map((attempt, index) => {
                      const scale = attempts.length > 1 ? attempts.length - 1 : 1;
                      const x = 40 + (index / scale) * 410;
                      const y = 210 - (attempt.percentage / 100) * 180;
                      return (
                        <g key={attempt.id} className="group cursor-pointer">
                          <circle cx={x} cy={y} r="6" fill="#0d9488" stroke="#ffffff" strokeWidth="2" />
                          <circle cx={x} cy={y} r="10" fill="#0d9488" fillOpacity="0.1" className="hidden group-hover:block" />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex justify-between px-10 text-[10px] font-mono text-slate-400 mt-2">
                    <span>First Exam</span>
                    <span>Most Recent</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Weak/Strong Topics Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-lg font-bold text-slate-800">Pediatric Categories Analysis</h3>
              <p className="text-xs text-slate-400 mt-1">Accuracy thresholds across syllabus subjects</p>

              <div className="mt-6 space-y-5">
                {topicStats.map(topic => (
                  <div key={topic.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${topic.color}`}></span>
                        {topic.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {topic.score}% accuracy ({topic.count} questions)
                      </span>
                    </div>
                    {/* Custom Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 bg-teal-500`}
                        style={{ width: `${topic.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Pane: Recent Submissions logs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800">Recent Action Ledger</h3>
            <p className="text-xs text-slate-400 mt-1">Audit profile log of your completed exams</p>

            {attempts.length === 0 ? (
              <p className="text-slate-400 text-sm mt-4">You have not completed any revision tests yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3">Revision Bank</th>
                      <th className="py-3">Score</th>
                      <th className="py-3">Percentage</th>
                      <th className="py-3">Completed At</th>
                      <th className="py-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                    {attempts.slice(0, 5).map(att => (
                      <tr key={att.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 font-semibold text-slate-800">{att.bankName}</td>
                        <td className="py-3.5 font-mono">{att.score} / {att.totalQuestions}</td>
                        <td className="py-3.5 font-mono font-semibold">{att.percentage}%</td>
                        <td className="py-3.5 text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(att.completedAt).toLocaleString()}
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            att.percentage >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {att.percentage >= 70 ? 'PASS threshold' : 'REVISION advised'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Admin Dashboards */
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
          <Layers className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 mt-3">Instructor Administrative Office</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Welcome, Board Member. Use the upper navigation bar to create question banks, audit profiles, review activity audit trails, or import JSON syllabus assets.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button 
              onClick={() => onNavigate('admin_panel')}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-xs transition text-sm font-semibold"
            >
              Configure Question Banks / Users
            </button>
            <button 
              onClick={() => onNavigate('books')}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition text-sm font-semibold"
            >
              Browse Public Repository
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
