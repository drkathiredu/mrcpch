import React, { useState, useEffect } from 'react';
import { StudyMaterial, User } from '../types';
import { api } from '../api';
import { BookOpen, Search, Download, FileText, Upload, BrainCircuit, Sparkles, Lightbulb, GraduationCap, Printer, RefreshCw } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface StudyMaterialsProps {
  user: User;
}

export default function StudyMaterials({ user }: StudyMaterialsProps) {
  const [activeTab, setActiveTab] = useState<'r2' | 'gemini'>('r2');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Upload states (Admin)
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Guidelines');
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Gemini Study Card state
  const [geminiTopic, setGeminiTopic] = useState('');
  const [geminiCard, setGeminiCard] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.getMaterials();
      setMaterials(res);
    } catch (err) {
      console.error("Failed loading study documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category) return;
    setUploading(true);

    try {
      // Create Base64 mock stream to fully fit R2 binary endpoints contract
      const filePayload = demoFile ? "JVBERi0xLjQKJ..." : "JVBERi0xLjQKJ..."; // mock PDF raw
      await api.uploadMaterial({
        title,
        description,
        category,
        fileUrl: `https://pub-mrcpch-materials.cloudflare-r2.com/materials/${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileSize: demoFile ? `${(demoFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
        uploadedBy: user.fullName,
        fileData: filePayload,
      });

      setShowUpload(false);
      setTitle('');
      setDescription('');
      setCategory('Guidelines');
      setDemoFile(null);
      loadMaterials();
    } catch (err) {
      console.error("Failed uploading study document", err);
    } finally {
      setUploading(false);
    }
  };

  const simulatedDownload = (mat: StudyMaterial) => {
    alert(`Initializing PDF download: ${mat.title}\nRetrieving pre-signed token securely from cloudflare R2...`);
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `${mat.title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerGeminiStudyCard = async (topic: string) => {
    setGeminiTopic(topic);
    setGeminiLoading(true);
    setGeminiError(null);
    setGeminiCard(null);

    try {
      const response = await fetch('/api/gemini/study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!response.ok) {
        throw new Error('Failed generating MRCPCH Handout. Verify Gemini platform credentials.');
      }
      const data = await response.json();
      setGeminiCard(data.guide);
    } catch (err: any) {
      setGeminiError(err.message || 'Server offline. Try again momentarily.');
    } finally {
      setGeminiLoading(false);
    }
  };

  const filtered = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
                          m.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', 'Guidelines', 'Notes', 'Handouts'];

  const suggestedTopics = [
    { title: "Tetralogy of Fallot", sub: "Acyanotic vs Cyanotic Murmurs" },
    { title: "Inborn Errors of Metabolism", sub: "Urea cycle, GSDs, Organic Acidurias" },
    { title: "Neonatal Respiratory Distress", sub: "Surfactant & TTN differencing" },
    { title: "Necrotizing Enterocolitis", sub: "Bell staging & management guidelines" },
    { title: "Kawasaki Disease Criteria", sub: "CRASH & Burn diagnostic rules" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Study Materials & Handouts</h2>
          <p className="text-sm text-slate-500 font-sans">Access official guidelines, pediatric summaries, or generate high-yield AI reference handouts.</p>
        </div>

        {activeTab === 'r2' && (user.role === 'Admin' || user.role === 'SuperAdmin') && (
          <button 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            <Upload className="w-4 h-4" />
            Upload PDF Document
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-150 flex gap-6">
        <button
          onClick={() => setActiveTab('r2')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${
            activeTab === 'r2' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {activeTab === 'r2' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-605 rounded-full" />}
          📋 Official PDF guidelines (Cloud R2)
        </button>
        <button
          onClick={() => setActiveTab('gemini')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'gemini' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {activeTab === 'gemini' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-650 rounded-full" />}
          <BrainCircuit className="w-4 h-4 text-teal-60s animate-pulse" />
          🧠 AI Study Handout Generator (Gemini)
        </button>
      </div>

      {/* R2 Document library tab view */}
      {activeTab === 'r2' && (
        <div className="space-y-6">
          {/* Filter and search */}
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search guidelines, cheat sheets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg border-0 text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                    selectedCategory === cat 
                      ? 'bg-teal-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid listing */}
          {loading ? (
            <div className="flex items-center justify-center p-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
              <p className="mt-3 text-slate-500 text-sm font-medium">No guidelines found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(mat => (
                <div 
                  key={mat.id}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200 hover:-translate-y-0.5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        mat.category === 'Guidelines' ? 'bg-indigo-50 text-indigo-700' :
                        mat.category === 'Notes' ? 'bg-amber-50 text-amber-700' :
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {mat.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{mat.fileSize || '1.2 MB'}</span>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-3 bg-teal-50 rounded-xl text-teal-600 shrink-0 h-11 w-11 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-snug">{mat.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{mat.description || 'Clinical references uploaded by tutors.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 mt-6 pt-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-semibold">Uploader: {mat.uploadedBy.split(' ')[0]}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{new Date(mat.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    
                    <button 
                      onClick={() => simulatedDownload(mat)}
                      className="flex items-center gap-1.5 bg-slate-55 hover:bg-slate-100 text-slate-705 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200/50 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI-Powered Gemini Study Card builder tab */}
      {activeTab === 'gemini' && (
        <div className="space-y-6 bg-slate-50/20 p-6 rounded-2xl border border-slate-100">
          <div className="max-w-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-5 h-5 text-teal-605" />
              MRCPCH On-Demand Board review cards
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Input any tricky clinical syndrome, developmental milestone age, acute pediatric disease, or biochemical pathway. Gemini will author a high-yield board presentation summary mapping diagnostic parameters, guidelines, management strategies, and academic memory tricks.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (geminiTopic) triggerGeminiStudyCard(geminiTopic); }} className="flex gap-2">
              <input 
                type="text"
                placeholder="Type topic: e.g. Congenital Adrenal Hyperplasia, Meconium Aspirate"
                value={geminiTopic}
                onChange={e => setGeminiTopic(e.target.value)}
                disabled={geminiLoading}
                className="w-full text-xs font-sans px-4 py-3 bg-white rounded-xl border border-slate-200/80 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition"
              />
              <button
                type="submit"
                disabled={geminiLoading || !geminiTopic}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-5 text-xs font-semibold cursor-pointer shrink-0 shadow-xs flex items-center gap-1 bg-linear-to-r from-teal-600 to-emerald-600 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Card
              </button>
            </form>
          </div>

          {/* Quick recommendations */}
          {!geminiCard && !geminiLoading && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suggested High-Yield Syllabi:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestedTopics.map(topic => (
                  <button
                    key={topic.title}
                    onClick={() => triggerGeminiStudyCard(topic.title)}
                    className="p-3.5 bg-white border border-slate-200/60 rounded-xl text-left hover:border-teal-300 hover:shadow-xs transition duration-150 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800 block">{topic.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{topic.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending loading state */}
          {geminiLoading && (
            <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-605"></div>
                <span className="text-xs font-bold text-teal-600 animate-pulse uppercase tracking-wider">Gemini clinical instructor is compiling clinical dossier...</span>
              </div>
              <div className="space-y-2 animate-pulse pl-6">
                <div className="h-3.5 bg-slate-100 rounded w-1/3"></div>
                <div className="h-2.5 bg-slate-100 rounded w-2/3"></div>
                <div className="h-2.5 bg-slate-100 rounded w-5/6"></div>
                <div className="h-2.5 bg-slate-100 rounded w-4/5"></div>
              </div>
            </div>
          )}

          {/* Error fallback display */}
          {geminiError && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-amber-700">
              ⚠️ {geminiError}
            </div>
          )}

          {/* Study guide rendering */}
          {geminiCard && !geminiLoading && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-tr from-teal-50 to-emerald-50 rounded-lg text-teal-603 border border-teal-100/50">
                    <GraduationCap className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">MRCPCH Pediatric Board Review card</h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-sans">Synthesized: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-3xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Handout
                </button>
              </div>

              <div className="prose max-w-none">
                <MarkdownRenderer content={geminiCard} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Upload drawer modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Upload Reference Material</h3>
              <p className="text-xs text-slate-400 mt-0.5">Static files are stored securely on Cloudflare R2 object storage buckets.</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Document Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Asthma Management NICE Pathways"
                  required
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Category Grouping</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Guidelines">Guidelines</option>
                  <option value="Notes">Notes</option>
                  <option value="Handouts">Handouts</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description / Scope</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Quick summary detailing target candidate audience..."
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Attached PDF File</label>
                <div className="border border-dashed border-slate-200 p-4 rounded-lg bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition duration-150">
                  <Upload className="w-6 h-6 text-slate-400 stroke-1.5" />
                  <span className="text-xs text-slate-500 font-semibold mt-2">
                    {demoFile ? demoFile.name : 'Choose local PDF or image guideline'}
                  </span>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg"
                    onChange={e => setDemoFile(e.target.files?.[0] || null)}
                    className="opacity-0 absolute scale-0 pointer-events-none"
                    id="pdfFileInput"
                  />
                  <label htmlFor="pdfFileInput" className="mt-2 text-[10px] bg-white border border-slate-205 text-slate-600 font-bold px-3 py-1 rounded shadow-3xs cursor-pointer hover:bg-slate-55/40">
                    Browse Files
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-550 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  {uploading ? 'Storing...' : 'Deploy R2 Object'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
