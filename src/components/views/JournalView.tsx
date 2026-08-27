import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Pin,
  Search,
  Plus,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Bold,
  Underline,
  List,
} from 'lucide-react';
import { JournalEntry } from '../../types';
import { MeridianStorage, fmtDateShort, todayStr } from '../../services/storage';

const DRAFT_KEY = 'meridian:journal_draft';

export const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(() => MeridianStorage.getJournal());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Composer state
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [pinned, setPinned] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && !editingId) {
        const parsed = JSON.parse(draft);
        if (parsed.text) {
          setText(parsed.text);
          if (editorRef.current) editorRef.current.innerHTML = parsed.html || parsed.text;
          if (parsed.tag) setTag(parsed.tag);
          if (parsed.pinned) setPinned(parsed.pinned);
        }
      }
    } catch {}
  }, [editingId]);

  // Auto-save draft
  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText;
    setText(plainText);

    if (!editingId) {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ text: plainText, html: currentHtml, tag, pinned, date })
      );
    }
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false, undefined);
    handleEditorInput();
  };

  const handleSave = () => {
    if (!text.trim() && (!editorRef.current || !editorRef.current.innerText.trim())) {
      editorRef.current?.focus();
      return;
    }

    const htmlContent = editorRef.current?.innerHTML || text;
    const plainText = editorRef.current?.innerText || text;

    let timestamp = new Date().toISOString();
    if (date !== todayStr()) {
      const d = new Date(date);
      timestamp = d.toISOString();
    }

    if (editingId) {
      const updated = entries.map(e =>
        e.id === editingId
          ? {
              ...e,
              text: plainText.trim(),
              html: htmlContent,
              tag: tag.trim() || undefined,
              pinned,
              timestamp: date !== todayStr() ? timestamp : e.timestamp,
            }
          : e
      );
      setEntries(updated);
      MeridianStorage.saveJournal(updated);
      setEditingId(null);
    } else {
      const newEntry: JournalEntry = {
        id: 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: plainText.trim(),
        html: htmlContent,
        tag: tag.trim() || undefined,
        pinned,
        timestamp,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      MeridianStorage.saveJournal(updated);
    }

    // Reset composer
    setText('');
    setTag('');
    setPinned(false);
    setDate(todayStr());
    if (editorRef.current) editorRef.current.innerHTML = '';
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setText(entry.text);
    setTag(entry.tag || '');
    setPinned(!!entry.pinned);
    setDate(entry.timestamp.slice(0, 10));
    if (editorRef.current) editorRef.current.innerHTML = entry.html || entry.text;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this journal reflection?')) {
      const updated = entries.filter(e => e.id !== id);
      setEntries(updated);
      MeridianStorage.saveJournal(updated);
      if (editingId === id) {
        setEditingId(null);
        if (editorRef.current) editorRef.current.innerHTML = '';
      }
    }
  };

  const handleTogglePin = (id: string) => {
    const updated = entries.map(e => (e.id === id ? { ...e, pinned: !e.pinned } : e));
    setEntries(updated);
    MeridianStorage.saveJournal(updated);
  };

  const handleExportTxt = () => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const content = sorted
      .map(
        e =>
          `[${new Date(e.timestamp).toLocaleString()}] ${e.tag ? '#' + e.tag : ''} ${e.pinned ? '★' : ''}\n${e.text}\n`
      )
      .join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-journal-${todayStr()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Distinct tags list
  const allTags = Array.from(new Set(entries.map(e => e.tag).filter(Boolean))) as string[];

  // Filtered entries
  const filteredEntries = entries.filter(e => {
    const matchesTag = !selectedTag || e.tag === selectedTag;
    const matchesSearch =
      !searchQuery.trim() ||
      e.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.tag && e.tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesSearch;
  });

  // Sort: Pinned first, then newest
  filteredEntries.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Rich Composer Card */}
      <div
        className="rounded-3xl p-6 border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold font-display text-on-surface">
              {editingId ? 'Edit Reflection' : 'Mindful Journal Composer'}
            </h2>
          </div>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setText('');
                setTag('');
                if (editorRef.current) editorRef.current.innerHTML = '';
              }}
              className="text-xs text-rose-400 font-semibold hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 w-fit border border-outline-variant">
          <button
            type="button"
            onClick={() => handleFormat('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('underline')}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Contenteditable Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorInput}
          data-placeholder="What happened today? Write reflections, mental breakthroughs, or notes..."
          className="min-h-[110px] max-h-[300px] overflow-y-auto p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-outline-variant text-sm md:text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        />

        {/* Options Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-on-surface-variant" />
              <input
                type="text"
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="tag (e.g. clarity, clinical)"
                className="px-3 py-1.5 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Pin</span>
            </label>
          </div>

          <button
            onClick={handleSave}
            type="button"
            className="px-5 py-2 text-xs font-bold rounded-full shadow-md transition-all flex items-center justify-center gap-1.5 transform active:scale-95 shrink-0"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? 'Update Reflection' : 'Save Entry'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-70" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entries or tags..."
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleExportTxt}
          type="button"
          className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 text-on-surface-variant shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export TXT</span>
        </button>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 text-xs rounded-full font-semibold border transition-all ${
              selectedTag === null
                ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                : 'border-outline-variant text-on-surface-variant'
            }`}
          >
            All ({entries.length})
          </button>
          {allTags.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={`px-3 py-1 text-xs rounded-full font-semibold border transition-all ${
                selectedTag === t
                  ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div
            className="p-12 text-center rounded-3xl border space-y-2"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <BookOpen className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-sm text-on-surface-variant">No journal entries match your search criteria.</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`p-5 rounded-3xl border space-y-3 transition-all ${
                entry.pinned
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm'
                  : 'border-outline-variant bg-surface-container'
              }`}
            >
              {/* Entry header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-on-surface-variant">
                    {fmtDateShort(entry.timestamp)}
                  </span>
                  {entry.tag && (
                    <span
                      className="px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold"
                      style={{
                        backgroundColor: 'var(--md-sys-color-primary-container)',
                        color: 'var(--md-sys-color-on-primary-container)',
                      }}
                    >
                      #{entry.tag}
                    </span>
                  )}
                  {entry.pinned && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 font-mono">
                      <Pin className="w-3 h-3 fill-emerald-400" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>

                {/* Entry actions */}
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <button
                    onClick={() => handleTogglePin(entry.id)}
                    title={entry.pinned ? 'Unpin' : 'Pin to top'}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <Pin className={`w-3.5 h-3.5 ${entry.pinned ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleEdit(entry)}
                    title="Edit reflection"
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    title="Delete entry"
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text content */}
              <div
                className="text-sm md:text-base leading-relaxed text-on-surface whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{ __html: entry.html || entry.text }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
