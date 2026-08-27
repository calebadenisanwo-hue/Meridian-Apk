import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Trash2,
  Archive,
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoalsState, GoalItem, GoalCheckin } from '../../types';
import { MeridianStorage, fmtDateShort, todayStr } from '../../services/storage';

export const GoalsView: React.FC = () => {
  const [state, setState] = useState<GoalsState>(() => MeridianStorage.getGoals());
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Modal State for adding goal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetValue, setNewTargetValue] = useState(100);
  const [newUnit, setNewUnit] = useState('topics');
  const [newCategory, setNewCategory] = useState(state.categories[0]?.id || 'academic');
  const [newDeadline, setNewDeadline] = useState('');

  // Modal for logging progress check-in
  const [progressModalGoalId, setProgressModalGoalId] = useState<string | null>(null);
  const [progressIncrement, setProgressIncrement] = useState<number>(1);
  const [progressNote, setProgressNote] = useState<string>('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: GoalItem = {
      id: 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: newTitle.trim(),
      categoryId: newCategory,
      targetValue: newTargetValue,
      currentValue: 0,
      unit: newUnit.trim() || 'points',
      deadline: newDeadline || undefined,
      archived: false,
    };

    const newState = {
      ...state,
      goals: [...state.goals, newGoal],
    };
    setState(newState);
    MeridianStorage.saveGoals(newState);

    setNewTitle('');
    setIsAddModalOpen(false);
  };

  const handleLogProgress = () => {
    if (!progressModalGoalId) return;
    const g = state.goals.find(x => x.id === progressModalGoalId);
    if (!g) return;

    const updatedCurrent = g.currentValue + progressIncrement;
    const newCheckin: GoalCheckin = {
      id: 'gc_' + Date.now().toString(36),
      goalId: progressModalGoalId,
      date: todayStr(),
      value: progressIncrement,
      note: progressNote.trim() || undefined,
    };

    const updatedGoals = state.goals.map(item =>
      item.id === progressModalGoalId ? { ...item, currentValue: updatedCurrent } : item
    );

    const newState = {
      ...state,
      goals: updatedGoals,
      checkins: [newCheckin, ...state.checkins],
    };
    setState(newState);
    MeridianStorage.saveGoals(newState);

    if (updatedCurrent >= g.targetValue) {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    }

    setProgressModalGoalId(null);
    setProgressIncrement(1);
    setProgressNote('');
  };

  const handleToggleArchive = (id: string) => {
    const updatedGoals = state.goals.map(g =>
      g.id === id ? { ...g, archived: !g.archived } : g
    );
    const newState = { ...state, goals: updatedGoals };
    setState(newState);
    MeridianStorage.saveGoals(newState);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Delete this goal and its checkin records?')) {
      const updatedGoals = state.goals.filter(g => g.id !== id);
      const updatedCheckins = state.checkins.filter(c => c.goalId !== id);
      const newState = { ...state, goals: updatedGoals, checkins: updatedCheckins };
      setState(newState);
      MeridianStorage.saveGoals(newState);
    }
  };

  const activeGoals = state.goals.filter(g => !g.archived);
  const archivedGoals = state.goals.filter(g => !!g.archived);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Navigation and Add Button */}
      <div
        className="p-1.5 rounded-2xl border flex items-center justify-between gap-1 overflow-x-auto no-scrollbar touch-pan-x"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Active Targets ({activeGoals.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'archived'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({archivedGoals.length})</span>
          </button>
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
          <span>New Target</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="space-y-4">
        {(activeTab === 'active' ? activeGoals : archivedGoals).length === 0 ? (
          <div
            className="p-12 text-center rounded-3xl border space-y-3"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <Target className="w-8 h-8 opacity-30 mx-auto text-amber-400" />
            <p className="text-sm font-medium text-on-surface-variant">
              {activeTab === 'active' ? 'No active goals recorded.' : 'No archived goals.'}
            </p>
          </div>
        ) : (
          (activeTab === 'active' ? activeGoals : archivedGoals).map(goal => {
            const cat = state.categories.find(c => c.id === goal.categoryId);
            const pct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
            const isCompleted = goal.currentValue >= goal.targetValue;

            return (
              <div
                key={goal.id}
                className="p-6 rounded-3xl border shadow-sm space-y-4"
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
                        {cat?.name || 'Goal'}
                      </span>
                      {goal.deadline && (
                        <span className="text-xs font-mono text-on-surface-variant">
                          Due: {fmtDateShort(goal.deadline)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-on-surface mt-1">
                      {goal.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleArchive(goal.id)}
                      title={goal.archived ? 'Restore' : 'Archive'}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      title="Delete goal"
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="font-mono">
                      <span>{goal.currentValue}</span>
                      <span className="text-on-surface-variant"> / {goal.targetValue} {goal.unit}</span>
                    </div>
                    <span className="font-mono text-primary font-bold">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                {!goal.archived && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setProgressModalGoalId(goal.id)}
                      className="px-4 py-1.5 text-xs font-bold rounded-full bg-primary-container text-on-primary-container border border-primary/40 hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Progress</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
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
            <h3 className="text-base font-bold font-display">Create Measurable Target</h3>
            <form onSubmit={handleAddGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Target Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Complete 50 Anatomy Modules"
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Target Value</label>
                  <input
                    type="number"
                    min="1"
                    value={newTargetValue}
                    onChange={e => setNewTargetValue(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    placeholder="topics, hours, books"
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
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
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
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
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Increment Modal */}
      {progressModalGoalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setProgressModalGoalId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <h3 className="text-base font-bold font-display">Log Milestone Progress</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Increment Amount</label>
                <div className="flex gap-2">
                  {[1, 5, 10].map(inc => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setProgressIncrement(inc)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${
                        progressIncrement === inc
                          ? 'bg-primary-container text-on-primary-container border-primary'
                          : 'border-outline-variant'
                      }`}
                    >
                      +{inc}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    value={progressIncrement}
                    onChange={e => setProgressIncrement(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-1.5 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Milestone Note (Optional)</label>
                <input
                  type="text"
                  value={progressNote}
                  onChange={e => setProgressNote(e.target.value)}
                  placeholder="Completed topic, review session..."
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProgressModalGoalId(null)}
                  className="px-4 py-1.5 text-xs rounded-full border border-outline-variant"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogProgress}
                  className="px-5 py-1.5 text-xs font-bold rounded-full bg-primary text-on-primary shadow-sm"
                >
                  Confirm Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
