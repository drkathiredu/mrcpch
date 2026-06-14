import React, { useState, useEffect } from 'react';
import { StudyMaterial, User } from '../types';
import { api } from '../api';
import { BookOpen, Search, Download, FileText, Upload, Trash2, Tag, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

interface StudyMaterialsProps {
  user: User;
}

export default function StudyMaterials({ user }: StudyMaterialsProps) {
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
    // Audit download triggers
    alert(`Initializing PDF download: ${mat.title}\nRetrieving pre-signed token from cloudflare R2...`);
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `${mat.title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
                          m.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', 'Guidelines', 'Notes', 'Handouts'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Study Materials & Guidelines</h2>
          <p className="text-sm text-slate-500 font-sans">Access peer-reviewed clinical summaries, cheat sheets, and official guidance files.</p>
        </div>

        {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
          <button 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            <Upload className="w-4 h-4" />
            Upload PDF Document
          </button>
        )}
      </div>

      {/* Filter and control headers */}
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
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
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
                    <p className="text-xs text-slate-400 mt-1 lines-clamp-2 leading-relaxed">{mat.description || 'Clinical references uploaded by tutors.'}</p>
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
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200/50 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
            </div>
          ))}
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
                  <label htmlFor="pdfFileInput" className="mt-2 text-[10px] bg-white border border-slate-200 text-slate-600 font-bold px-3 py-1 rounded shadow-3xs cursor-pointer hover:bg-slate-55/40">
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
