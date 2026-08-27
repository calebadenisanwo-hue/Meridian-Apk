import React, { useState } from 'react';
import { X, BookOpen, GraduationCap, ShieldCheck, Wallet, Activity, Target, Sparkles, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ModuleRoute } from '../../types';
import {
  MeridianStorage,
  todayStr,
  fmtDateShort,
} from '../../services/storage';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<ModuleRoute>('journal');
  const [date, setDate] = useState(todayStr());
  const [dayTagsInput, setDayTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Journal form state
  const [journalText, setJournalText] = useState('');
  const [journalTag, setJournalTag] = useState('');
  const [journalPinned, setJournalPinned] = useState(false);

  // Study form state
  const studyState = MeridianStorage.getStudy();
  const [studySubjectId, setStudySubjectId] = useState(studyState.subjects[0]?.id || '');
  const [studyDuration, setStudyDuration] = useState(45);
  const [studyTopic, setStudyTopic] = useState('');
  const [studyNote, setStudyNote] = useState('');

  // Recovery form state
  const recoveryState = MeridianStorage.getRecovery();
  const [recoveryQuitId, setRecoveryQuitId] = useState(recoveryState.quits[0]?.id || '');
  const [recoveryType, setRecoveryType] = useState<'urge' | 'reset'>('urge');
  const [recoveryNote, setRecoveryNote] = useState('');

  // Finance form state
  const financeState = MeridianStorage.getFinance();
  const [finType, setFinType] = useState<'expense' | 'income' | 'transfer' | 'adjustment'>('expense');
  const [finAccountId, setFinAccountId] = useState(financeState.accounts[0]?.id || '');
  const [finCategoryId, setFinCategoryId] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finMerchant, setFinMerchant] = useState('');
  const [finNote, setFinNote] = useState('');
  const [finFromAccount, setFinFromAccount] = useState(financeState.accounts[0]?.id || '');
  const [finToAccount, setFinToAccount] = useState(financeState.accounts[1]?.id || financeState.accounts[0]?.id || '');

  // Pulse form state
  const pulseState = MeridianStorage.getPulse();
  const [pulseSleepHours, setPulseSleepHours] = useState('7.5');
  const [pulseSleepQuality, setPulseSleepQuality] = useState<number | null>(4);
  const [pulseMood, setPulseMood] = useState<number | null>(4);
  const [pulseEnergy, setPulseEnergy] = useState<number | null>(4);
  const [pulseHabitsCompleted, setPulseHabitsCompleted] = useState<string[]>([]);
  const [pulseNote, setPulseNote] = useState('');

  // Goals form state
  const goalsState = MeridianStorage.getGoals();
  const activeGoals = goalsState.goals.filter(g => !g.archived);
  const [goalId, setGoalId] = useState(activeGoals[0]?.id || '');
  const [goalValue, setGoalValue] = useState('1');
  const [goalNote, setGoalNote] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    setError(null);
    try {
      if (activeTab === 'journal') {
        if (!journalText.trim()) throw new Error('Please enter your reflection note.');
        const entries = MeridianStorage.getJournal();
        let timestamp = new Date().toISOString();
        if (date !== todayStr()) {
          const d = new Date(date);
          timestamp = d.toISOString();
        }
        entries.unshift({
          id: 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text: journalText.trim(),
          html: journalText.trim(),
          tag: journalTag.trim() || undefined,
          pinned: journalPinned,
          timestamp,
        });
        MeridianStorage.saveJournal(entries);
      } else if (activeTab === 'study') {
        if (!studySubjectId) throw new Error('Please select a subject.');
        const state = MeridianStorage.getStudy();
        state.logs.unshift({
          id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          date,
          subjectId: studySubjectId,
          durationMins: Number(studyDuration) || 45,
          focusScore: 5,
          topic: studyTopic.trim() || 'Focused Study Session',
          note: studyNote.trim(),
        });
        MeridianStorage.saveStudy(state);
      } else if (activeTab === 'recovery') {
        if (!recoveryQuitId) throw new Error('Please select a habit target.');
        const state = MeridianStorage.getRecovery();
        state.logs.unshift({
          id: 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          quitId: recoveryQuitId,
          date,
          type: recoveryType,
          note: recoveryNote.trim() || (recoveryType === 'urge' ? 'Craving overcome successfully.' : 'Reset logged.'),
        });
        const q = state.quits.find(x => x.id === recoveryQuitId);
        if (q) {
          if (recoveryType === 'urge') {
            q.urgesLogged = (q.urgesLogged || 0) + 1;
            confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
          } else {
            const days = Math.max(0, Math.floor((Date.now() - q.quitTimestamp) / 86400000));
            if (days > (q.longestCleanDays || 0)) q.longestCleanDays = days;
            q.quitTimestamp = Date.now();
          }
        }
        MeridianStorage.saveRecovery(state);
      } else if (activeTab === 'finance') {
        const amt = parseFloat(finAmount);
        if (isNaN(amt) || amt <= 0) throw new Error('Please enter a valid amount.');
        const state = MeridianStorage.getFinance();
        const kobo = Math.round(amt * 100);

        state.transactions.unshift({
          id: 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          type: finType,
          date,
          accountId: finType === 'transfer' ? undefined : finAccountId,
          fromAccountId: finType === 'transfer' ? finFromAccount : undefined,
          toAccountId: finType === 'transfer' ? finToAccount : undefined,
          categoryId: finCategoryId || null,
          merchant: finMerchant.trim() || undefined,
          note: finNote.trim() || undefined,
          amountKobo: kobo,
        });
        MeridianStorage.saveFinance(state);
      } else if (activeTab === 'checkin') {
        const state = MeridianStorage.getPulse();
        const existingIdx = state.logs.findIndex(l => l.date === date);
        const logEntry = {
          id: 'p_' + Date.now().toString(36),
          date,
          sleepHours: pulseSleepHours ? Number(pulseSleepHours) : null,
          sleepQuality: pulseSleepQuality,
          mood: pulseMood,
          energy: pulseEnergy,
          habitsCompleted: pulseHabitsCompleted,
          note: pulseNote.trim() || undefined,
        };
        if (existingIdx >= 0) {
          state.logs[existingIdx] = logEntry;
        } else {
          state.logs.unshift(logEntry);
        }
        MeridianStorage.savePulse(state);
      } else if (activeTab === 'goals') {
        if (!goalId) throw new Error('Please select a goal.');
        const state = MeridianStorage.getGoals();
        const g = state.goals.find(x => x.id === goalId);
        const val = g?.targetType === 'boolean' ? 1 : parseFloat(goalValue) || 1;
        state.checkins.unshift({
          id: 'g_' + Date.now().toString(36),
          goalId,
          date,
          value: val,
          note: goalNote.trim() || undefined,
        });
        MeridianStorage.saveGoals(state);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      }

      // Save day tags if entered
      if (dayTagsInput.trim()) {
        dayTagsInput
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
          .forEach(tag => MeridianStorage.addDayTag(date, tag));
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save entry.');
    }
  };

  const tabs: { id: ModuleRoute; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'journal', label: 'Journal', icon: BookOpen, color: '#2D6A4F' },
    { id: 'study', label: 'Study', icon: GraduationCap, color: '#22A566' },
    { id: 'recovery', label: 'Recovery', icon: ShieldCheck, color: '#D3A346' },
    { id: 'finance', label: 'Finance', icon: Wallet, color: '#4FA9E0' },
    { id: 'checkin', label: 'Pulse', icon: Activity, color: '#F0A8C4' },
    { id: 'goals', label: 'Goals', icon: Target, color: '#E8B368' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-6"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-semibold"
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display">Quick Add to System</h2>
              <p className="text-xs text-on-surface-variant">Rapid capture without leaving current screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-3 px-4 sm:px-6 overflow-x-auto no-scrollbar touch-pan-x border-b" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setError(null);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all m3-ripple ${
                  isActive ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                }}
              >
                <span style={{ color: isActive ? 'inherit' : t.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Form Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div
              className="p-3 text-xs rounded-2xl border font-medium flex items-center gap-2"
              style={{
                backgroundColor: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                borderColor: 'var(--md-sys-color-error)',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Date Picker (Common) */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-on-surface-variant w-24 shrink-0">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* JOURNAL FORM */}
          {activeTab === 'journal' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Reflection / Note</label>
                <textarea
                  rows={3}
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="What's happening right now? Key insight, thought or event..."
                  className="w-full px-3.5 py-2.5 text-xs md:text-sm rounded-2xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Tag (e.g. clarity, study)</label>
                  <input
                    type="text"
                    value={journalTag}
                    onChange={e => setJournalTag(e.target.value)}
                    placeholder="tag"
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={journalPinned}
                      onChange={e => setJournalPinned(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <span>Pin to top</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STUDY FORM */}
          {activeTab === 'study' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Subject Module</label>
                <select
                  value={studySubjectId}
                  onChange={e => setStudySubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                >
                  {studyState.subjects.map(s => (
                    <option key={s.id} value={s.id} className="dark:bg-zinc-800">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={studyDuration}
                    onChange={e => setStudyDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Topic Name</label>
                  <input
                    type="text"
                    value={studyTopic}
                    onChange={e => setStudyTopic(e.target.value)}
                    placeholder="e.g. Brachial Plexus"
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Notes / Anki Cards Made</label>
                <input
                  type="text"
                  value={studyNote}
                  onChange={e => setStudyNote(e.target.value)}
                  placeholder="Key takeaways..."
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
            </div>
          )}

          {/* RECOVERY FORM */}
          {activeTab === 'recovery' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Target Habit</label>
                <select
                  value={recoveryQuitId}
                  onChange={e => setRecoveryQuitId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                >
                  {recoveryState.quits.map(q => (
                    <option key={q.id} value={q.id} className="dark:bg-zinc-800">
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Action Log Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryType('urge')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      recoveryType === 'urge'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    💪 Urge Survived (+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryType('reset')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      recoveryType === 'reset'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    🔄 Slip / Reset Timer
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Trigger / Reflection Note</label>
                <input
                  type="text"
                  value={recoveryNote}
                  onChange={e => setRecoveryNote(e.target.value)}
                  placeholder="What was the trigger or victorious technique?"
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
            </div>
          )}

          {/* FINANCE FORM */}
          {activeTab === 'finance' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Transaction Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['expense', 'income', 'transfer', 'adjustment'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFinType(t)}
                      className={`py-1.5 text-xs font-semibold rounded-xl capitalize border transition-all ${
                        finType === t
                          ? 'bg-primary-container text-on-primary-container border-primary'
                          : 'border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={finAmount}
                    onChange={e => setFinAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    {finType === 'transfer' ? 'From Account' : 'Account'}
                  </label>
                  <select
                    value={finType === 'transfer' ? finFromAccount : finAccountId}
                    onChange={e =>
                      finType === 'transfer' ? setFinFromAccount(e.target.value) : setFinAccountId(e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  >
                    {financeState.accounts.map(a => (
                      <option key={a.id} value={a.id} className="dark:bg-zinc-800">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {finType === 'transfer' && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">To Account</label>
                  <select
                    value={finToAccount}
                    onChange={e => setFinToAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  >
                    {financeState.accounts.map(a => (
                      <option key={a.id} value={a.id} className="dark:bg-zinc-800">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {finType !== 'transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Category</label>
                    <select
                      value={finCategoryId}
                      onChange={e => setFinCategoryId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                    >
                      <option value="" className="dark:bg-zinc-800">
                        — Uncategorized —
                      </option>
                      {financeState.categories
                        .filter(c => c.kind === finType)
                        .map(c => (
                          <option key={c.id} value={c.id} className="dark:bg-zinc-800">
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">Merchant / Source</label>
                    <input
                      type="text"
                      value={finMerchant}
                      onChange={e => setFinMerchant(e.target.value)}
                      placeholder="e.g. Grocery store"
                      className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PULSE CHECK-IN FORM */}
          {activeTab === 'checkin' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Sleep Duration (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    step="0.5"
                    value={pulseSleepHours}
                    onChange={e => setPulseSleepHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Mood (1-5)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPulseMood(v)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                          pulseMood === v
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                            : 'border-outline-variant text-on-surface-variant'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Habits Completed Today</label>
                <div className="flex flex-wrap gap-1.5">
                  {pulseState.habits
                    .filter(h => !h.archived)
                    .map(h => {
                      const isChecked = pulseHabitsCompleted.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setPulseHabitsCompleted(prev =>
                              isChecked ? prev.filter(x => x !== h.id) : [...prev, h.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all ${
                            isChecked
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-semibold'
                              : 'border-outline-variant text-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              isChecked ? 'bg-emerald-500 text-black' : 'border border-outline'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span>{h.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Daily Reflection / Context</label>
                <input
                  type="text"
                  value={pulseNote}
                  onChange={e => setPulseNote(e.target.value)}
                  placeholder="How was today physically & mentally?"
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
            </div>
          )}

          {/* GOALS FORM */}
          {activeTab === 'goals' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Select Goal</label>
                <select
                  value={goalId}
                  onChange={e => setGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                >
                  {activeGoals.map(g => (
                    <option key={g.id} value={g.id} className="dark:bg-zinc-800">
                      {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Value / Amount to Add
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={goalValue}
                    onChange={e => setGoalValue(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Check-in Note</label>
                  <input
                    type="text"
                    value={goalNote}
                    onChange={e => setGoalNote(e.target.value)}
                    placeholder="Milestone notes..."
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Day Tags Input (Common to all logs) */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Add Day Tags (comma separated, e.g. <span className="italic">exam week, high energy</span>)
            </label>
            <input
              type="text"
              value={dayTagsInput}
              onChange={e => setDayTagsInput(e.target.value)}
              placeholder="Tag this day across all modules..."
              className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-semibold rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-5 py-2 text-xs font-bold rounded-full shadow-md transition-all transform active:scale-95 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <span>Save Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
