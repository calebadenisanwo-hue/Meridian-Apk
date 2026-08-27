import React, { useState } from 'react';
import {
  Activity,
  Moon,
  Sun,
  Smile,
  Zap,
  CheckCircle2,
  Calendar,
  History,
  Trash2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PulseState, PulseLog, HabitItem } from '../../types';
import { MeridianStorage, fmtDateShort, todayStr, daysAgoStr } from '../../services/storage';
import { Haptics } from '../../services/haptics';

export const PulseView: React.FC = () => {
  const [state, setState] = useState<PulseState>(() => MeridianStorage.getPulse());
  const [activeTab, setActiveTab] = useState<'checkin' | 'habits' | 'history'>('checkin');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [mood, setMood] = useState<number>(4);
  const [energy, setEnergy] = useState<number>(4);
  const [focus, setFocus] = useState<number>(4);
  const [note, setNote] = useState<string>('');
  const [habitChecks, setHabitChecks] = useState<Record<string, boolean>>({});

  // Sync with existing log if date changed
  const existingLog = state.logs.find(l => l.date === selectedDate);

  const handleSaveCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    Haptics.success();

    const newLog: PulseLog = {
      id: existingLog?.id || 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: selectedDate,
      sleepHours,
      mood,
      energy,
      focus,
      note: note.trim() || undefined,
      habits: habitChecks,
    };

    const updatedLogs = state.logs.filter(l => l.date !== selectedDate);
    const newState = {
      ...state,
      logs: [newLog, ...updatedLogs].sort((a, b) => b.date.localeCompare(a.date)),
    };

    setState(newState);
    MeridianStorage.savePulse(newState);

    if (!MeridianStorage.getLowPowerMode()) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    }
    setSavedBanner(`Saved Pulse check-in for ${fmtDateShort(selectedDate)}!`);
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleToggleHabitForDate = (habitId: string, dateStr: string) => {
    Haptics.light();
    const targetLog = state.logs.find(l => l.date === dateStr);
    let updatedLogs: PulseLog[] = [];

    if (targetLog) {
      const currentVal = !!(targetLog.habits && targetLog.habits[habitId]);
      const newHabits = { ...(targetLog.habits || {}), [habitId]: !currentVal };
      updatedLogs = state.logs.map(l =>
        l.date === dateStr ? { ...l, habits: newHabits } : l
      );
    } else {
      const newLog: PulseLog = {
        id: 'p_' + Date.now().toString(36),
        date: dateStr,
        sleepHours: null,
        mood: null,
        energy: null,
        habits: { [habitId]: true },
      };
      updatedLogs = [newLog, ...state.logs];
    }

    const newState = { ...state, logs: updatedLogs };
    setState(newState);
    MeridianStorage.savePulse(newState);
  };

  const handleDeleteLog = (id: string) => {
    Haptics.warning();
    if (confirm('Delete this pulse check-in?')) {
      const updatedLogs = state.logs.filter(l => l.id !== id);
      const newState = { ...state, logs: updatedLogs };
      setState(newState);
      MeridianStorage.savePulse(newState);
      Haptics.light();
    }
  };

  // Last 7 days for the habit matrix
  const last7Days = Array.from({ length: 7 }, (_, i) => daysAgoStr(6 - i));

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {savedBanner && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{savedBanner}</span>
          <button onClick={() => setSavedBanner(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Sub tabs */}
      <div
        className="p-1.5 rounded-2xl border flex items-center justify-between gap-1 overflow-x-auto no-scrollbar touch-pan-x"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-center gap-1 shrink-0">
          {[
            { id: 'checkin', label: 'Daily Pulse Check-in', icon: Activity },
            { id: 'habits', label: '7-Day Habit Matrix', icon: CheckCircle2 },
            { id: 'history', label: `Check-in Logs (${state.logs.length})`, icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  Haptics.selection();
                  setActiveTab(tab.id as any);
                }}
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
      </div>

      {/* TAB 1: DAILY CHECK-IN FORM */}
      {activeTab === 'checkin' && (
        <form
          onSubmit={handleSaveCheckin}
          className="p-6 rounded-3xl border shadow-sm space-y-6"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display">Daily Physiological & Mental Pulse</h2>
              <p className="text-xs text-on-surface-variant">Log your rest, subjective energy, and key wellness habits</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sleep Hours */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-blue-400" />
                  <span>Sleep Duration</span>
                </div>
                <span className="font-mono text-sm font-bold text-primary">{sleepHours} hours</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={e => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Mood (1 to 5) */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-emerald-400" />
                  <span>Mood & Outlook</span>
                </div>
                <span className="font-mono text-sm font-bold text-primary">{mood} / 5</span>
              </div>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMood(v)}
                    className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${
                      mood === v
                        ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy (1 to 5) */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Physical Energy</span>
                </div>
                <span className="font-mono text-sm font-bold text-primary">{energy} / 5</span>
              </div>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEnergy(v)}
                    className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${
                      energy === v
                        ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus (1 to 5) */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Cognitive Focus</span>
                </div>
                <span className="font-mono text-sm font-bold text-primary">{focus} / 5</span>
              </div>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFocus(v)}
                    className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${
                      focus === v
                        ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Habits Checklist */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-on-surface-variant mb-2">
              Daily Wellness Protocol
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {state.habits.map(habit => {
                const isChecked = !!habitChecks[habit.id];
                return (
                  <label
                    key={habit.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-primary-container/40 border-primary shadow-sm'
                        : 'border-outline-variant bg-black/5 dark:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e =>
                        setHabitChecks(prev => ({ ...prev, [habit.id]: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div className="text-xs">
                      <span className="font-bold">{habit.name}</span>
                      {habit.target && <span className="text-on-surface-variant ml-1">({habit.target})</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-on-surface-variant mb-1">
              Physiological Notes
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any notable physical symptoms, stressors, or sleep disruptions..."
              className="w-full px-3 py-2 text-xs rounded-2xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-2"
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Pulse Check-in</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: 7-DAY HABIT MATRIX */}
      {activeTab === 'habits' && (
        <div
          className="p-6 rounded-3xl border space-y-4 shadow-sm"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <h3 className="text-base font-bold font-display">7-Day Protocol Consistency Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-mono">
                  <th className="py-2 px-3 font-semibold">Habit Protocol</th>
                  {last7Days.map(d => (
                    <th key={d} className="py-2 px-2 text-center font-semibold">
                      {fmtDateShort(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {state.habits.map(habit => (
                  <tr key={habit.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="py-3 px-3 font-semibold text-on-surface">
                      {habit.name}
                      {habit.target && <span className="text-on-surface-variant text-[11px] font-normal ml-1">({habit.target})</span>}
                    </td>
                    {last7Days.map(d => {
                      const log = state.logs.find(l => l.date === d);
                      const isDone = !!(log?.habits && log.habits[habit.id]);

                      return (
                        <td key={d} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleHabitForDate(habit.id, d)}
                            className={`w-6 h-6 rounded-lg border inline-flex items-center justify-center transition-all ${
                              isDone
                                ? 'bg-emerald-500 text-black border-emerald-500 shadow-sm'
                                : 'border-outline-variant hover:border-primary'
                            }`}
                          >
                            {isDone && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CHECK-IN HISTORY */}
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
              No pulse logs recorded yet.
            </div>
          ) : (
            state.logs.map(log => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-primary">
                      {fmtDateShort(log.date)}
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                      Sleep: {log.sleepHours ?? '—'}h
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                      Mood: {log.mood ?? '—'}/5
                    </span>
                  </div>
                  {log.note && <p className="text-xs text-on-surface">{log.note}</p>}
                </div>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
