import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Wallet,
  Activity,
  Target,
  Flame,
  Award,
  SlidersHorizontal,
  Layers,
  Zap,
  Share2,
} from 'lucide-react';
import { ModuleRoute, SystemWeights } from '../../types';
import { NativeAndroid } from '../../services/nativeAndroid';
import {
  MeridianStorage,
  fmtNaira,
  todayStr,
  daysAgoStr,
  fmtDateShort,
} from '../../services/storage';
import {
  computeSystemScores,
  computeWeightedComposite,
  computeWeeklyScoreboard,
  buildTodaysMove,
  buildPersonalRecords,
  buildActivityMatrix,
  computeCrossCorrelations,
} from '../../services/metrics';

interface OverviewViewProps {
  onNavigate: (route: ModuleRoute) => void;
  onOpenQuickAdd: () => void;
  onOpenDayDetail: (date: string) => void;
  onOpenTimelineWithTag: (tag: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenQuickAdd,
  onOpenDayDetail,
  onOpenTimelineWithTag,
}) => {
  const [rangeDays, setRangeDays] = useState<number>(60);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const journal = MeridianStorage.getJournal();
  const study = MeridianStorage.getStudy();
  const recovery = MeridianStorage.getRecovery();
  const finance = MeridianStorage.getFinance();
  const pulse = MeridianStorage.getPulse();
  const goals = MeridianStorage.getGoals();
  const dayTagsMap = MeridianStorage.getDayTags();
  const weights = MeridianStorage.getWeights();

  const scores = computeSystemScores(journal, study, recovery, finance, pulse, goals);
  const composite = computeWeightedComposite(scores, weights);
  const scoreboard = computeWeeklyScoreboard(journal, study, recovery, finance, pulse, goals);
  const todaysMove = buildTodaysMove(scores, scoreboard);
  const personalRecords = buildPersonalRecords(journal, study, recovery, finance, pulse, goals);
  const activityMatrix = buildActivityMatrix(journal, study, recovery, finance, pulse, goals, rangeDays);
  const crossCorrelations = computeCrossCorrelations(study, recovery, pulse, finance);

  // Consistency calculation over range
  const totalDaysInRange = Math.max(1, rangeDays);
  const journalActiveDays = new Set(
    journal.filter(j => j.timestamp.slice(0, 10) >= daysAgoStr(rangeDays)).map(j => j.timestamp.slice(0, 10))
  ).size;
  const studyActiveDays = new Set(
    study.logs.filter(l => l.date >= daysAgoStr(rangeDays)).map(l => l.date)
  ).size;
  const pulseActiveDays = new Set(
    pulse.logs.filter(l => l.date >= daysAgoStr(rangeDays)).map(l => l.date)
  ).size;

  const journalConsistency = Math.round((journalActiveDays / totalDaysInRange) * 100);
  const studyConsistency = Math.round((studyActiveDays / totalDaysInRange) * 100);
  const pulseConsistency = Math.round((pulseActiveDays / totalDaysInRange) * 100);

  // Tag frequency
  const tagCounts: Record<string, number> = {};
  Object.values(dayTagsMap).forEach(tags => {
    tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // Handle saving weights
  const [tempWeights, setTempWeights] = useState<SystemWeights>(weights);
  const handleSaveWeights = () => {
    MeridianStorage.saveWeights(tempWeights);
    setIsWeightModalOpen(false);
  };

  const totalFinanceNetWorthKobo = finance.accounts.reduce((sum, acc) => {
    let b = acc.opening;
    (finance.transactions || []).forEach(t => {
      if (t.type === 'income' && t.accountId === acc.id) b += t.amountKobo;
      else if (t.type === 'expense' && t.accountId === acc.id) b -= t.amountKobo;
      else if (t.type === 'adjustment' && t.accountId === acc.id) b += t.amountKobo;
      else if (t.type === 'transfer') {
        if (t.fromAccountId === acc.id) b -= t.amountKobo;
        if (t.toAccountId === acc.id) b += t.amountKobo;
      }
    });
    return sum + b;
  }, 0);

  // Systems Roster
  const systems = [
    {
      route: 'journal' as ModuleRoute,
      title: 'Journal',
      desc: `${journal.length} entries · ${journal.filter(j => Date.now() - new Date(j.timestamp).getTime() <= 7 * 86400000).length} this week`,
      icon: BookOpen,
      color: '#2D6A4F',
      score: scores.journalScore,
    },
    {
      route: 'study' as ModuleRoute,
      title: 'Study Ledger',
      desc: `${(study.logs.reduce((s, l) => s + (l.durationMins || 0), 0) / 60).toFixed(1)}h total logged`,
      icon: GraduationCap,
      color: '#22A566',
      score: scores.studyScore,
    },
    {
      route: 'recovery' as ModuleRoute,
      title: 'Unbound Recovery',
      desc: `${recovery.quits.length} habits tracked · ${recovery.quits.reduce((s, q) => s + (q.urgesLogged || 0), 0)} urges won`,
      icon: ShieldCheck,
      color: '#D3A346',
      score: scores.recoveryScore,
    },
    {
      route: 'finance' as ModuleRoute,
      title: 'Finance Ledger',
      desc: `${finance.accounts.length} accounts · Net worth ${fmtNaira(totalFinanceNetWorthKobo)}`,
      icon: Wallet,
      color: '#4FA9E0',
      score: scores.financeScore,
    },
    {
      route: 'checkin' as ModuleRoute,
      title: 'Pulse Check-in',
      desc: `${pulse.logs.length} check-ins · ${pulse.habits.length} habits tracked`,
      icon: Activity,
      color: '#F0A8C4',
      score: scores.checkinScore,
    },
    {
      route: 'goals' as ModuleRoute,
      title: 'Goals & Targets',
      desc: `${goals.goals.filter(g => !g.archived).length} active goals`,
      icon: Target,
      color: '#E8B368',
      score: scores.goalsScore,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Hero Summary Ribbon */}
      <div
        className="rounded-3xl p-6 border shadow-sm relative overflow-hidden"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded-full"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                }}
              >
                Personal Health Index · {composite}/100
              </span>
              <span className="text-xs text-on-surface-variant">Live alignment</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-on-surface tracking-tight">
              Systems are executing with steady momentum.
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Your 6 modules (Journal, Study, Recovery, Finance, Pulse, and Goals) are synced. Consistency across sleep and study is driving peak recall performance this week.
            </p>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => {
                const text = `🌿 Meridian Scorecard (${todayStr()}): Composite Index ${composite}/100 · Study ${scores.studyScore}/100 · Recovery ${scores.recoveryScore}/100 · Pulse ${scores.checkinScore}/100 · 100% Offline Android APK`;
                NativeAndroid.shareContent('Meridian Daily Scorecard', text);
              }}
              type="button"
              title="Share via Android ShareSheet"
              className="px-3.5 py-2 text-xs font-semibold rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 active:scale-95 text-on-surface"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Share Digest</span>
            </button>
            <button
              onClick={() => onNavigate('timeline')}
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Unified Feed →
            </button>
            <button
              onClick={onOpenQuickAdd}
              type="button"
              className="px-5 py-2 text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-1.5 transform active:scale-95"
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Quick Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Move Recommendation Card */}
      <div
        onClick={() => onNavigate(todaysMove.route as ModuleRoute)}
        className="p-5 rounded-3xl border transition-all hover:scale-[1.005] cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 m3-ripple"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-lg"
            style={{
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
            }}
          >
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-primary">
                Today&apos;s Highest Leverage Move
              </span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-on-surface-variant font-mono">
                {todaysMove.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-on-surface mt-0.5">
              {todaysMove.recommendation}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-4 py-1.5 text-xs font-bold rounded-full shrink-0 flex items-center gap-1"
          style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          <span>Open {todaysMove.label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Weekly Scoreboard (6 System Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface-variant">
            This Week vs Last Week (Box Score)
          </h3>
          <span className="text-xs font-mono text-on-surface-variant">7-day delta comparison</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {scoreboard.map(row => (
            <div
              key={row.key}
              onClick={() => onNavigate(row.key as ModuleRoute)}
              className="p-3.5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer text-center flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold truncate">
                {row.label}
              </div>
              <div className="text-base font-bold font-mono my-1 text-on-surface">
                {row.fmt(row.thisVal)}
              </div>
              <div
                className={`text-[10.5px] font-mono font-semibold flex items-center justify-center gap-1 ${
                  row.direction === 'pos'
                    ? 'text-emerald-400'
                    : row.direction === 'neg'
                    ? 'text-rose-400'
                    : 'text-on-surface-variant'
                }`}
              >
                <span>{row.direction === 'pos' ? '▲' : row.direction === 'neg' ? '▼' : '—'}</span>
                <span>{row.lastVal !== 0 ? Math.abs(row.pct) + '%' : (row.thisVal > 0 ? 'new' : '0%')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Activity Matrix & Range Controls */}
      <div
        className="p-6 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-display">Cross-System Activity Matrix</h3>
            <p className="text-xs text-on-surface-variant">Click any day cell to view all logs recorded on that date</p>
          </div>
          {/* Range pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/5 dark:bg-white/5 border border-outline-variant">
            {[30, 60, 90, 140].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded-full transition-all ${
                  rangeDays === d
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1 min-w-max">
            {activityMatrix.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((cell, di) => {
                  const isToday = cell.dateStr === todayStr();
                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={cell.isFuture}
                      onClick={() => onOpenDayDetail(cell.dateStr)}
                      title={`${fmtDateShort(cell.dateStr)}: ${cell.isActive ? 'Active system logs' : 'No logs'}`}
                      className={`w-3.5 h-3.5 rounded-[4px] transition-all ${
                        cell.isFuture
                          ? 'opacity-20 bg-black/10 dark:bg-white/10 cursor-default'
                          : cell.isActive
                          ? 'bg-emerald-400 hover:scale-125 hover:ring-2 ring-emerald-300'
                          : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'
                      } ${isToday ? 'ring-1 ring-primary ring-offset-1 ring-offset-surface' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant mt-3 px-1">
            <span>{fmtDateShort(daysAgoStr(rangeDays))}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-black/10 dark:bg-white/10 inline-block" />
                <span>No logs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-400 inline-block" />
                <span>Logged</span>
              </span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 5. Systems Roster & Life Balance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Systems Roster */}
        <div
          className="p-6 rounded-3xl border space-y-4"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display">System Modules (6)</h3>
            <span className="text-xs font-mono text-on-surface-variant">Tap to jump in</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systems.map(sys => {
              const Icon = sys.icon;
              return (
                <div
                  key={sys.route}
                  onClick={() => onNavigate(sys.route)}
                  className="p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-3 group"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: sys.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                      {sys.score}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-display text-on-surface group-hover:text-primary transition-colors">
                      {sys.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{sys.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume vs Consistency & Alignment */}
        <div
          className="p-6 rounded-3xl border space-y-5"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display">Volume vs Consistency</h3>
              <p className="text-xs text-on-surface-variant">Regularity across 3 key disciplines</p>
            </div>
            <button
              onClick={() => setIsWeightModalOpen(true)}
              type="button"
              className="p-2 rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 text-xs flex items-center gap-1 text-on-surface-variant"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Weights</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Journal Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span>Journal Reflection</span>
                <span className="font-mono">{journalConsistency}% consistency</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${journalConsistency}%` }} />
              </div>
            </div>

            {/* Study Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span>Study & Curriculum Output</span>
                <span className="font-mono">{studyConsistency}% consistency</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${studyConsistency}%` }} />
              </div>
            </div>

            {/* Pulse Check-in Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span>Pulse Habit Tracking</span>
                <span className="font-mono">{pulseConsistency}% consistency</span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${pulseConsistency}%` }} />
              </div>
            </div>
          </div>

          {/* Cross correlations prompt */}
          {crossCorrelations.length > 0 && (
            <div className="pt-3 border-t border-outline-variant space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-on-surface-variant">
                Discovered Correlation
              </span>
              {crossCorrelations.slice(0, 2).map((cc, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-on-surface space-y-0.5">
                  <span className="font-bold text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 mr-1.5">
                    {cc.tag}
                  </span>
                  <span>{cc.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Tag Cloud & Personal Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day Tags Cloud */}
        <div
          className="p-6 rounded-3xl border space-y-3.5"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display">Day Tags Explorer</h3>
            <span className="text-xs font-mono text-on-surface-variant">Filter timeline</span>
          </div>
          {sortedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onOpenTimelineWithTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-outline-variant hover:border-primary transition-all flex items-center gap-1.5 m3-ripple"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    color: 'var(--md-sys-color-on-surface)',
                  }}
                >
                  <span>#{tag}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10 dark:bg-white/10 opacity-75">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-on-surface-variant">
              No day tags created yet. Use Quick Add or click any day to tag your sessions.
            </div>
          )}
        </div>

        {/* Personal Records */}
        <div
          className="p-6 rounded-3xl border space-y-3"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display">Personal Records Vault</h3>
            <span className="text-xs font-mono text-on-surface-variant">All-time milestones</span>
          </div>
          <div className="space-y-2">
            {personalRecords.map((rec, i) => (
              <div
                key={i}
                onClick={() => onNavigate(rec.route as ModuleRoute)}
                className="flex items-center justify-between p-3 rounded-2xl border border-outline-variant bg-surface-container-high hover:border-primary cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4" style={{ color: rec.color }} />
                  <span className="text-xs font-semibold">{rec.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono">{rec.value}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-on-surface-variant">
                    {rec.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weights Modal */}
      {isWeightModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setIsWeightModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <h3 className="text-base font-bold font-display">Adjust System Score Weights</h3>
            <p className="text-xs text-on-surface-variant">
              Customize how much each system contributes to your single composite health index.
            </p>

            <div className="space-y-3">
              {(Object.keys(tempWeights) as (keyof SystemWeights)[]).map(k => (
                <div key={k}>
                  <div className="flex justify-between text-xs font-medium mb-1 capitalize">
                    <span>{k}</span>
                    <span className="font-mono">{tempWeights[k].toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.5"
                    value={tempWeights[k]}
                    onChange={e =>
                      setTempWeights(prev => ({
                        ...prev,
                        [k]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-primary"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(false)}
                className="px-4 py-1.5 text-xs rounded-full border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWeights}
                className="px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-on-primary"
              >
                Save Weights
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
