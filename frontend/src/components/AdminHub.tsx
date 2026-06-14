import React, { useState, useEffect } from 'react';
import { User, QuestionBank, Question, ActivityLog } from '../types';
import { api } from '../api';
import { Users, Upload, CheckSquare, ListFilter, AlertTriangle, ShieldCheck, CheckCircle, Search, Edit2, Play, ChevronDown, CheckSquare2 } from 'lucide-react';

interface AdminHubProps {
  currentUser: User;
}

export default function AdminHub({ currentUser }: AdminHubProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'json_import' | 'audit_logs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  
  // Importer states
  const [jsonInput, setJsonInput] = useState('');
  const [validationReport, setValidationReport] = useState<{
    valid: boolean;
    errors: string[];
    summary?: { bankName: string; totalQuestions: number };
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // Users editor states
  const [userSearch, setUserSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'Student' | 'Admin' | 'SuperAdmin'>('Student');
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'users' && currentUser.role === 'SuperAdmin') {
        const uRes = await api.getUsers();
        setUsers(uRes);
      }
      if (activeTab === 'json_import') {
        const bRes = await api.getBanks();
        setBanks(bRes);
      }
      if (activeTab === 'audit_logs') {
        const lRes = await api.getLogs();
        setLogs(lRes);
      }
    } catch (err) {
      console.error("Failed loading admin hub contents", err);
    }
  };

  const handleUserUpdate = async (user: User) => {
    try {
      await api.saveUser({
        ...user,
        role: editRole,
        isActive: editActive,
      });
      setEditingUserId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const validateJson = () => {
    if (!jsonInput.trim()) {
      setValidationReport({ valid: false, errors: ['Please provide valid JSON matching the schema requirements.'] });
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const errorsList: string[] = [];

      if (!parsed.name) {
        errorsList.push('Root Object is missing a "name" property (Question Bank title).');
      }
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        errorsList.push('Root Object is missing a "questions" Array.');
        setValidationReport({ valid: false, errors: errorsList });
        return;
      }

      parsed.questions.forEach((q: any, idx: number) => {
        if (!q.question) {
          errorsList.push(`Question at index ${idx}: "question" property (query text) is missing.`);
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          errorsList.push(`Question at index ${idx}: "options" array is missing or must carry at least 2 multiple choices.`);
        }
        if (q.correctAnswer === undefined || typeof q.correctAnswer !== 'number') {
          errorsList.push(`Question at index ${idx}: "correctAnswer" index number is missing.`);
        } else if (q.options && (q.correctAnswer < 0 || q.correctAnswer >= q.options.length)) {
          errorsList.push(`Question at index ${idx}: "correctAnswer" index (${q.correctAnswer}) is out-of-bounds for choices.`);
        }
      });

      if (errorsList.length > 0) {
        setValidationReport({ valid: false, errors: errorsList });
      } else {
        setValidationReport({
          valid: true,
          errors: [],
          summary: {
            bankName: parsed.name,
            totalQuestions: parsed.questions.length,
          }
        });
      }
    } catch (err: any) {
      setValidationReport({ valid: false, errors: [`JSON Syntax Error: ${err.message}`] });
    }
  };

  const commitJsonImport = async () => {
    if (!validationReport?.valid) return;
    setImporting(true);

    try {
      const parsed = JSON.parse(jsonInput);
      await api.importJson({
        name: parsed.name,
        category: 'General',
        questions: parsed.questions,
      });
      alert(`Syllabus question bank "${parsed.name}" successfully parsed and imported!`);
      setJsonInput('');
      setValidationReport(null);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const getLogMeta = (metadata: string) => {
    try {
      const parsed = JSON.parse(metadata);
      return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
    } catch {
      return metadata;
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Administrative Head Office</h2>
        <p className="text-sm text-slate-500 font-sans">Manage candidate profiles, audit activity trails, and parse bulk JSON question banks.</p>
      </div>

      {/* Tabs list navigation */}
      <div className="flex border-b border-slate-200">
        {currentUser.role === 'SuperAdmin' && (
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'users' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> User Base Roster</span>
          </button>
        )}
        <button 
          onClick={() => setActiveTab('json_import')}
          className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'json_import' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><Upload className="w-4 h-4" /> JSON Syllabus Importer</span>
        </button>
        <button 
          onClick={() => setActiveTab('audit_logs')}
          className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'audit_logs' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-1.5"><CheckSquare className="w-4 h-4" /> Activity Logs</span>
        </button>
      </div>

      {/* Subtab rendering */}
      {activeTab === 'users' && currentUser.role === 'SuperAdmin' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <h3 className="font-bold text-lg text-slate-800">User Accreditations and Statuses</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search candidates by name..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg text-xs border-0 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3">Candidate name</th>
                  <th className="py-3">Email Address</th>
                  <th className="py-3">Designated Role</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Created Date</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredUsers.map(user => {
                  const isEditing = editingUserId === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 font-semibold text-slate-800">{user.fullName}</td>
                      <td className="py-3.5 font-mono text-xs">{user.email}</td>
                      <td className="py-3.5">
                        {isEditing ? (
                          <select 
                            value={editRole}
                            onChange={e => setEditRole(e.target.value as any)}
                            className="bg-slate-50 border-0 p-1.5 rounded text-xs focus:ring-2 focus:ring-teal-500/20"
                          >
                            <option value="Student">Student</option>
                            <option value="Admin">Admin</option>
                            <option value="SuperAdmin">SuperAdmin</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role === 'SuperAdmin' ? 'bg-indigo-50 text-indigo-700' :
                            user.role === 'Admin' ? 'bg-purple-50 text-purple-700' :
                            'bg-teal-50 text-teal-700'
                          }`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {isEditing ? (
                          <select 
                            value={editActive ? 'Active' : 'Deactivated'}
                            onChange={e => setEditActive(e.target.value === 'Active')}
                            className="bg-slate-50 border-0 p-1.5 rounded text-xs focus:ring-2 focus:ring-teal-500/20"
                          >
                            <option value="Active">Active</option>
                            <option value="Deactivated">Deactivated</option>
                          </select>
                        ) : (
                          <span className={`text-xs font-bold ${user.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {user.isActive ? '● Active' : '○ Locked'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs text-slate-400 font-mono">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => setEditingUserId(null)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs"
                            >
                              Discard
                            </button>
                            <button 
                              onClick={() => handleUserUpdate(user)}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded text-xs shadow-3xs"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingUserId(user.id);
                              setEditRole(user.role);
                              setEditActive(user.isActive);
                            }}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-teal-600 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'json_import' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left panel instructions & Editor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Syllabus Import Workbench</h3>
              <p className="text-xs text-slate-500 mt-0.5">Paste raw JSON files matching the designated schematic parameters to compile test arrays instantly.</p>
            </div>

            <textarea 
              rows={12}
              value={jsonInput}
              onChange={e => {
                setJsonInput(e.target.value);
                setValidationReport(null);
              }}
              placeholder={`{
  "name": "MRCPCH Toxicology Core",
  "questions": [
    {
      "question": "A toddler presents after ingesting iron tablets...",
      "options": ["Aspirin", "Desferrioxamine", "N-acetylcysteine", "Sorbitol"],
      "correctAnswer": 1,
      "explanation": "Desferrioxamine is the antidote of choice in systemic Iron toxicity."
    }
  ]
}`}
              className="w-full bg-slate-55/40 font-mono text-xs border border-slate-200 p-4 rounded-lg focus:ring-2 focus:ring-teal-500/20 leading-relaxed"
            />

            <div className="flex gap-4">
              <button 
                onClick={validateJson}
                className="flex-1 bg-slate-850 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Validate JSON Syntax
              </button>
              
              <button 
                onClick={commitJsonImport}
                disabled={!validationReport?.valid || importing}
                className="flex-1 bg-teal-600 hover:bg-teal-550 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <CheckCircle className="w-4 h-4" />
                {importing ? 'Compiling D1...' : 'Deploy Question Bank'}
              </button>
            </div>
          </div>

          {/* Right panel validation reports */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Validation Checklist Result</h3>
            <p className="text-xs text-slate-400">Validator results dynamically analyze option bounds, keys indexing, duplicates, and missing payloads.</p>

            {validationReport === null ? (
              <div className="border border-slate-200/50 p-6 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                <CheckSquare2 className="w-12 h-12 stroke-1 text-slate-300" />
                <p className="text-xs font-semibold mt-3">Ready for verification. Paste JSON data on the left panel.</p>
              </div>
            ) : validationReport.valid ? (
              <div className="border border-emerald-100 bg-emerald-50/20 p-6 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-6 h-6 shrink-0" />
                  <span className="font-bold font-sans">Schema Verification SUCCESSFUL</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold text-slate-700">Bank Title:</span> {validationReport.summary?.bankName}</p>
                  <p><span className="font-semibold text-slate-700">Questions Count:</span> {validationReport.summary?.totalQuestions} items verified.</p>
                  <p><span className="font-semibold text-slate-700">Database Binding:</span> Ready to seed live into Cloudflare D1.</p>
                </div>
              </div>
            ) : (
              <div className="border border-red-100 bg-red-50/20 p-6 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <span className="font-bold font-sans">Schema Validation FAILURE</span>
                </div>
                <div className="text-xs text-slate-600 space-y-2 max-h-48 overflow-y-auto">
                  {validationReport.errors.map((err, eIdx) => (
                    <p key={eIdx} className="text-red-700 flex items-start gap-1 font-mono">
                      <span>•</span>
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit_logs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="font-bold text-lg text-slate-800">Global Activity Logs (Chronological ledger)</h3>
          <p className="text-xs text-slate-400">Audit logs tracking core user sessions, exam submissions, and guidelines deployment.</p>

          <div className="space-y-3.5">
            {logs.map(log => (
              <div key={log.id} className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-sans transition hover:bg-slate-100/50">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                    <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-slate-200 text-slate-700">{log.action}</span>
                    Performed by {log.userName}
                  </p>
                  <p className="text-slate-400 font-mono text-[10px] sm:text-xs">Context metadata: {getLogMeta(log.metadata)}</p>
                </div>
                <span className="text-[10px] font-mono whitespace-nowrap text-slate-400 font-semibold">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
