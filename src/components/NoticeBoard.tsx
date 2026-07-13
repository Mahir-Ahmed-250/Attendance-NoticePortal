import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Notice, NoticeCategory } from '../types';
import { 
  Megaphone, 
  Calendar, 
  User, 
  PlusCircle, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Upload,
  Globe, 
  X, 
  BookOpen, 
  FileText, 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  List as ListIcon, 
  ListOrdered, 
  Heading, 
  Palette, 
  Eye, 
  Code, 
  HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface NoticeBoardProps {
  notices: Notice[];
  onAddNotice?: (notice: Omit<Notice, 'pin' | 'date' | 'postedBy'>) => void;
  onDeleteNoticeRequest?: (noticePin: string) => void;
  onUpdateNotice?: (notice: Notice) => void;
  canPost: boolean;
  currentUser: { name: string; role: string; pin: string };
  campuses?: string[];
}

export default function NoticeBoard({ notices, onAddNotice, onDeleteNoticeRequest, onUpdateNotice, canPost, currentUser, campuses }: NoticeBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('All');
  
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [deletingNoticePin, setDeletingNoticePin] = useState<string | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('General');
  const [campus, setCampus] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  const quillRef = useRef<any>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list',
    'link', 'image'
  ];

  const colors = [
    { name: 'Red', class: 'text-rose-650 font-bold', code: '#e11d48' },
    { name: 'Green', class: 'text-emerald-650 font-bold', code: '#059669' },
    { name: 'Blue', class: 'text-indigo-655 font-bold', code: '#2563eb' },
    { name: 'Amber', class: 'text-amber-650 font-bold', code: '#d97706' },
    { name: 'Slate', class: 'text-slate-850 font-bold', code: '#1e293b' },
  ];

  const insertLink = () => {
    if (quillRef.current && linkUrl) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      
      if (range.length > 0) {
        // If text is selected, just apply the link to it
        quill.format('link', linkUrl);
      } else {
        // If no text is selected, insert the display text (or URL if no text provided) as a link
        const textToInsert = linkText || linkUrl;
        quill.insertText(range.index, textToInsert, 'link', linkUrl);
      }
      
      setLinkUrl('');
      setLinkText('');
      setShowLinkModal(false);
    }
  };

  const insertImage = (e?: React.ChangeEvent<HTMLInputElement>) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);

    if (e?.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (base64) {
          quill.insertEmbed(range.index, 'image', base64);
          if (imageCaption) {
            quill.insertText(range.index + 1, `\n${imageCaption}`, { 'align': 'center', 'italic': true });
          }
          setImageUrl('');
          setImageCaption('');
          setShowImageModal(false);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (imageUrl) {
      quill.insertEmbed(range.index, 'image', imageUrl);
      if (imageCaption) {
        quill.insertText(range.index + 1, `\n${imageCaption}`, { 'align': 'center', 'italic': true });
      }
      setImageUrl('');
      setImageCaption('');
      setShowImageModal(false);
    }
  };

  const addQuillContent = (type: string, value?: any) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      if (!quill) return;
      const range = quill.getSelection(true);
      if (!range) return;
      
      if (type === 'header') {
        quill.formatLine(range.index, range.length, 'header', value || 3);
      } else if (type === 'list') {
        quill.formatLine(range.index, range.length, 'list', value || 'bullet');
      } else if (type === 'image') {
        setShowImageModal(true);
      } else if (type === 'link') {
        setShowLinkModal(true);
      }
    }
  };

  const categories: string[] = ['All', 'General', 'Urgent', 'Holiday', 'Attendance', 'System'];

  const renderContent = (jsonContent: any) => {
    if (!jsonContent) return '';
    if (typeof jsonContent !== 'string') return '';
    
    try {
      if (!jsonContent.startsWith('{')) return jsonContent;
      const data = JSON.parse(jsonContent);
      if (!data || !data.blocks) return jsonContent;
      
      return data.blocks.map((block: any) => {
        if (!block || !block.data) return '';
        
        switch (block.type) {
          case 'header':
            return `<h${block.data.level || 3} class="text-slate-800 font-extrabold my-2">${block.data.text || ''}</h${block.data.level || 3}>`;
          case 'paragraph':
            return `<p class="my-2">${block.data.text || ''}</p>`;
          case 'list':
            const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
            const listClass = block.data.style === 'ordered' ? 'list-decimal' : 'list-disc';
            const items = (block.data.items || []).map((item: string) => `<li>${item}</li>`).join('');
            return `<${tag} class="${listClass} pl-5 my-2">${items}</${tag}>`;
          case 'image':
            const url = block.data.file?.url || block.data.url || '';
            const caption = block.data.caption || '';
            return `<div class="my-4"><img src="${url}" alt="${caption}" class="max-w-full h-auto rounded-xl shadow-sm mx-auto" /><p class="text-center text-xs text-slate-400 mt-1 italic">${caption}</p></div>`;
          default:
            return '';
        }
      }).join('');
    } catch (e) {
      return jsonContent;
    }
  };

  const filteredNotices = notices
    .filter(notice => {
      const matchesSearch = (notice.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (notice.content?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                            (notice.postedBy?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory;
      const matchesCampus = selectedCampusFilter === 'All' ||
                            (!notice.campus || notice.campus === 'All' || notice.campus === selectedCampusFilter);
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
    setContent(renderContent(notice.content));
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
        title="Delete Notice"
        message="Are you sure you want to delete this notice? Once deleted, it cannot be recovered."
      />

      {/* Header section with Compose option */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
            <Megaphone className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
            Notices
          </h2>
        
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
            <option value="All">All Campuses</option>
            {campuses?.map((c, index) => (
              <option key={`${c}-${index}`} value={c}> {c}</option>
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
                  <th className="p-4">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Campus</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Author</th>
                  <th className="p-4 text-right">Actions</th>
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
                          {notice.campus}
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-150 px-2 py-0.5 rounded-md text-[9px] font-bold">
                           All Campuses
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500">{notice.date}</td>
                    <td className="p-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{notice.postedBy?.name || 'Unknown'}</span>
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
                            {onUpdateNotice && (currentUser.role === 'manager' || notice.postedBy?.pin === currentUser.pin) && (
                              <button
                                type="button"
                                onClick={(e) => handleStartEdit(notice, e)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Bulletin"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteNoticeRequest && (currentUser.role === 'manager' || notice.postedBy?.pin === currentUser.pin) && (
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
              className="bg-white w-full max-w-5xl rounded-3xl border border-indigo-100 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-indigo-600/5 px-6 py-5 border-b border-indigo-100 flex items-center justify-between">
                <h3 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                  {editingNotice ? <Edit3 className="w-5 h-5 text-indigo-600" /> : <PlusCircle className="w-5 h-5 text-indigo-600" />}
                  {editingNotice ? `Edit Notice` : `Post New Notice`}
                </h3>
                <button
                  onClick={handleCancelForm}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notice Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder=""
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
                      {categories.filter(cat => cat !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campus (Whose notice is this?)</label>
                  {campuses && campuses.length > 0 ? (
                    <select
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-700"
                    >
                      <option value="">All Campuses</option>
                      {campuses.map((c, index) => (
                        <option key={`${c}-${index}`} value={c}> {c}</option>
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
                  <p className="text-[11px] text-slate-400 mt-1">Selecting 'All Campuses' will make this notice visible to members and coordinators of all campuses on their Notice Board.</p>
                </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Notice Detail
                      </label>
                    </div>
                    
                    <div className="h-[500px]">
                        {/* Editor Section */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col h-full">
                          {/* Custom Top Toolbar */}
                          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center gap-1.5 shrink-0">
                             <button 
                               type="button" 
                               onClick={() => addQuillContent('header', 3)}
                               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" 
                               title="Add Heading"
                             >
                               <Heading className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase hidden sm:inline">Heading</span>
                             </button>
                             
                             <button 
                               type="button" 
                               onClick={() => addQuillContent('list', 'bullet')}
                               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" 
                               title="Add Bullet List"
                             >
                               <ListIcon className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase hidden sm:inline">Bullets</span>
                             </button>

                             <button 
                               type="button" 
                               onClick={() => addQuillContent('list', 'ordered')}
                               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" 
                               title="Add Numbered List"
                             >
                               <ListOrdered className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase hidden sm:inline">Numbers</span>
                             </button>

                             <button 
                               type="button" 
                               onClick={() => addQuillContent('image')}
                               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" 
                               title="Add Image"
                             >
                               <ImageIcon className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase hidden sm:inline">Image</span>
                             </button>

                             <button 
                               type="button" 
                               onClick={() => addQuillContent('link')}
                               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" 
                               title="Add Link"
                             >
                               <LinkIcon className="w-4 h-4" />
                               <span className="text-[10px] font-bold uppercase hidden sm:inline">Link</span>
                             </button>

                             <div className="ml-auto flex items-center gap-2">
                               <button 
                                 type="button" 
                                 onClick={() => setShowPreviewModal(true)}
                                 className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 border border-indigo-100" 
                                 title="Preview Content"
                               >
                                 <Eye className="w-4 h-4" />
                                 <span className="text-[10px] font-extrabold uppercase">Preview</span>
                               </button>
                             </div>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <ReactQuill
                              ref={quillRef}
                              theme="snow"
                              value={content}
                              onChange={setContent}
                              modules={modules}
                              formats={formats}
                              className="h-full custom-quill-editor"
                              placeholder="Write the notice content here... "
                            />
                          </div>
                        </div>
                    </div>
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
                    {editingNotice ? 'Update Notice' : 'Publish Notice'}
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
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Notice</span>
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
                         {viewingNotice.campus}
                        </span>
                      ) : (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider">
                           All Campuses
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
                  <div 
                    className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed font-medium break-words space-y-2 prose"
                    dangerouslySetInnerHTML={{ __html: renderContent(viewingNotice.content) }}
                  />
                </div>

                {/* Author Info block */}
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">Published By {viewingNotice.postedBy?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{viewingNotice.postedBy?.role || 'Unknown'}</p>
                    </div>
                  </div>

                  {canPost && onUpdateNotice && (currentUser.role === 'manager' || viewingNotice.postedBy?.pin === currentUser.pin) && (
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

      {/* Content Preview Modal Overlay */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Preview Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Content Preview</span>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Preview Content */}
              <div className="p-8 overflow-y-auto">
                <div className="space-y-6">
                  {title && (
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                      {title}
                    </h2>
                  )}
                  
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-0.5 rounded-full text-[10px] font-bold">
                       {campus || 'All Campuses'}
                    </span>
                  </div>

                  <div 
                    className="text-slate-700 text-sm leading-relaxed font-medium space-y-4 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(content) }}
                  />
                </div>
              </div>

              {/* Preview Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 shadow-sm transition-all"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Insertion Modal */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5"
            >
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                Insert Link
              </h4>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Link Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Click here"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                >
                  Insert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Insertion Modal */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5"
            >
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Insert Image
              </h4>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Upload from Device</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-2">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2" />
                      <p className="text-[10px] font-bold text-slate-500">Click to upload image</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={insertImage} />
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black">
                    <span className="bg-white px-2 text-slate-400">Or use URL</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Caption (Optional)</label>
                  <input
                    type="text"
                    placeholder="Describe the image"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => insertImage()}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                >
                  Insert Image
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-quill-editor .ql-toolbar {
          display: none !important;
        }
        .custom-quill-editor .ql-container {
          border: none !important;
          font-family: inherit;
          font-size: 0.875rem;
        }
        .custom-quill-editor .ql-editor {
          min-height: 200px;
          padding: 1.5rem;
        }
        .custom-quill-editor .ql-editor.ql-blank::before {
          font-style: normal;
          color: #94a3b8;
          left: 1.5rem;
        }
        .prose h1, .prose h2, .prose h3, .prose h4 {
          color: #1e293b;
          font-weight: 800;
        }
        .prose ul, .prose ol {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .prose li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
