import React, { useState, useEffect } from 'react';
import { QuestionBank, User } from '../types';
import { api } from '../api';
import { Search, Plus, Trash2, Edit3, Check, Filter, ArrowRight, Save, FolderGit } from 'lucide-react';

interface QuestionBanksProps {
  user: User;
  onSelectBank: (bankId: string) => void;
}

export default function QuestionBanks({ user, onSelectBank }: QuestionBanksProps) {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states (Admin)
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCat, setFormCat] = useState('Cardiology');
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const res = await api.getBanks();
      setBanks(res);
    } catch (err) {
      console.error("Failed to load question banks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCat) return;

    try {
      const payload: QuestionBank = {
        id: editingBank?.id || '',
        name: formName,
        description: formDesc,
        category: formCat,
        createdBy: user.id,
        createdAt: editingBank?.createdAt || new Date().toISOString(),
      };
      await api.saveBank(payload);
      setShowCreateModal(false);
      setEditingBank(null);
      setFormName('');
      setFormDesc('');
      loadBanks();
    } catch (err) {
      console.error("Failed saving bank", err);
    }
  };

  const handleEditInit = (bank: QuestionBank, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBank(bank);
    setFormName(bank.name);
    setFormDesc(bank.description);
    setFormCat(bank.category);
    setShowCreateModal(true);
  };

  const handleDelete = async (bankId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this question bank? This will delete all nested questions and attempt logs.")) return;

    try {
      await api.deleteBank(bankId);
      loadBanks();
    } catch (error) {
      console.error("Failed to delete bank", error);
    }
  };

  const handleDuplicate = async (bank: QuestionBank, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const duplicatedPay: QuestionBank = {
        id: '',
        name: `${bank.name} (Copy)`,
        description: bank.description,
        category: bank.category,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };
      await api.saveBank(duplicatedPay);
      loadBanks();
    } catch (err) {
      console.error("Failed to duplicate bank", err);
    }
  };

  // Filter & Search Logic
  const filteredBanks = banks.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(search.toLowerCase()) || 
                          bank.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || bank.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = ['All', 'Cardiology', 'Neonatal', 'Respiratory', 'General'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">MRCPCH Question Banks</h2>
          <p className="text-sm text-slate-500">Pick a clinical syllabus, assess yourself, and review detailed explanations.</p>
        </div>

        {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
          <button 
            onClick={() => {
              setEditingBank(null);
              setFormName('');
              setFormDesc('');
              setFormCat('Cardiology');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            New Question Bank
          </button>
        )}
      </div>

      {/* Filter and search bar controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search matching test banks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-sm border-0 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Question banks list */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200">
          <FolderGit className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <p className="mt-3 text-slate-500 text-sm font-medium">No matching question banks found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanks.map(bank => (
            <div 
              key={bank.id}
              onClick={() => onSelectBank(bank.id)}
              className="group bg-white p-6 rounded-2xl border border-slate-100 hover:border-teal-100 hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    bank.category === 'Cardiology' ? 'bg-teal-50 text-teal-700' :
                    bank.category === 'Neonatal' ? 'bg-purple-50 text-purple-700' :
                    bank.category === 'Respiratory' ? 'bg-indigo-50 text-indigo-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {bank.category}
                  </span>
                  
                  {/* Admin inline operations */}
                  {(user.role === 'Admin' || user.role === 'SuperAdmin') && (
                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button 
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(bank, e)}
                        className="p-1 text-slate-400 hover:text-teal-600 transition"
                      >
                        <FolderGit className="w-4 h-4" />
                      </button>
                      <button 
                        title="Edit Bank info"
                        onClick={(e) => handleEditInit(bank, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        title="Delete Bank"
                        onClick={(e) => handleDelete(bank.id, e)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-teal-600 transition">{bank.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 lines-clamp-3 leading-relaxed">{bank.description || 'Clinical question catalog grouping essential syllabus queries.'}</p>
                </div>
              </div>

              <div className="border-t border-slate-50 mt-6 pt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 font-mono">
                  {bank.questionCount || 0} Questions
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:translate-x-1 duration-200">
                  Launch Revision
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation/Editing Modal drawer */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {editingBank ? 'Modify Question Bank' : 'Add Question Bank'}
            </h3>

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Syllabus Name</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Inborn Errors of Metabolism"
                  required
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Category Headings</label>
                <select
                  value={formCat}
                  onChange={e => setFormCat(e.target.value)}
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neonatal">Neonatal</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Brief Description</label>
                <textarea 
                  rows={3}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Summarize what contents are taught in this bank."
                  className="w-full bg-slate-50 border-0 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-lg text-xs font-semibold"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
