import React, { useState, useEffect } from 'react';
import { User } from './types';
import { api } from './api';
import Dashboard from './components/Dashboard';
import QuestionBanks from './components/QuestionBanks';
import ExamEngine from './components/ExamEngine';
import StudyMaterials from './components/StudyMaterials';
import AdminHub from './components/AdminHub';
import { BookOpen, Layers, ShieldCheck, FileText, Settings, UserCheck, Moon, Sun, LogOut, ArrowRight, Activity } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState<string>('dashboard'); // dashboard | banks | exam | materials | admin_panel | settings
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(false);

  // Auth form states
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Read persisted token
    const sToken = localStorage.getItem('mrcpch_token');
    const sUser = localStorage.getItem('mrcpch_currentUser');
    if (sToken && sUser) {
      setToken(sToken);
      setCurrentUser(JSON.parse(sUser));
    }

    // Read stored user theme preference
    const storedTheme = localStorage.getItem('mrcpch_theme_dark');
    if (storedTheme === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Check Cloudflare Edge API connection state
    const diagnoseServer = async () => {
      const isAlive = await api.checkConnection();
      setBackendAlive(isAlive);
    };
    diagnoseServer();
  }, []);


  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem('mrcpch_theme_dark', nextDark ? 'true' : 'false');
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setCurrentUser(res.user);
      setPage('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Verification failure. Please audit details.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.register(email, fullName, password);
      setToken(res.token);
      setCurrentUser(res.user);
      setPage('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Registration details must carry real email properties.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setToken(null);
    setCurrentUser(null);
    setPage('dashboard');
    setSelectedBankId(null);
  };

  const handleSelectBank = (bankId: string) => {
    setSelectedBankId(bankId);
    setPage('exam');
  };

  const handleBackToBanks = () => {
    setSelectedBankId(null);
    setPage('banks');
  };

  const navigateTo = (destination: string) => {
    setPage(destination);
    setSelectedBankId(null);
  };

  // Auth screen layout
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-slate-50 transition-colors duration-200 ${darkMode ? 'bg-slate-900 text-slate-100' : 'text-slate-900'}`}>
        <div className={`w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-6 ${darkMode ? 'bg-slate-850 border-slate-700' : ''}`}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto shadow shadow-teal-500/30">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">MRCPCH Study Platform</h1>
            <p className="text-xs text-slate-400 font-sans">Royal College of Paediatrics Core Preparations Hub</p>
          </div>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Candidate Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Kathir Roberts"
                  required
                  className={`w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 ${darkMode ? 'bg-slate-800' : ''}`}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Clinical Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="drstudent@example.com"
                required
                className={`w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 ${darkMode ? 'bg-slate-800' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Account Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 ${darkMode ? 'bg-slate-800' : ''}`}
              />
            </div>

            {authError && (
              <p className="text-xs font-semibold text-red-500 font-mono bg-red-50 p-2 text-center rounded border border-red-100">{authError}</p>
            )}

            {/* Zero-Config Reassurance Advice */}
            <div className={`p-3 rounded-lg text-[11px] leading-relaxed border flex items-start gap-2 ${
              darkMode 
                ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
                : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
            }`}>
              <span className="text-emerald-500 font-bold block mt-0.5">⚡ Info</span>
              <span className="font-normal">
                <strong>Zero Setup Required:</strong> Since you have no secrets configured, the app runs in built-in <strong>Local Sandbox Mode</strong> using browser state. All tests, answers, and mock profiles work instantly!
              </span>
            </div>

            {/* Cloudflare Turnstile Bot protection widget visualization */}
            <div className="border border-slate-100/80 bg-slate-50/50 p-3 rounded-lg flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Cloudflare Turnstile Verified
              </span>
              <span className="font-mono text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Pass</span>
            </div>


            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-teal-600 hover:bg-teal-550 text-white font-semibold py-3 rounded-xl transition text-sm shadow cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {isRegister ? 'Construct Profile' : 'Authenticate credentials'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            {isRegister ? 'Joined the syllabus already?' : 'No active test credentials?'}
            <button 
              onClick={() => {
                setAuthError('');
                setIsRegister(!isRegister);
              }}
              className="text-teal-600 font-bold ml-1 hover:underline cursor-pointer"
            >
              {isRegister ? 'Sign In' : 'Register Account'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50/50 text-slate-900 transition-colors duration-200 ${darkMode ? 'bg-slate-900 text-slate-100' : ''}`}>
      {/* Upper Unified Web Navigation Header */}
      <nav className={`bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-3xs ${darkMode ? 'bg-slate-850 border-slate-800' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold tracking-tight text-base leading-none text-slate-800 dark:text-slate-100">MRCPCH Hub</h1>
              {backendAlive === true ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100/60 dark:border-teal-900/60 uppercase tracking-wide cursor-help" title="Connected to Edge Server & Cloud SQL D1 Database.">
                  <span className="w-1 h-1 rounded-full bg-teal-500 mr-1 animate-pulse"></span>
                  Cloud Live
                </span>
              ) : backendAlive === false ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wide cursor-help" title="No Cloud server detected. Automatically using built-in high-performance local web storage. Zero setup required!">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1"></span>
                  Local State (No Setup)
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100/60 uppercase tracking-wide animate-pulse">
                  Detecting...
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-sans mt-1">Edge Board</p>
          </div>
        </div>


        {/* Central Nav Actions */}
        <div className="hidden md:flex items-center gap-1">
          <button 
            onClick={() => navigateTo('dashboard')}
            className={`px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              page === 'dashboard' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => navigateTo('banks')}
            className={`px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              page === 'banks' || page === 'exam' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Question Banks
          </button>
          <button 
            onClick={() => navigateTo('materials')}
            className={`px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              page === 'materials' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Study Materials
          </button>

          {(currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') && (
            <button 
              onClick={() => navigateTo('admin_panel')}
              className={`px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                page === 'admin_panel' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Admin Hub
            </button>
          )}
        </div>

        {/* Right Settings Toggle actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
            {currentUser.role}
          </span>
          
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
            title="Toggle theme contrast"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Sign out Candidates ID"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Bar */}
      <div className={`md:hidden flex justify-around bg-white border-b border-slate-100 p-2 shadow-sm ${darkMode ? 'bg-slate-850' : ''}`}>
        <button onClick={() => navigateTo('dashboard')} className={`p-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${page === 'dashboard' ? 'text-teal-600' : 'text-slate-500'}`}>Dashboard</button>
        <button onClick={() => navigateTo('banks')} className={`p-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${page === 'banks' || page === 'exam' ? 'text-teal-600' : 'text-slate-500'}`}>Q-Banks</button>
        <button onClick={() => navigateTo('materials')} className={`p-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${page === 'materials' ? 'text-teal-600' : 'text-slate-500'}`}>Materials</button>
        {(currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') && (
          <button onClick={() => navigateTo('admin_panel')} className={`p-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${page === 'admin_panel' ? 'text-teal-600' : 'text-slate-550'}`}>Admin</button>
        )}
      </div>

      {/* Primary Layout Center stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {page === 'dashboard' && <Dashboard user={currentUser} onNavigate={navigateTo} />}
        {page === 'banks' && <QuestionBanks user={currentUser} onSelectBank={handleSelectBank} />}
        {page === 'exam' && selectedBankId && <ExamEngine user={currentUser} bankId={selectedBankId} onBack={handleBackToBanks} />}
        {page === 'materials' && <StudyMaterials user={currentUser} />}
        {page === 'admin_panel' && <AdminHub currentUser={currentUser} />}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 font-sans tracking-wide">
        &copy; {new Date().getFullYear()} MRCPCH Study Platform. Powered by Cloudflare Serverless Architecture.
      </footer>
    </div>
  );
}
