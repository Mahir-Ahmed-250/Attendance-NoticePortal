import React, { useState } from 'react';
import { Notice, NoticeCategory } from '../types';
import { Megaphone, Calendar, User, PlusCircle, Search, Filter, Edit3, Trash2, Globe, X, BookOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface NoticeBoardProps {
  notices: Notice[];
  onAddNotice?: (notice: Omit<Notice, 'pin' | 'date' | 'postedBy'>) => void;
  onDeleteNoticeRequest?: (noticePin: string) => void;
  onUpdateNotice?: (notice: Notice) => void;
  canPost: boolean;
  currentUser: { name: string; role: string };
  campuses?: string[];
}

export default function NoticeBoard({ notices, onAddNotice, onDeleteNoticeRequest, onUpdateNotice, canPost, currentUser, campuses }: NoticeBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('All');
  
  // Modals visibility state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [deletingNoticePin, setDeletingNoticePin] = useState<string | null>(null);

  // Form State
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('General');
  const [campus, setCampus] = useState('');

  const categories: string[] = ['All', 'General', 'Urgent', 'Holiday', 'Attendance', 'System'];

  const filteredNotices = notices
    .filter(notice => {
      const matchesSearch = (notice.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (notice.content?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                            (notice.postedBy?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory;
      const matchesCampus = selectedCampusFilter === 'All' ||
                            (selectedCampusFilter === 'Global' && (!notice.campus || notice.campus === 'All')) ||
                            (notice.campus === selectedCampusFilter);
      return matchesSearch && matchesCategory && matchesCampus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryColor = (cat: NoticeCategory) => {
    switch (cat) {
      case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Attendance': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Holiday': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'System': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const handleStartCompose = () => {
    setTitle('');
    setContent('');
    setCategory('General');
    setCampus('');
    setEditingNotice(null);
    setShowEditorModal(true);
  };

  const handleStartEdit = (notice: Notice, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setTitle(notice.title);
    setContent(notice.content);
    setCategory(notice.category);
    setCampus(notice.campus || '');
    setEditingNotice(notice);
    setShowEditorModal(true);
  };

  const handleCancelForm = () => {
    setTitle('');
    setContent('');
    setCategory('General');
    setCampus('');
    setEditingNotice(null);
    setShowEditorModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    if (editingNotice && onUpdateNotice) {
      onUpdateNotice({
        ...editingNotice,
        title,
        content,
        category,
        campus: campus.trim() || undefined
      });
      handleCancelForm();
    } else if (onAddNotice) {
      onAddNotice({
        title,
        content,
        category,
        campus: campus.trim() || undefined
      });
      handleCancelForm();
    }
  };

  const openDeleteConfirmation = (pin: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setDeletingNoticePin(pin);
  };

  return (
    <div id="notice-board-container" className="space-y-6">
      <ConfirmModal
        isOpen={!!deletingNoticePin}
        onClose={() => setDeletingNoticePin(null)}
        onConfirm={() => {
          if (deletingNoticePin && onDeleteNoticeRequest) {
            onDeleteNoticeRequest(deletingNoticePin);
          }
          setDeletingNoticePin(null);
        }}
        title="নোটিশ ডিলিট করুন (Delete Notice)"
        message="আপনি কি নিশ্চিতভাবে এই নোটিশটি ডিলিট করতে চান? ডিলিট করার পর এটি আর ফিরে পাওয়া যাবে না।"
      />

      {/* Header section with Compose option */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
            <Megaphone className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
            Active Notices & Bulletin
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Official updates and program communications</p>
        </div>
        {canPost && (onAddNotice || onUpdateNotice) && (
          <button
            id="open-compose-modal-btn"
            onClick={handleStartCompose}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.02] whitespace-nowrap"
          >
            <PlusCircle className="w-4.5 h-4.5 shrink-0" />
            Compose Notice
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search notices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-bold"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat} Category</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <select
            value={selectedCampusFilter}
            onChange={(e) => setSelectedCampusFilter(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-bold"
          >
            <option value="All">সব ক্যাম্পাস ভিউ (All Campuses)</option>
            <option value="Global">🌐 শুধুমাত্র গ্লোবাল নোটিশ</option>
            {campuses?.map(c => (
              <option key={c} value={c}>📍 {c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices List: Modern Grid System */}
      <div>
        {filteredNotices.length === 0 ? (
          <div className="bg-slate-50 border border-slate-150 rounded-3xl p-12 text-center text-slate-400">
            <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-600">No notices found</p>
            <p className="text-xs text-slate-400 mt-1">Try relaxing your search terms or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">বিষয় ও বিবরণ (Title & Bulletin)</th>
                  <th className="p-4">ক্যাটাগরি (Category)</th>
                  <th className="p-4">লক্ষ্যমাত্রা (Campus)</th>
                  <th className="p-4">তারিখ (Date)</th>
                  <th className="p-4">লেখক (Author)</th>
                  <th className="p-4 text-right">অ্যাকশন (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredNotices.map((notice, index) => (
                  <tr 
                    key={notice.pin} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setViewingNotice(notice)}
                  >
                    <td className="p-4 text-xs font-mono text-slate-400 text-center">{index + 1}</td>
                    <td className="p-4">
                      <div className="space-y-1 max-w-sm lg:max-w-md">
                        <h4 className="text-xs font-black text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {notice.title}
                        </h4>
                        <p className="text-slate-400 text-[11px] line-clamp-2 leading-normal">
                          {notice.content}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getCategoryColor(notice.category)}`}>
                        {notice.category}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {notice.campus ? (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[9px] font-bold">
                          📍 {notice.campus}
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-150 px-2 py-0.5 rounded-md text-[9px] font-bold">
                          🌐 Global
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500">{notice.date}</td>
                    <td className="p-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{notice.postedBy.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingNotice(notice)}
                          className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-lg transition-colors cursor-pointer border border-slate-100"
                          title="View"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        {canPost && (
                          <>
                            {onUpdateNotice && (
                              <button
                                type="button"
                                onClick={(e) => handleStartEdit(notice, e)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Bulletin"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteNoticeRequest && (
                              <button
                                type="button"
                                onClick={(e) => openDeleteConfirmation(notice.pin, e)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="Delete Notice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- COMPOSE & EDIT MODAL --- */}
      <AnimatePresence>
        {showEditorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-2xl rounded-3xl border border-indigo-100 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-indigo-600/5 px-6 py-5 border-b border-indigo-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                  {editingNotice ? <Edit3 className="w-5 h-5 text-indigo-600" /> : <PlusCircle className="w-5 h-5 text-indigo-600" />}
                  {editingNotice ? `নোটিশ এডিট করুন (Edit Notice)` : `নতুন নোটিশ পোস্ট করুন (Post Notice)`}
                </h3>
                <button
                  onClick={handleCancelForm}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notice Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Monthly Review Schedule Change"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-700"
                    >
                      <option value="General">General Notice</option>
                      <option value="Urgent">Urgent Alert</option>
                      <option value="Attendance">Attendance Directive</option>
                      <option value="Holiday">Holiday/Closure</option>
                      <option value="System">System/Tech Update</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Campus (কোন ক্যাম্পাসের জন্য?)</label>
                  {campuses && campuses.length > 0 ? (
                    <select
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-700"
                    >
                      <option value="">🌐 সব ক্যাম্পাস (All Campuses - Global Notice)</option>
                      {campuses.map(c => (
                        <option key={c} value={c}>📍 শুধুমাত্র {c}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                      placeholder="Leave empty for all campuses, or specify campus name"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-850"
                    />
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">সব ক্যাম্পাস সিলেক্ট রাখলে এটি সব ক্যাম্পাসের মেম্বার ও ক্যাম্পাস কোঅর্ডিনেটরদের নোটিশ বোর্ডে দেখাবে।</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Content Detail</label>
                  <textarea
                    required
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write clear notice guidelines, instructions or info here..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                  />
                </div>

                {/* Modal Footer actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer animate-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    {editingNotice ? 'আপডেট করুন (Update Notice)' : 'পাবলিশ করুন (Publish Notice)'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NOTICE DETAILED VIEW MODAL --- */}
      <AnimatePresence>
        {viewingNotice && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setViewingNotice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()} // Prevent clicking outer backdrop from closing
              className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* View Header */}
              <div className="bg-slate-50 border-b border-slate-150 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Official Bulletin Detail</span>
                </div>
                <button
                  onClick={() => setViewingNotice(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* View Body */}
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                  {/* Badges and Time info */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${getCategoryColor(viewingNotice.category)}`}>
                        {viewingNotice.category}
                      </span>
                      {viewingNotice.campus ? (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider">
                          📍 {viewingNotice.campus}
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider">
                          🌐 সব ক্যাম্পাস (All Campuses)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold font-mono">
                      <Calendar className="w-4 h-4" />
                      <span>{viewingNotice.date}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-snug">
                    {viewingNotice.title}
                  </h2>

                  {/* Notice Content */}
                  <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {viewingNotice.content}
                  </div>
                </div>

                {/* Author Info block */}
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">Published By {viewingNotice.postedBy.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{viewingNotice.postedBy.role}</p>
                    </div>
                  </div>

                  {canPost && onUpdateNotice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        const n = viewingNotice;
                        setViewingNotice(null);
                        handleStartEdit(n, e);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-2xs hover:scale-[1.02] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Notice</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
