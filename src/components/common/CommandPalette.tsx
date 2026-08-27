import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowRight, BookOpen, GraduationCap, ShieldCheck, Wallet, Activity, Target, Plus, Palette, Download, Sparkles, Smartphone, Settings2, Shield, Volume2, HardDrive, Zap } from 'lucide-react';
import { ModuleRoute } from '../../types';
import { MeridianStorage, fmtNaira, fmtDateShort } from '../../services/storage';
import { SettingsTab } from './SettingsModal';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: ModuleRoute) => void;
  onOpenQuickAdd: () => void;
  onOpenSettings?: (tab?: SettingsTab) => void;
}

interface SearchItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  route?: ModuleRoute;
  action?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenQuickAdd,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openSettings = (tab?: SettingsTab) => {
    onClose();
    onOpenSettings?.(tab);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build searchable database
  const searchItems = useMemo(() => {
    const items: SearchItem[] = [
      // Navigation Shortcuts
      {
        id: 'nav-overview',
        category: 'Navigation',
        title: 'Go to Overview Dashboard',
        subtitle: 'Main health & system status scoreboards',
        route: 'overview',
        icon: Sparkles,
        accentColor: 'var(--md-sys-color-primary)',
      },
      {
        id: 'nav-timeline',
        category: 'Navigation',
        title: 'Go to Unified Timeline',
        subtitle: 'Chronological feed across all 6 systems',
        route: 'timeline',
        icon: Sparkles,
        accentColor: '#C77DFF',
      },
      {
        id: 'nav-journal',
        category: 'Navigation',
        title: 'Go to Mindful Journal',
        subtitle: 'Daily reflections, notes & tags',
        route: 'journal',
        icon: BookOpen,
        accentColor: '#2D6A4F',
      },
      {
        id: 'nav-study',
        category: 'Navigation',
        title: 'Go to Study & Curriculum Ledger',
        subtitle: '200L medical topics & study timer',
        route: 'study',
        icon: GraduationCap,
        accentColor: '#22A566',
      },
      {
        id: 'nav-recovery',
        category: 'Navigation',
        title: 'Go to Unbound Recovery',
        subtitle: 'Sobriety timers & urge survival tracking',
        route: 'recovery',
        icon: ShieldCheck,
        accentColor: '#D3A346',
      },
      {
        id: 'nav-finance',
        category: 'Navigation',
        title: 'Go to Finance Ledger',
        subtitle: 'Account balances, transactions & monthly budgets',
        route: 'finance',
        icon: Wallet,
        accentColor: '#4FA9E0',
      },
      {
        id: 'nav-checkin',
        category: 'Navigation',
        title: 'Go to Pulse Check-in',
        subtitle: 'Daily sleep, energy, mood & habit logs',
        route: 'checkin',
        icon: Activity,
        accentColor: '#F0A8C4',
      },
      {
        id: 'nav-goals',
        category: 'Navigation',
        title: 'Go to Goals & Targets',
        subtitle: 'Active goals and milestone progress',
        route: 'goals',
        icon: Target,
        accentColor: '#E8B368',
      },

      // Quick Actions
      {
        id: 'action-quick-add',
        category: 'Quick Actions',
        title: 'Quick Add Entry...',
        subtitle: 'Create a log into any system instantly',
        action: () => {
          onClose();
          onOpenQuickAdd();
        },
        icon: Plus,
        accentColor: 'var(--md-sys-color-primary)',
      },
      {
        id: 'action-settings-general',
        category: 'Preferences & Settings',
        title: 'Open Settings & Preferences',
        subtitle: 'Themes, biometrics, focus audio, offline sync, and power saver',
        action: () => openSettings('appearance'),
        icon: Settings2,
        accentColor: 'var(--md-sys-color-primary)',
      },
      {
        id: 'action-theme',
        category: 'Preferences & Settings',
        title: 'Customize Material You Theme',
        subtitle: 'Switch tonal seed colors & Dark/Light mode',
        action: () => openSettings('appearance'),
        icon: Palette,
        accentColor: 'var(--md-sys-color-tertiary)',
      },
      {
        id: 'action-security',
        category: 'Preferences & Settings',
        title: 'Security & Biometric Lock Settings',
        subtitle: 'Fingerprint/Face unlock, sensitive module security, and PIN passkeys',
        action: () => openSettings('security'),
        icon: ShieldCheck,
        accentColor: '#4CAF50',
      },
      {
        id: 'action-audio-synth',
        category: 'Preferences & Settings',
        title: 'Focus Audio & Soundscapes',
        subtitle: 'Binaural beats, white/brown noise & meditation bells',
        action: () => openSettings('audio'),
        icon: Volume2,
        accentColor: '#22A566',
      },
      {
        id: 'action-backup',
        category: 'Preferences & Settings',
        title: 'Data Backup & Cloud Sync',
        subtitle: 'Export offline JSON backups, Google Drive & Cloud server sync',
        action: () => openSettings('data'),
        icon: HardDrive,
        accentColor: '#90CAF9',
      },
      {
        id: 'action-power',
        category: 'Preferences & Settings',
        title: 'Power & Performance Settings',
        subtitle: 'Battery saver mode, animations toggle, and haptic feedback intensity',
        action: () => openSettings('power'),
        icon: Zap,
        accentColor: '#FFA726',
      },
    ];

    // Live search in user data
    if (query.trim().length > 0) {
      const q = query.toLowerCase();

      // Journal items
      const journal = MeridianStorage.getJournal();
      journal.forEach(j => {
        if (j.text.toLowerCase().includes(q) || (j.tag && j.tag.toLowerCase().includes(q))) {
          items.push({
            id: `journal-${j.id}`,
            category: 'Journal Entries',
            title: j.text.slice(0, 80) + (j.text.length > 80 ? '…' : ''),
            subtitle: `${fmtDateShort(j.timestamp)} ${j.tag ? '· #' + j.tag : ''}`,
            route: 'journal',
            icon: BookOpen,
            accentColor: '#2D6A4F',
          });
        }
      });

      // Study items
      const study = MeridianStorage.getStudy();
      study.logs.forEach(l => {
        if ((l.topic && l.topic.toLowerCase().includes(q)) || (l.note && l.note.toLowerCase().includes(q))) {
          items.push({
            id: `study-${l.id}`,
            category: 'Study Ledger',
            title: l.topic || 'Study session',
            subtitle: `${l.durationMins} min · ${fmtDateShort(l.date)}`,
            route: 'study',
            icon: GraduationCap,
            accentColor: '#22A566',
          });
        }
      });

      // Recovery items
      const recovery = MeridianStorage.getRecovery();
      recovery.quits.forEach(quit => {
        if (quit.name.toLowerCase().includes(q) || (quit.reason && quit.reason.toLowerCase().includes(q))) {
          items.push({
            id: `recovery-quit-${quit.id}`,
            category: 'Recovery Quits',
            title: quit.name,
            subtitle: quit.reason || 'Active habit target',
            route: 'recovery',
            icon: ShieldCheck,
            accentColor: '#D3A346',
          });
        }
      });

      // Finance items
      const finance = MeridianStorage.getFinance();
      finance.transactions.forEach(t => {
        const desc = t.merchant || t.note || t.type;
        if (desc.toLowerCase().includes(q)) {
          items.push({
            id: `fin-${t.id}`,
            category: 'Finance Transactions',
            title: desc,
            subtitle: `${t.type === 'expense' ? '−' : '+'}${fmtNaira(t.amountKobo)} · ${fmtDateShort(t.date)}`,
            route: 'finance',
            icon: Wallet,
            accentColor: '#4FA9E0',
          });
        }
      });

      // Pulse items
      const pulse = MeridianStorage.getPulse();
      pulse.logs.forEach(pl => {
        if (pl.note && pl.note.toLowerCase().includes(q)) {
          items.push({
            id: `pulse-${pl.id}`,
            category: 'Pulse Check-ins',
            title: pl.note,
            subtitle: `Sleep ${pl.sleepHours || '—'}h · Mood ${pl.mood || '—'}/5 · ${fmtDateShort(pl.date)}`,
            route: 'checkin',
            icon: Activity,
            accentColor: '#F0A8C4',
          });
        }
      });

      // Goals items
      const goals = MeridianStorage.getGoals();
      goals.goals.forEach(g => {
        if (g.title.toLowerCase().includes(q) || (g.note && g.note.toLowerCase().includes(q))) {
          items.push({
            id: `goal-${g.id}`,
            category: 'Goals',
            title: g.title,
            subtitle: `${g.category} · ${g.targetType === 'numeric' ? g.targetValue + ' ' + (g.unit || '') : 'Daily Habit'}`,
            route: 'goals',
            icon: Target,
            accentColor: '#E8B368',
          });
        }
      });
    }

    return items;
  }, [query, onClose, onOpenQuickAdd, onOpenSettings]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return searchItems;
    const q = query.toLowerCase();
    return searchItems.filter(
      item => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [query, searchItems]);

  const handleSelect = (item: SearchItem) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      onNavigate(item.route);
      onClose();
    }
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[12vh] px-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
        onKeyDown={handleKeyNav}
      >
        {/* Search input bar */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
        >
          <Search className="w-5 h-5 opacity-60 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search entries, study logs, transactions, goals, or jump to view..."
            className="flex-1 bg-transparent border-none outline-none text-sm md:text-base placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span
            className="px-2 py-0.5 text-[11px] font-mono rounded border text-on-surface-variant font-semibold"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Search results list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-on-surface-variant">
              No results found for &ldquo;{query}&rdquo;. Try another search keyword.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected ? 'shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'inherit',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: isSelected ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container)',
                      color: isSelected ? 'var(--md-sys-color-on-primary)' : item.accentColor,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-2">
                      <span>{item.title}</span>
                      <span
                        className="px-2 py-0.2 text-[10px] font-mono rounded-full opacity-80"
                        style={{
                          backgroundColor: isSelected ? 'var(--md-sys-color-surface-container)' : 'var(--md-sys-color-surface-container-highest)',
                          color: isSelected ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-variant)',
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs opacity-75 truncate mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'translate-x-1 opacity-100' : 'opacity-0'}`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          className="px-5 py-2.5 border-t text-[11px] font-mono flex items-center justify-between text-on-surface-variant"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="flex items-center gap-3">
            <span><kbd className="font-semibold">↑↓</kbd> Navigate</span>
            <span><kbd className="font-semibold">↵</kbd> Select</span>
          </div>
          <span>Meridian Universal Search</span>
        </div>
      </div>
    </div>
  );
};
