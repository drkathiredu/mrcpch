import React, { useState, useEffect, useRef } from 'react';
import { Question, ExamAttempt, User } from '../types';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Bookmark, Clock, Flag, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye, Sparkles, Lightbulb } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ExamEngineProps {
  user: User;
  bankId: string;
  onBack: () => void;
}

export default function ExamEngine({ user, bankId, onBack }: ExamEngineProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExamMode, setIsExamMode] = useState(false); // Practice vs Quiz mode
  const [started, setStarted] = useState(false);
  
  // Game states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  
  // Timers
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes default
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ExamAttempt | null>(null);
  const [submittingLoader, setSubmittingLoader] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gemini AI States
  const [aiExplain, setAiExplain] = useState<Record<string, string>>({});
  const [aiMnemonic, setAiMnemonic] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, 'explain' | 'mnemonic' | null>>({});
  const [aiError, setAiError] = useState<Record<string, string>>({});

  const fetchAiExplanation = async (q: Question) => {
    setAiLoading(prev => ({ ...prev, [q.id]: 'explain' }));
    setAiError(prev => ({ ...prev, [q.id]: '' }));
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        }),
      });
      if (!response.ok) {
        throw new Error('Could not retrieve Gemini clinical analysis. Check your API token details.');
      }
      const data = await response.json();
      setAiExplain(prev => ({ ...prev, [q.id]: data.explanation }));
    } catch (err: any) {
      setAiError(prev => ({ ...prev, [q.id]: err.message || 'AI tutoring temporarily unavailable.' }));
    } finally {
      setAiLoading(prev => ({ ...prev, [q.id]: null }));
    }
  };

  const fetchAiMnemonic = async (q: Question) => {
    setAiLoading(prev => ({ ...prev, [q.id]: 'mnemonic' }));
    setAiError(prev => ({ ...prev, [q.id]: '' }));
    try {
      const response = await fetch('/api/gemini/mnemonic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: q.tags?.join(', ') || q.question.substring(0, 40),
          context: `Question: ${q.question}\nCorrect Option: ${q.options[q.correctAnswer]}`,
        }),
      });
      if (!response.ok) {
        throw new Error('Could not formulate Mnemonic. Verify key setups.');
      }
      const data = await response.json();
      setAiMnemonic(prev => ({ ...prev, [q.id]: data.mnemonic }));
    } catch (err: any) {
      setAiError(prev => ({ ...prev, [q.id]: err.message || 'AI mnemonic helper offline.' }));
    } finally {
      setAiLoading(prev => ({ ...prev, [q.id]: null }));
    }
  };

  const renderGeminiSupportOfQuestion = (q: Question) => {
    const isExplLoading = aiLoading[q.id] === 'explain';
    const isMnemLoading = aiLoading[q.id] === 'mnemonic';
    const currentExpl = aiExplain[q.id];
    const currentMnem = aiMnemonic[q.id];
    const currentErr = aiError[q.id];

    return (
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchAiExplanation(q)}
            disabled={isExplLoading || isMnemLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition ${
              currentExpl
                ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            } disabled:opacity-55`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-teal-600 ${isExplLoading ? 'animate-spin' : ''}`} />
            {isExplLoading ? 'Consulting Tutor...' : currentExpl ? 'Clinical Analysis Unlocked' : 'Ask Clinical Advisor (AI)'}
          </button>

          <button
            onClick={() => fetchAiMnemonic(q)}
            disabled={isExplLoading || isMnemLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition ${
              currentMnem
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            } disabled:opacity-55`}
          >
            <Lightbulb className={`w-3.5 h-3.5 text-indigo-500 ${isMnemLoading ? 'animate-bounce' : ''}`} />
            {isMnemLoading ? 'Formulating...' : currentMnem ? 'Memory Trick Unlocked' : 'Get Mnemonic Trick (AI)'}
          </button>
        </div>

        {(isExplLoading || isMnemLoading) && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700 animate-pulse space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-pulse"></div>
          </div>
        )}

        {currentErr && (
          <p className="text-[11px] font-medium font-mono text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400">
            ⚠️ {currentErr}
          </p>
        )}

        {currentExpl && !isExplLoading && (
          <div className="p-5 bg-teal-50/10 border border-teal-100/40 rounded-xl space-y-2 dark:bg-teal-950/10 dark:border-teal-900/30">
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block border-b border-teal-100/40 dark:border-teal-900/30 pb-1 mb-2">
              📋 Clinical Board Analysis Summary
            </span>
            <MarkdownRenderer content={currentExpl} />
          </div>
        )}

        {currentMnem && !isMnemLoading && (
          <div className="p-5 bg-indigo-50/10 border border-indigo-100/40 rounded-xl space-y-2 dark:bg-indigo-950/10 dark:border-indigo-900/30">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block border-b border-indigo-100/40 dark:border-indigo-900/30 pb-1 mb-2">
              🧠 Clinical Memory Accelerator
            </span>
            <MarkdownRenderer content={currentMnem} />
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, bRes] = await Promise.all([
          api.getQuestions(bankId),
          api.getBookmarks(),
        ]);
        setQuestions(qRes);
        setBookmarks(bRes);
      } catch (err) {
        console.error("Failed loading exam information", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bankId]);

  // Handle countdown timer in exam mode
  useEffect(() => {
    if (started && isExamMode && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(); // Auto-submit when timer expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, isExamMode, submitted]);

  // Auto-save local state replica in case they reload
  useEffect(() => {
    if (started && !submitted) {
      localStorage.setItem(`exam_draft_${bankId}`, JSON.stringify({ answers, currentIdx, timeRemaining }));
    }
  }, [answers, currentIdx, timeRemaining, started, submitted, bankId]);

  const handleResumeIncomplete = () => {
    const draft = localStorage.getItem(`exam_draft_${bankId}`);
    if (draft) {
      const parsed = JSON.parse(draft);
      setAnswers(parsed.answers);
      setCurrentIdx(parsed.currentIdx);
      setTimeRemaining(parsed.timeRemaining);
      setStarted(true);
    }
  };

  const currentQuestion = questions[currentIdx];

  const handleSelectAnswer = (optionIdx: number) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIdx,
    }));
  };

  const toggleFlag = () => {
    setFlagged(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const toggleBookmark = async () => {
    try {
      const isBookmarked = await api.toggleBookmark(currentQuestion.id);
      if (isBookmarked) {
        setBookmarks(prev => [...prev, currentQuestion.id]);
      } else {
        setBookmarks(prev => prev.filter(id => id !== currentQuestion.id));
      }
    } catch {
      // Offline fallback handling
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmittingLoader(true);
    try {
      const scorecard = await api.submitExam(bankId, answers);
      setResult(scorecard);
      setSubmitted(true);
      localStorage.removeItem(`exam_draft_${bankId}`);
    } catch (err) {
      console.error("Exam submission failed", err);
    } finally {
      setSubmittingLoader(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasDraft = localStorage.getItem(`exam_draft_${bankId}`) !== null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 max-w-sm mx-auto shadow mt-10">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 mt-3">Empty Question Bank</h3>
        <p className="text-xs text-slate-500 mt-1">There are no questions populated in this syllabus, or they are currently archived.</p>
        <button onClick={onBack} className="mt-5 text-sm font-semibold text-teal-600 hover:underline">Back to Selector</button>
      </div>
    );
  }

  // Pre-Start Setup Screen
  if (!started) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-150 shadow-sm space-y-6 animate-fade-in">
        <div>
          <button onClick={onBack} className="text-xs font-semibold text-slate-400 hover:text-slate-600">&larr; Return to Catalogings</button>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">Configure Practice Hub</h2>
          <p className="text-xs text-slate-500 mt-1">Syllabus consists of {questions.length} pediatric multiple-choice clinical questions.</p>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-slate-800">Review Draft Available</h4>
            <p className="text-xs text-slate-400">You have an in-progress draft saved for this specific test bank.</p>
          </div>
          {hasDraft ? (
            <button 
              onClick={handleResumeIncomplete}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Resume draft
            </button>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-200 px-2 py-1 rounded">No drafts found</span>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Choose Assessment Style:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setIsExamMode(false)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                !isExamMode ? 'border-teal-500 bg-teal-50/20' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div>
                <h4 className="font-bold text-sm text-slate-800">Practice Mode</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Timer is disabled. Explanations and incorrect checks are visible instantly after choosing an option.</p>
              </div>
              <span className={`text-[10px] font-bold uppercase mt-4 self-start ${!isExamMode ? 'text-teal-600' : 'text-slate-400'}`}>Recommended for revision</span>
            </div>

            <div 
              onClick={() => setIsExamMode(true)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                isExamMode ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div>
                <h4 className="font-bold text-sm text-slate-800">Strict Exam Assessment</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">30-minute ticking duration. Real-world MRCPCH constraints. Results are hidden until full submission.</p>
              </div>
              <span className={`text-[10px] font-bold uppercase mt-4 self-start ${isExamMode ? 'text-indigo-600' : 'text-slate-400'}`}>Ticking countdown simulation</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setStarted(true)}
          className="w-full bg-teal-600 hover:bg-teal-550 text-white font-semibold py-3 rounded-xl transition text-sm shadow-xs"
        >
          Initialize Quiz
        </button>
      </div>
    );
  }

  // Final Results view
  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-5">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Assessment Submitted</h2>
            <p className="text-xs text-slate-400 mt-1">Completed successfully. Below is the parsed performance criteria scorecard.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Scale</span>
              <p className="text-xl font-bold font-mono text-slate-700 mt-0.5">{result.totalQuestions}</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Correct Keys</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-0.5">{result.score}</p>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Aggregate %</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-0.5">{result.percentage}%</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {result.percentage >= 70 
              ? 'Excellent prep score! Your continuous evaluation has hit the required pediatric exam benchmark.' 
              : 'Keep reading! Consistent repetition of detailed explanations yields secure clinical logic.'}
          </p>

          <div className="flex justify-center gap-4 pt-2">
            <button 
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
                setStarted(false);
                onBack();
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
            >
              Return to Catalog
            </button>
            <button 
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
                setStarted(true);
                setCurrentIdx(0);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-xs"
            >
              Retake Exam
            </button>
          </div>
        </div>

        {/* Detailed Question Explanations checklist reviews */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Clinical Feedback Items:</h3>
          {questions.map((q, idx) => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            const selectedOptStr = answers[q.id] !== undefined ? q.options[answers[q.id]] : 'No selection';
            const correctOptStr = q.options[q.correctAnswer];

            return (
              <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">Question {idx + 1}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isCorrect ? 'bg-emerald-5 border border-emerald-100 text-emerald-700' : 'bg-red-5 border border-red-100 text-red-700'
                  }`}>
                    {isCorrect ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {isCorrect ? 'Correct' : 'Incorrect choice'}
                  </span>
                </div>

                <p className="font-semibold text-slate-800 leading-snug">{q.question}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="p-3 bg-red-50/50 rounded-lg text-slate-700 border border-red-100/50">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Your Response:</p>
                    {selectedOptStr}
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-lg text-slate-700 border border-emerald-100/50">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Correct Designation:</p>
                    {correctOptStr}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg text-xs leading-relaxed text-slate-600 border border-slate-200/50">
                  <span className="font-bold block text-slate-800 mb-1">Clinical Rationale:</span>
                  {q.explanation}
                </div>
                {renderGeminiSupportOfQuestion(q)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active testing viewport
  const isSelected = (idx: number) => answers[currentQuestion.id] === idx;
  const isFlagged = flagged[currentQuestion.id] === true;
  const isBookmarked = bookmarks.includes(currentQuestion.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Upper Navigation and status dashboard */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (confirm("Exit session? Your answer choices will stand but draft logs are preserved.")) {
                onBack();
              }
            }}
            className="p-1 px-3 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Quit practice
          </button>
          
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500">
            <span>Progress:</span>
            <span>{currentIdx + 1} of {questions.length}</span>
          </div>
        </div>

        {/* Timed indicator bar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleFlag}
            className={`p-2 rounded-lg transition ${isFlagged ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Flag className="w-4 h-4 fill-current" />
          </button>
          <button 
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition ${isBookmarked ? 'bg-amber-50 text-amber-500' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          {isExamMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-red-700 font-mono text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeRemaining)}
            </div>
          ) : (
            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100">Practice Mode</span>
          )}

          <button 
            onClick={handleSubmit}
            disabled={submittingLoader}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center"
          >
            {submittingLoader ? 'Saving...' : 'Finish Exam'}
          </button>
        </div>
      </div>

      {/* Main question item container */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-6 shadow-xs leading-relaxed">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white bg-slate-400 px-2 py-0.5 rounded">Q - {currentIdx + 1}</span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
            currentQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
            currentQuestion.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' :
            'bg-red-50 text-red-700'
          }`}>
            {currentQuestion.difficulty}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-800 leading-snug">{currentQuestion.question}</h3>

        {/* Options grid selectors list */}
        <div className="space-y-3.5">
          {currentQuestion.options.map((opt, oIdx) => {
            const isSel = isSelected(oIdx);
            return (
              <div 
                key={oIdx}
                onClick={() => handleSelectAnswer(oIdx)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                  isSel 
                    ? 'border-teal-500 bg-teal-50/20 text-teal-900 font-medium' 
                    : 'border-slate-150 hover:bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-xs font-bold ${
                  isSel ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 text-slate-400'
                }`}>
                  {String.fromCharCode(65 + oIdx)}
                </div>
                <div className="text-sm">{opt}</div>
              </div>
            );
          })}
        </div>

        {/* Practice Mode immediate rationales triggers */}
        {!isExamMode && answers[currentQuestion.id] !== undefined && (
          <div className="pt-4 border-t border-slate-50 space-y-3">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 font-medium font-sans">Practice feedback unlocked:</span>
              <button 
                onClick={() => setShowExplanation(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {showExplanation[currentQuestion.id] ? 'Hide rationales' : 'View explanations'}
              </button>
            </div>

            {showExplanation[currentQuestion.id] && (
              <div className="p-5 bg-teal-50/20 border border-teal-100/50 rounded-xl space-y-3 animate-fade-in text-xs">
                <div className="flex items-center gap-1.5 text-slate-850 font-bold">
                  {answers[currentQuestion.id] === currentQuestion.correctAnswer ? (
                    <span className="text-emerald-700 flex items-center gap-1 font-semibold"><CheckCircle className="w-4 h-4" /> Correct explanation!</span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1 font-semibold"><XCircle className="w-4 h-4" /> Incorrect selection</span>
                  )}
                </div>
                <p className="leading-relaxed text-slate-600">
                  <span className="font-bold text-slate-800">Explanation: </span>
                  {currentQuestion.explanation}
                </p>
                {renderGeminiSupportOfQuestion(currentQuestion)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary indices traversal footer */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="bg-white p-3 border border-slate-150 text-slate-600 hover:bg-slate-50 hover:text-slate-700 rounded-lg disabled:opacity-40 select-none cursor-pointer text-xs font-semibold flex items-center gap-1 shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {/* Matrix grids visual representation drawer */}
        <div className="flex gap-1 overflow-x-auto p-1.5 scrollbar-none max-w-sm sm:max-w-md">
          {questions.map((q, idx) => {
            const isAns = answers[q.id] !== undefined;
            const isFlg = flagged[q.id] === true;
            const isCur = idx === currentIdx;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`w-7.5 h-7.5 rounded text-xs shrink-0 select-none font-bold text-center duration-150 flex items-center justify-center cursor-pointer ${
                  isCur ? 'ring-2 ring-teal-500 text-teal-800 bg-teal-50/50 font-extrabold' :
                  isFlg ? 'bg-red-100 text-red-700 border border-red-200' :
                  isAns ? 'bg-emerald-500 text-white' :
                  'bg-white border border-slate-150 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIdx === questions.length - 1}
          className="bg-white p-3 border border-slate-150 text-slate-600 hover:bg-slate-50 hover:text-slate-700 rounded-lg disabled:opacity-40 select-none cursor-pointer text-xs font-semibold flex items-center gap-1 shadow-xs"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
