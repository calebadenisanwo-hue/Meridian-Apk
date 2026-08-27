import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  History,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecoveryState, RecoveryQuit, RecoveryLog } from '../../types';
import { MeridianStorage, fmtDateShort, todayStr, RECOVERY_MILESTONES } from '../../services/storage';

export const RecoveryView: React.FC = () => {
  const [state, setState] = useState<RecoveryState>(() => MeridianStorage.getRecovery());
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'quits' | 'vault' | 'history'>('quits');

  // Modal state for adding a new quit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newQuitName, setNewQuitName] = useState('');
  const [newQuitCategory, setNewQuitCategory] = useState(state.categories[0]?.id || 'substance');
  const [newQuitReason, setNewQuitReason] = useState('');

  // Modal state for logging slip/reset
  const [resetModalQuitId, setResetModalQuitId] = useState<string | null>(null);
  const [resetNote, setResetNote] = useState('');

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCleanTimeParts = (quitTimestamp: number) => {
    const diff = Math.max(0, now - quitTimestamp);
    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return { days, hours, minutes, seconds, totalSecs };
  };

  const handleLogUrge = (quitId: string) => {
    const updatedQuits = state.quits.map(q =>
      q.id === quitId ? { ...q, urgesLogged: (q.urgesLogged || 0) + 1 } : q
    );
    const newLog: RecoveryLog = {
      id: 'rl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      quitId,
      date: todayStr(),
      type: 'urge',
      note: 'Craving overcome successfully with mindfulness.',
    };
    const newState: RecoveryState = {
      ...state,
      quits: updatedQuits,
      logs: [newLog, ...state.logs],
    };
    setState(newState);
    MeridianStorage.saveRecovery(newState);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
  };

  const handleConfirmReset = () => {
    if (!resetModalQuitId) return;
    const q = state.quits.find(x => x.id === resetModalQuitId);
    if (!q) return;

    const { days } = getCleanTimeParts(q.quitTimestamp);
    const longest = Math.max(q.longestCleanDays || 0, days);

    const updatedQuits = state.quits.map(item =>
      item.id === resetModalQuitId
        ? {
            ...item,
            quitTimestamp: Date.now(),
            longestCleanDays: longest,
          }
        : item
    );

    const newLog: RecoveryLog = {
      id: 'rl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      quitId: resetModalQuitId,
      date: todayStr(),
      type: 'reset',
      note: resetNote.trim() || 'Timer reset logged.',
    };

    const newState: RecoveryState = {
      ...state,
      quits: updatedQuits,
      logs: [newLog, ...state.logs],
    };
    setState(newState);
    MeridianStorage.saveRecovery(newState);

    setResetModalQuitId(null);
    setResetNote('');
  };

  const handleAddQuit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuitName.trim()) return;

    const newQuit: RecoveryQuit = {
      id: 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: newQuitName.trim(),
      categoryId: newQuitCategory,
      quitTimestamp: Date.now(),
      reason: newQuitReason.trim(),
      urgesLogged: 0,
      longestCleanDays: 0,
    };

    const newState: RecoveryState = {
      ...state,
      quits: [...state.quits, newQuit],
    };
    setState(newState);
    MeridianStorage.saveRecovery(newState);

    setNewQuitName('');
    setNewQuitReason('');
    setIsAddModalOpen(false);
  };

  const handleDeleteQuit = (id: string) => {
    if (confirm('Delete this habit tracker and all its associated logs?')) {
      const newState: RecoveryState = {
        ...state,
        quits: state.quits.filter(q => q.id !== id),
        logs: state.logs.filter(l => l.quitId !== id),
      };
      setState(newState);
      MeridianStorage.saveRecovery(newState);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Navigation Pills */}
      <div
        className="p-1.5 rounded-2xl border flex items-center justify-between gap-1 overflow-x-auto no-scrollbar touch-pan-x"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-center gap-1 shrink-0">
          {[
            { id: 'quits', label: 'Active Quits', icon: ShieldCheck },
            { id: 'vault', label: 'Milestone Vault', icon: Award },
            { id: 'history', label: `Urge & Reset Log (${state.logs.length})`, icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          type="button"
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 shrink-0"
          style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Track New Habit</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE QUITS & TIMERS */}
      {activeTab === 'quits' && (
        <div className="space-y-4">
          {state.quits.length === 0 ? (
            <div
              className="p-12 text-center rounded-3xl border space-y-3"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <ShieldCheck className="w-8 h-8 opacity-30 mx-auto text-amber-400" />
              <p className="text-sm font-medium text-on-surface-variant">
                No habits currently being tracked in Unbound.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                type="button"
                className="px-4 py-2 text-xs font-bold rounded-full bg-primary text-on-primary shadow-sm"
              >
                + Track First Habit
              </button>
            </div>
          ) : (
            state.quits.map(quit => {
              const cat = state.categories.find(c => c.id === quit.categoryId);
              const { days, hours, minutes, seconds } = getCleanTimeParts(quit.quitTimestamp);

              return (
                <div
                  key={quit.id}
                  className="p-6 rounded-3xl border shadow-sm space-y-5"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 text-[10px] font-mono uppercase font-bold rounded-full"
                          style={{
                            backgroundColor: cat ? cat.color + '22' : 'var(--md-sys-color-primary-container)',
                            color: cat ? cat.color : 'var(--md-sys-color-primary)',
                          }}
                        >
                          {cat?.name || 'Habit'}
                        </span>
                        {quit.longestCleanDays ? (
                          <span className="text-xs font-mono text-on-surface-variant">
                            Best: {quit.longestCleanDays}d
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-lg font-bold font-display text-on-surface mt-1">
                        {quit.name}
                      </h3>
                      {quit.reason && (
                        <p className="text-xs text-on-surface-variant italic mt-0.5">&ldquo;{quit.reason}&rdquo;</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteQuit(quit.id)}
                      className="text-xs text-on-surface-variant hover:text-rose-400 p-1 self-start sm:self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Clean Time Tickers in Material 3 Style */}
                  <div className="grid grid-cols-4 gap-2 text-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">{days}</div>
                      <div className="text-[10px] uppercase font-mono text-on-surface-variant">Days</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-on-surface">{hours}</div>
                      <div className="text-[10px] uppercase font-mono text-on-surface-variant">Hours</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-on-surface">{minutes}</div>
                      <div className="text-[10px] uppercase font-mono text-on-surface-variant">Minutes</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-on-surface">{seconds}</div>
                      <div className="text-[10px] uppercase font-mono text-on-surface-variant">Seconds</div>
                    </div>
                  </div>

                  {/* Urge & Reset Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLogUrge(quit.id)}
                        className="px-4 py-2 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                      >
                        <Flame className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Log Urge Survived ({quit.urgesLogged || 0})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResetModalQuitId(quit.id)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-full border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      Log Slip / Reset Timer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: MILESTONE MEDALLION VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          {state.quits.map(quit => {
            const { days } = getCleanTimeParts(quit.quitTimestamp);

            return (
              <div
                key={quit.id}
                className="p-6 rounded-3xl border space-y-4 shadow-sm"
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-display">{quit.name}</h3>
                    <p className="text-xs text-on-surface-variant font-mono">{days} Continuous Clean Days</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-mono font-bold"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }}
                  >
                    {RECOVERY_MILESTONES.filter(m => days >= m.days).length}/{RECOVERY_MILESTONES.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {RECOVERY_MILESTONES.map(m => {
                    const isUnlocked = days >= m.days;
                    const daysRemaining = Math.max(0, m.days - days);

                    return (
                      <div
                        key={m.days}
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between space-y-2 transition-all ${
                          isUnlocked
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                            : 'bg-black/5 dark:bg-white/5 border-outline-variant opacity-40'
                        }`}
                      >
                        <div className="text-2xl">{m.icon}</div>
                        <div>
                          <div className="text-xs font-bold">{m.label}</div>
                          <div className="text-[10px] text-on-surface-variant font-mono">{m.sub}</div>
                        </div>
                        <div className="text-[10.5px] font-mono font-bold text-amber-400">
                          {isUnlocked ? '✓ UNLOCKED' : `${daysRemaining}d away`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: LOGS HISTORY */}
      {activeTab === 'history' && (
        <div
          className="rounded-3xl border divide-y overflow-hidden shadow-sm"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          {state.logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-on-surface-variant">
              No recovery logs or cravings recorded yet.
            </div>
          ) : (
            state.logs.map(log => {
              const q = state.quits.find(qq => qq.id === log.quitId);
              return (
                <div key={log.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-primary">
                        {fmtDateShort(log.date)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-semibold ${
                          log.type === 'urge'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {log.type === 'urge' ? 'Urge Survived' : 'Timer Reset'}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        · {q?.name || 'Habit Target'}
                      </span>
                    </div>
                    {log.note && <p className="text-xs text-on-surface">{log.note}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Quit Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <h3 className="text-base font-bold font-display">Track New Habit / Addiction</h3>
            <form onSubmit={handleAddQuit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Habit Name</label>
                <input
                  type="text"
                  required
                  value={newQuitName}
                  onChange={e => setNewQuitName(e.target.value)}
                  placeholder="e.g. Sugar, Nicotine, Screen Time"
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Category</label>
                <select
                  value={newQuitCategory}
                  onChange={e => setNewQuitCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                >
                  {state.categories.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-zinc-800">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Primary Motivation</label>
                <input
                  type="text"
                  value={newQuitReason}
                  onChange={e => setNewQuitReason(e.target.value)}
                  placeholder="Why is this change non-negotiable?"
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 text-xs rounded-full border border-outline-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-xs font-bold rounded-full bg-primary text-on-primary shadow-sm"
                >
                  Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip / Reset Modal */}
      {resetModalQuitId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setResetModalQuitId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold font-display">Log Slip & Reset Timer</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Recovery is non-linear. What matters is candid reflection and immediate recommitment.
            </p>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">What triggered this slip?</label>
              <textarea
                rows={3}
                required
                value={resetNote}
                onChange={e => setResetNote(e.target.value)}
                placeholder="Identify root cause: stress, fatigue, boredom, context..."
                className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalQuitId(null)}
                className="px-4 py-1.5 text-xs rounded-full border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-1.5 text-xs font-bold rounded-full bg-rose-600 text-white shadow-sm"
              >
                Reset Timer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
