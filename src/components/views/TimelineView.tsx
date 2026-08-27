import React, { useState, useMemo } from 'react';
import {
  Clock,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Wallet,
  Activity,
  Target,
  Tag,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ModuleRoute } from '../../types';
import {
  MeridianStorage,
  fmtDateShort,
  fmtNaira,
  formatLocalDate,
  daysAgoStr,
} from '../../services/storage';

interface TimelineViewProps {
  initialTagFilter?: string | null;
  onNavigate: (route: ModuleRoute) => void;
  onOpenDayDetail: (date: string) => void;
  onOpenQuickAdd: () => void;
}

interface TimelineItem {
  id: string;
  date: string;
  timestamp: number;
  module: ModuleRoute;
  title: string;
  subtitle?: string;
  badge?: string;
  color: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  initialTagFilter,
  onNavigate,
  onOpenDayDetail,
  onOpenQuickAdd,
}) => {
  const [selectedModules, setSelectedModules] = useState<Set<ModuleRoute>>(
    new Set(['journal', 'study', 'recovery', 'finance', 'checkin', 'goals'])
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTagFilter || null);
  const [rangeDays, setRangeDays] = useState<number>(30);

  const dayTagsMap = MeridianStorage.getDayTags();
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(dayTagsMap).forEach(tags => {
      tags.forEach(t => (counts[t] = (counts[t] || 0) + 1));
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [dayTagsMap]);

  // Aggregate all items
  const allTimelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Journal
    const journal = MeridianStorage.getJournal();
    journal.forEach(j => {
      items.push({
        id: `j_${j.id}`,
        date: j.timestamp.slice(0, 10),
        timestamp: new Date(j.timestamp).getTime(),
        module: 'journal',
        title: j.text.slice(0, 120) + (j.text.length > 120 ? '…' : ''),
        subtitle: j.tag ? `#${j.tag}` : undefined,
        color: '#2D6A4F',
      });
    });

    // Study
    const study = MeridianStorage.getStudy();
    study.logs.forEach(l => {
      const subj = study.subjects.find(s => s.id === l.subjectId);
      items.push({
        id: `s_${l.id}`,
        date: l.date,
        timestamp: new Date(l.date + 'T12:00:00').getTime(),
        module: 'study',
        title: l.topic || subj?.name || 'Study Session',
        subtitle: `${l.durationMins}m study block ${l.note ? '· ' + l.note : ''}`,
        badge: subj?.name,
        color: '#22A566',
      });
    });

    // Recovery
    const recovery = MeridianStorage.getRecovery();
    recovery.logs.forEach(l => {
      const q = recovery.quits.find(qq => qq.id === l.quitId);
      items.push({
        id: `r_${l.id}`,
        date: l.date,
        timestamp: new Date(l.date + 'T12:00:00').getTime(),
        module: 'recovery',
        title: `${q?.name || 'Recovery Target'}: ${l.type === 'urge' ? 'Urge Survived (+1)' : 'Timer Reset'}`,
        subtitle: l.note,
        badge: l.type === 'urge' ? 'Victorious' : 'Reset',
        color: '#D3A346',
      });
    });

    // Finance
    const finance = MeridianStorage.getFinance();
    finance.transactions.forEach(t => {
      const acc = finance.accounts.find(a => a.id === t.accountId);
      items.push({
        id: `f_${t.id}`,
        date: t.date,
        timestamp: new Date(t.date + 'T12:00:00').getTime(),
        module: 'finance',
        title: `${t.merchant || t.note || t.type} (${t.type === 'expense' ? '−' : '+'}${fmtNaira(t.amountKobo)})`,
        subtitle: `${acc?.name || 'Account'} · ${t.type}`,
        color: '#4FA9E0',
      });
    });

    // Pulse
    const pulse = MeridianStorage.getPulse();
    pulse.logs.forEach(p => {
      const parts = [];
      if (p.sleepHours != null) parts.push(`${p.sleepHours}h sleep`);
      if (p.mood != null) parts.push(`mood ${p.mood}/5`);
      if (p.energy != null) parts.push(`energy ${p.energy}/5`);
      items.push({
        id: `p_${p.id}`,
        date: p.date,
        timestamp: new Date(p.date + 'T12:00:00').getTime(),
        module: 'checkin',
        title: `Daily Pulse: ${parts.join(' · ') || 'Completed check-in'}`,
        subtitle: p.note,
        color: '#F0A8C4',
      });
    });

    // Goals
    const goals = MeridianStorage.getGoals();
    goals.checkins.forEach(c => {
      const g = goals.goals.find(x => x.id === c.goalId);
      items.push({
        id: `g_${c.id}`,
        date: c.date,
        timestamp: new Date(c.date + 'T12:00:00').getTime(),
        module: 'goals',
        title: `${g?.title || 'Goal'}: +${c.value} progress`,
        subtitle: c.note,
        color: '#E8B368',
      });
    });

    items.sort((a, b) => b.timestamp - a.timestamp);
    return items;
  }, []);

  // Filter items by range, modules and tag
  const filteredGroupedDays = useMemo(() => {
    const cutoff = daysAgoStr(rangeDays);

    const filtered = allTimelineItems.filter(item => {
      if (item.date < cutoff) return false;
      if (!selectedModules.has(item.module)) return false;
      if (selectedTag) {
        const tagsOnDate = dayTagsMap[item.date] || [];
        if (!tagsOnDate.includes(selectedTag)) return false;
      }
      return true;
    });

    // Group by date
    const groups: Record<string, TimelineItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allTimelineItems, rangeDays, selectedModules, selectedTag, dayTagsMap]);

  const toggleModule = (m: ModuleRoute) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const modulePills: { id: ModuleRoute; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'journal', label: 'Journal', icon: BookOpen, color: '#2D6A4F' },
    { id: 'study', label: 'Study', icon: GraduationCap, color: '#22A566' },
    { id: 'recovery', label: 'Recovery', icon: ShieldCheck, color: '#D3A346' },
    { id: 'finance', label: 'Finance', icon: Wallet, color: '#4FA9E0' },
    { id: 'checkin', label: 'Pulse', icon: Activity, color: '#F0A8C4' },
    { id: 'goals', label: 'Goals', icon: Target, color: '#E8B368' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Filters Toolbar */}
      <div
        className="p-5 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-on-surface">
              Timeline Filters
            </h3>
          </div>
          {/* Range pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/5 dark:bg-white/5 border border-outline-variant">
            {[7, 30, 60, 90, 180].map(d => (
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

        {/* Module Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {modulePills.map(m => {
            const Icon = m.icon;
            const isSelected = selectedModules.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModule(m.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                    : 'border-outline-variant text-on-surface-variant opacity-60 hover:opacity-100'
                }`}
              >
                <span style={{ color: isSelected ? 'inherit' : m.color }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Filter Dropdown */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant text-xs">
            <Tag className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="font-medium text-on-surface-variant">Filter by Day Tag:</span>
            <select
              value={selectedTag || ''}
              onChange={e => setSelectedTag(e.target.value || null)}
              className="px-3 py-1.5 rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface text-xs"
            >
              <option value="" className="dark:bg-zinc-800">
                All Tags (No filter)
              </option>
              {allTags.map(([tag, count]) => (
                <option key={tag} value={tag} className="dark:bg-zinc-800">
                  #{tag} ({count})
                </option>
              ))}
            </select>
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-[11px] underline text-primary ml-1"
              >
                Clear tag
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feed list */}
      <div className="space-y-6">
        {filteredGroupedDays.length === 0 ? (
          <div
            className="p-12 text-center rounded-3xl border space-y-3"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <Clock className="w-8 h-8 opacity-40 mx-auto" />
            <p className="text-sm font-medium text-on-surface-variant">
              No activity logs match your current filter settings for the last {rangeDays} days.
            </p>
            <button
              onClick={onOpenQuickAdd}
              type="button"
              className="px-4 py-2 text-xs font-bold rounded-full bg-primary text-on-primary shadow-sm"
            >
              + Quick Add Entry
            </button>
          </div>
        ) : (
          filteredGroupedDays.map(([dateKey, items]) => {
            const tags = dayTagsMap[dateKey] || [];
            const dayOfWeek = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });

            return (
              <div key={dateKey} className="space-y-2">
                {/* Day Header Bar */}
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-display text-on-surface">
                      {fmtDateShort(dateKey)}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant">· {dayOfWeek}</span>
                    {tags.map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.2 rounded-full text-[10.5px] font-mono font-semibold"
                        style={{
                          backgroundColor: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onOpenDayDetail(dateKey)}
                    type="button"
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Day details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Items in this Day */}
                <div
                  className="rounded-3xl border divide-y overflow-hidden shadow-sm"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate(item.module)}
                      className="p-4 flex items-start justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors m3-ripple"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono uppercase font-bold text-on-surface-variant tracking-wider">
                              {item.module}
                            </span>
                            {item.badge && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-on-surface line-clamp-2">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-on-surface-variant line-clamp-1">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-semibold shrink-0 opacity-0 hover:opacity-100 transition-opacity">
                        Open →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
