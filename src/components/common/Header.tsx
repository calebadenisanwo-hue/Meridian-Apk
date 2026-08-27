import React from 'react';
import { Search, Plus, Settings2, Lock, Zap } from 'lucide-react';
import { ModuleRoute, MaterialTheme, ThemeMode } from '../../types';
import { THEME_PALETTES } from '../../theme/materialYou';
import { Haptics } from '../../services/haptics';
import { getPowerSettings, getBiometricSettings } from '../../services/storage';
import { SettingsTab } from './SettingsModal';

interface HeaderProps {
  currentRoute: ModuleRoute;
  themePalette?: MaterialTheme;
  themeMode?: ThemeMode;
  onNavigate?: (route: ModuleRoute) => void;
  onOpenCmdk?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenQuickAdd?: () => void;
  onOpenSettings?: (tab?: SettingsTab) => void;
  onLockApp?: () => void;
}

const ROUTE_INFO: Record<ModuleRoute, { title: string; subtitle: string; badge: string }> = {
  overview: {
    title: 'Meridian Overview',
    subtitle: 'Unified Personal Operating System · Live Read Across All Modules',
    badge: 'System Core',
  },
  timeline: {
    title: 'Unified Timeline',
    subtitle: 'Chronological timeline of reflections, deep work, financial movements & milestones',
    badge: 'Chronology',
  },
  journal: {
    title: 'Mindful Journal',
    subtitle: 'High-signal daily reflections, intentional thoughts and tag-filtered entries',
    badge: 'Module 01',
  },
  study: {
    title: 'Study & Curriculum Ledger',
    subtitle: '200L Medical syllabus engine, focused sprint timer and active recall mastery',
    badge: 'Module 02',
  },
  recovery: {
    title: 'Unbound Recovery',
    subtitle: 'Habit cessation engine, clean streak timer and milestone medallion vault',
    badge: 'Module 03',
  },
  finance: {
    title: 'Finance Ledger',
    subtitle: 'Multi-account asset balances, budget thresholds and cash flow analytics',
    badge: 'Module 04',
  },
  checkin: {
    title: 'Pulse Check-in',
    subtitle: 'Sleep duration, energy tracking, mood balance and daily habit commitments',
    badge: 'Module 05',
  },
  goals: {
    title: 'Goals & Targets',
    subtitle: 'Active milestone tracking, step progress logs and streak accountability',
    badge: 'Module 06',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  themePalette = 'botanical',
  themeMode,
  onNavigate,
  onOpenCmdk,
  onOpenCommandPalette,
  onOpenQuickAdd,
  onOpenSettings,
  onLockApp,
}) => {
  const info = ROUTE_INFO[currentRoute] || ROUTE_INFO.overview;

  const powerSettings = getPowerSettings();
  const bioSettings = getBiometricSettings();

  const handleOpenSearch = () => {
    Haptics.selection();
    (onOpenCmdk || onOpenCommandPalette)?.();
  };

  const handleOpenSettingsModal = (tab?: SettingsTab) => {
    Haptics.selection();
    onOpenSettings?.(tab);
  };

  const handleQuickAdd = () => {
    Haptics.light();
    onOpenQuickAdd?.();
  };

  return (
    <header className="sticky top-0 z-30 px-4 md:px-8 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3.5 backdrop-blur-xl border-b transition-colors select-none"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-dim, rgba(18, 20, 15, 0.85))',
        borderColor: 'var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08))',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View title & badge */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-on-surface">
                {info.title}
              </h1>
              <span
                className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                }}
              >
                {info.badge}
              </span>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant line-clamp-1 mt-0.5">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Streamlined controls (Search, Quick Add, Settings) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Material 3 Floating Search Pill */}
          <button
            onClick={handleOpenSearch}
            type="button"
            className="flex items-center gap-2.5 px-3.5 py-2 text-xs md:text-sm rounded-full border shadow-sm transition-all m3-ripple active:scale-95"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <Search className="w-4 h-4 opacity-75" />
            <span className="hidden sm:inline">Search everything</span>
            <span className="sm:hidden">Search</span>
            <kbd
              className="px-1.5 py-0.5 text-[10px] font-mono rounded border ml-1 font-semibold"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Quick Add FAB button */}
          <button
            onClick={handleQuickAdd}
            type="button"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs md:text-sm font-semibold rounded-full shadow-md transition-all transform active:scale-95"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">Quick Add</span>
          </button>

          {/* Single Unified Settings Menu Button */}
          <button
            onClick={() => handleOpenSettingsModal()}
            title="Settings & Preferences"
            type="button"
            className="p-2 sm:px-3 sm:py-2 rounded-full border flex items-center gap-1.5 text-xs font-medium transition-all m3-ripple active:scale-95 relative"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
            }}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
            {powerSettings.lowPowerMode && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1 sm:static sm:w-auto sm:h-auto sm:bg-amber-500/20 sm:text-amber-400 sm:text-[9px] sm:font-bold sm:px-1.5 sm:rounded-full flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 hidden sm:inline" />
                <span className="hidden sm:inline">Saver</span>
              </span>
            )}
          </button>

          {/* Quick Lock Button if Biometrics Enabled */}
          {bioSettings.enabled && (
            <button
              onClick={() => {
                Haptics.warning();
                onLockApp?.();
              }}
              title="Lock App with Biometrics"
              type="button"
              className="p-2 rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 transition-all text-on-surface-variant hover:text-red-400 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
