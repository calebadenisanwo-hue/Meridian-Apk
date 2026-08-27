import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ModuleRoute, MaterialTheme, ThemeMode } from './types';
import { MeridianStorage, getPowerSettings, getBiometricSettings, applyPowerSettingsToDOM } from './services/storage';
import { applyThemeVariables } from './theme/materialYou';
import { Biometrics } from './services/biometrics';
import { Haptics } from './services/haptics';

// Common Components
import { Header } from './components/common/Header';
import { NavigationRail } from './components/common/NavigationRail';
import { CommandPalette } from './components/common/CommandPalette';
import { QuickAddModal } from './components/common/QuickAddModal';
import { SettingsModal, SettingsTab } from './components/common/SettingsModal';
import { DayDetailModal } from './components/common/DayDetailModal';
import { BiometricLockModal } from './components/common/BiometricLockModal';

// Views
import { OverviewView } from './components/views/OverviewView';
import { TimelineView } from './components/views/TimelineView';
import { JournalView } from './components/views/JournalView';
import { StudyView } from './components/views/StudyView';
import { RecoveryView } from './components/views/RecoveryView';
import { FinanceView } from './components/views/FinanceView';
import { PulseView } from './components/views/PulseView';
import { GoalsView } from './components/views/GoalsView';

export default function App() {
  // Navigation Route (checks URL search param for Android home-screen shortcuts)
  const [currentRoute, setCurrentRoute] = useState<ModuleRoute>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const routeParam = urlParams.get('route') as ModuleRoute;
      const validRoutes: ModuleRoute[] = ['overview', 'timeline', 'journal', 'study', 'recovery', 'finance', 'checkin', 'goals'];
      if (routeParam && validRoutes.includes(routeParam)) {
        return routeParam;
      }
    } catch {}
    return 'overview';
  });

  // Biometric Lock Screen state
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const bioSettings = getBiometricSettings();
    return Boolean(bioSettings.enabled && bioSettings.lockOnLaunch);
  });
  const [lockedModuleTarget, setLockedModuleTarget] = useState<ModuleRoute | null>(null);

  // Theme configuration
  const [themePalette, setThemePalette] = useState<MaterialTheme>(() => MeridianStorage.getThemeConfig().palette);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => MeridianStorage.getThemeConfig().mode);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsTab>('appearance');
  const [selectedDayDetailDate, setSelectedDayDetailDate] = useState<string | null>(null);
  const [timelineInitialTag, setTimelineInitialTag] = useState<string | null>(null);

  const handleOpenSettings = (tab: SettingsTab = 'appearance') => {
    Haptics.selection();
    setSettingsModalTab(tab);
    setIsSettingsModalOpen(true);
  };

  // Re-render tick when storage changes
  const [dataVersion, setDataVersion] = useState(0);
  const triggerDataRefresh = useCallback(() => setDataVersion(v => v + 1), []);

  // Initialize Low Power Mode & Performance configs
  useEffect(() => {
    const powerCfg = getPowerSettings();
    applyPowerSettingsToDOM(powerCfg);
  }, []);

  // Dynamic Navigation Badges
  const badges = React.useMemo(() => {
    try {
      const journalCount = MeridianStorage.getJournal().length;
      const recoveryState = MeridianStorage.getRecovery();
      const firstQuit = recoveryState.quits?.[0];
      const daysClean = firstQuit
        ? Math.max(0, Math.floor((Date.now() - firstQuit.quitTimestamp) / (1000 * 60 * 60 * 24)))
        : 0;
      const goalsState = MeridianStorage.getGoals();
      const activeGoals = (goalsState.goals || []).filter(g => !g.archived).length;

      return {
        journal: journalCount > 0 ? journalCount : '',
        recovery: daysClean > 0 ? `${daysClean}d` : '',
        goals: activeGoals > 0 ? activeGoals : '',
      };
    } catch {
      return {};
    }
  }, [dataVersion]);

  // Apply Material You theme variables & update Android status bar
  useEffect(() => {
    applyThemeVariables(themePalette, themeMode);
    MeridianStorage.saveThemeConfig({ palette: themePalette, mode: themeMode });

    const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const bgColor = isDark ? '#111412' : '#F9FAF7';

    // 1. Web meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', bgColor);
    }

    // 2. Native Capacitor Android Status Bar
    try {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: bgColor }).catch(() => {});
    } catch {}
  }, [themePalette, themeMode]);

  // Background resume auto-lock listener
  useEffect(() => {
    let appStateHandle: any = null;
    let backgroundTime = 0;

    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        const bio = MeridianStorage.getBiometricSettings();
        if (!bio.enabled) return;

        if (!isActive) {
          backgroundTime = Date.now();
        } else if (isActive && backgroundTime > 0) {
          const elapsedMins = (Date.now() - backgroundTime) / (1000 * 60);
          if (elapsedMins >= (bio.lockTimeoutMinutes || 0)) {
            Biometrics.lockSession();
            setIsAppLocked(true);
          }
          backgroundTime = 0;
        }
      }).then(h => {
        appStateHandle = h;
      }).catch(() => {});
    } catch {}

    return () => {
      if (appStateHandle && typeof appStateHandle.remove === 'function') {
        appStateHandle.remove();
      }
    };
  }, []);

  // Android Native Hardware Back Button & Browser History Popstate
  useEffect(() => {
    const isAnyModalOpen =
      isCommandPaletteOpen ||
      isQuickAddOpen ||
      isSettingsModalOpen ||
      Boolean(lockedModuleTarget) ||
      Boolean(selectedDayDetailDate);

    // Push history entry for browser/webview fallback
    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
    }

    const handlePopState = () => {
      if (lockedModuleTarget) setLockedModuleTarget(null);
      else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
      else if (isQuickAddOpen) setIsQuickAddOpen(false);
      else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
      else if (selectedDayDetailDate) setSelectedDayDetailDate(null);
      else if (currentRoute !== 'overview') {
        setCurrentRoute('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Native Capacitor Android Hardware Back Button listener
    let capListenerHandle: any = null;
    try {
      CapApp.addListener('backButton', () => {
        if (lockedModuleTarget) setLockedModuleTarget(null);
        else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        else if (isQuickAddOpen) setIsQuickAddOpen(false);
        else if (isSettingsModalOpen) setIsSettingsModalOpen(false);
        else if (selectedDayDetailDate) setSelectedDayDetailDate(null);
        else if (currentRoute !== 'overview') {
          setCurrentRoute('overview');
        } else {
          CapApp.exitApp();
        }
      }).then(handle => {
        capListenerHandle = handle;
      }).catch(() => {});
    } catch {}

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
        capListenerHandle.remove();
      }
    };
  }, [
    isCommandPaletteOpen,
    isQuickAddOpen,
    isSettingsModalOpen,
    lockedModuleTarget,
    selectedDayDetailDate,
    currentRoute,
  ]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        Haptics.selection();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // 'q' when no input is focused => Quick Add
      else if (
        e.key === 'q' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) &&
        !isCommandPaletteOpen &&
        !isQuickAddOpen &&
        !isAppLocked
      ) {
        e.preventDefault();
        Haptics.light();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isQuickAddOpen, isAppLocked]);

  // Protected route navigator (checks Biometric lock)
  const handleNavigate = (route: ModuleRoute) => {
    Haptics.selection();
    const bio = MeridianStorage.getBiometricSettings();
    const isSensitive = ['journal', 'recovery', 'finance'].includes(route);

    if (bio.enabled && bio.lockSensitiveModules && isSensitive && !Biometrics.isSessionUnlocked) {
      setLockedModuleTarget(route);
    } else {
      setCurrentRoute(route);
    }
  };

  const handleSelectTheme = (palette: MaterialTheme, mode: ThemeMode) => {
    Haptics.light();
    setThemePalette(palette);
    setThemeMode(mode);
  };

  const handleOpenTimelineWithTag = (tag: string) => {
    Haptics.selection();
    setTimelineInitialTag(tag);
    setCurrentRoute('timeline');
  };

  const handleLockAppNow = () => {
    Haptics.warning();
    Biometrics.lockSession();
    setIsAppLocked(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-300 select-none"
      style={{
        backgroundColor: 'var(--md-sys-color-surface)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* 1. Desktop Left Navigation Rail & Mobile Bottom Bar */}
      <NavigationRail
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenQuickAdd={() => {
          Haptics.light();
          setIsQuickAddOpen(true);
        }}
        onOpenSettings={(tab) => handleOpenSettings(tab || 'appearance')}
        badges={badges}
      />

      {/* 2. Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {/* Top Header */}
        <Header
          currentRoute={currentRoute}
          themePalette={themePalette}
          themeMode={themeMode}
          onNavigate={handleNavigate}
          onOpenCommandPalette={() => {
            Haptics.selection();
            setIsCommandPaletteOpen(true);
          }}
          onOpenQuickAdd={() => {
            Haptics.light();
            setIsQuickAddOpen(true);
          }}
          onOpenSettings={(tab) => handleOpenSettings(tab || 'appearance')}
          onLockApp={handleLockAppNow}
        />

        {/* View Surface Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute + '_' + dataVersion}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {currentRoute === 'overview' && (
                <OverviewView
                  onNavigate={handleNavigate}
                  onOpenQuickAdd={() => {
                    Haptics.light();
                    setIsQuickAddOpen(true);
                  }}
                  onOpenDayDetail={date => {
                    Haptics.selection();
                    setSelectedDayDetailDate(date);
                  }}
                  onOpenTimelineWithTag={handleOpenTimelineWithTag}
                />
              )}

              {currentRoute === 'timeline' && (
                <TimelineView
                  initialTagFilter={timelineInitialTag}
                  onNavigate={handleNavigate}
                  onOpenDayDetail={date => {
                    Haptics.selection();
                    setSelectedDayDetailDate(date);
                  }}
                  onOpenQuickAdd={() => {
                    Haptics.light();
                    setIsQuickAddOpen(true);
                  }}
                />
              )}

              {currentRoute === 'journal' && <JournalView />}

              {currentRoute === 'study' && <StudyView />}

              {currentRoute === 'recovery' && <RecoveryView />}

              {currentRoute === 'finance' && <FinanceView />}

              {currentRoute === 'checkin' && <PulseView />}

              {currentRoute === 'goals' && <GoalsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Biometric App Lock Modal */}
      <BiometricLockModal
        isOpen={isAppLocked}
        onUnlockSuccess={() => {
          setIsAppLocked(false);
          triggerDataRefresh();
        }}
        reason="Verify fingerprint or face unlock to access Meridian"
      />

      {/* 4. Biometric Module Gate Modal */}
      <BiometricLockModal
        isOpen={Boolean(lockedModuleTarget)}
        onUnlockSuccess={() => {
          if (lockedModuleTarget) {
            setCurrentRoute(lockedModuleTarget);
            setLockedModuleTarget(null);
          }
        }}
        moduleName={lockedModuleTarget ? lockedModuleTarget.toUpperCase() : 'Module'}
        reason={`Authenticate to access sensitive ${lockedModuleTarget || 'module'} data`}
        isDismissable={true}
        onCancel={() => setLockedModuleTarget(null)}
      />

      {/* 5. Global Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          Haptics.light();
          setIsCommandPaletteOpen(false);
        }}
        onNavigate={handleNavigate}
        onOpenQuickAdd={() => {
          Haptics.light();
          setIsQuickAddOpen(true);
        }}
        onOpenSettings={handleOpenSettings}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          Haptics.light();
          setIsQuickAddOpen(false);
        }}
        onSuccess={() => {
          Haptics.success();
          triggerDataRefresh();
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          Haptics.light();
          setIsSettingsModalOpen(false);
          triggerDataRefresh();
        }}
        initialTab={settingsModalTab}
        currentPalette={themePalette}
        currentMode={themeMode}
        onSelectTheme={handleSelectTheme}
        onDataChanged={() => {
          Haptics.success();
          triggerDataRefresh();
        }}
        onLockAppNow={handleLockAppNow}
      />

      <DayDetailModal
        date={selectedDayDetailDate}
        onClose={() => {
          Haptics.light();
          setSelectedDayDetailDate(null);
        }}
        onNavigate={handleNavigate}
        onRefresh={() => {
          Haptics.success();
          triggerDataRefresh();
        }}
      />
    </div>
  );
}
