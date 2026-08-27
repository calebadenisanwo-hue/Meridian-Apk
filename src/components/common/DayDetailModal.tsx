import React, { useState } from 'react';
import { X, Plus, Tag, ArrowRight } from 'lucide-react';
import { ModuleRoute } from '../../types';
import { MeridianStorage, fmtDateShort, fmtNaira } from '../../services/storage';

interface DayDetailModalProps {
  date: string | null;
  onClose: () => void;
  onNavigate: (route: ModuleRoute) => void;
  onRefresh: () => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, onClose, onNavigate, onRefresh }) => {
  const [newTag, setNewTag] = useState('');

  if (!date) return null;

  const dayTags = MeridianStorage.getDayTags()[date] || [];

  // Gather logs for this specific date
  const journal = MeridianStorage.getJournal().filter(
    j => j.timestamp.slice(0, 10) === date
  );
  const study = MeridianStorage.getStudy().logs.filter(l => l.date === date);
  const recovery = MeridianStorage.getRecovery().logs.filter(l => l.date === date);
  const finance = MeridianStorage.getFinance().transactions.filter(t => t.date === date);
  const pulse = MeridianStorage.getPulse().logs.filter(l => l.date === date);
  const goals = MeridianStorage.getGoals().checkins.filter(c => c.date === date);

  const hasAnyActivity =
    journal.length > 0 ||
    study.length > 0 ||
    recovery.length > 0 ||
    finance.length > 0 ||
    pulse.length > 0 ||
    goals.length > 0;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    MeridianStorage.addDayTag(date, newTag.trim());
    setNewTag('');
    onRefresh();
  };

  const handleRemoveTag = (tag: string) => {
    MeridianStorage.removeDayTag(date, tag);
    onRefresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-display">{fmtDateShort(date)}</h2>
              <span className="text-xs font-mono text-on-surface-variant">({date})</span>
            </div>
            <p className="text-xs text-on-surface-variant">Daily chronological activity digest</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Day Tags Section */}
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
              <Tag className="w-3.5 h-3.5" />
              <span>Day Tags for Context</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dayTags.length > 0 ? (
                dayTags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }}
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="opacity-60 hover:opacity-100 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-on-surface-variant/70 italic">No day tags assigned.</span>
              )}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag (e.g. exam week, high energy)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-on-primary shrink-0"
              >
                + Add
              </button>
            </form>
          </div>

          {!hasAnyActivity ? (
            <div className="py-8 text-center text-xs text-on-surface-variant">
              No logs recorded on this date across the 6 systems.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Journal */}
              {journal.map(j => (
                <div
                  key={j.id}
                  onClick={() => {
                    onClose();
                    onNavigate('journal');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                    <span>Journal Entry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-on-surface line-clamp-2">{j.text}</p>
                </div>
              ))}

              {/* Study */}
              {study.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    onClose();
                    onNavigate('study');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-green-400">
                    <span>Study Session · {s.durationMins}m</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-on-surface font-medium">{s.topic || 'General Review'}</p>
                  {s.note && <p className="text-[11px] text-on-surface-variant">{s.note}</p>}
                </div>
              ))}

              {/* Recovery */}
              {recovery.map(r => (
                <div
                  key={r.id}
                  onClick={() => {
                    onClose();
                    onNavigate('recovery');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                    <span>Recovery · {r.type === 'urge' ? 'Urge Survived' : 'Slip/Reset'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-on-surface">{r.note || 'Recorded log'}</p>
                </div>
              ))}

              {/* Finance */}
              {finance.map(f => (
                <div
                  key={f.id}
                  onClick={() => {
                    onClose();
                    onNavigate('finance');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                    <span>Finance · {f.type}</span>
                    <span className="font-mono">{f.type === 'expense' ? '−' : '+'}{fmtNaira(f.amountKobo)}</span>
                  </div>
                  <p className="text-xs text-on-surface font-medium">{f.merchant || f.note || 'Transaction'}</p>
                </div>
              ))}

              {/* Pulse */}
              {pulse.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onNavigate('checkin');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
                    <span>Pulse Daily Check-in</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-on-surface font-mono">
                    Sleep: {p.sleepHours ?? '—'}h · Mood: {p.mood ?? '—'}/5 · Energy: {p.energy ?? '—'}/5
                  </p>
                  {p.note && <p className="text-[11px] text-on-surface-variant">{p.note}</p>}
                </div>
              ))}

              {/* Goals */}
              {goals.map(g => (
                <div
                  key={g.id}
                  onClick={() => {
                    onClose();
                    onNavigate('goals');
                  }}
                  className="p-3.5 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                    <span>Goals Milestone Log (+{g.value})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  {g.note && <p className="text-xs text-on-surface">{g.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
