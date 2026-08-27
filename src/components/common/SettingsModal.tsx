import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Palette,
  ShieldCheck,
  Volume2,
  HardDrive,
  Zap,
  Bell,
  Sun,
  Moon,
  Monitor,
  Check,
  Lock,
  KeyRound,
  Fingerprint,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Settings2,
  Waves,
  Sparkles,
  AlertTriangle,
  Clock,
  Share2,
  Database,
  History,
  FolderOpen,
  Cloud,
} from 'lucide-react';
import { MaterialTheme, ThemeMode, AndroidPowerSettings, BiometricSecuritySettings } from '../../types';
import { THEME_PALETTES } from '../../theme/materialYou';
import { NativeAndroid, AndroidSystemStatus } from '../../services/nativeAndroid';
import { Haptics } from '../../services/haptics';
import { Biometrics, BiometricStatus } from '../../services/biometrics';
import {
  MeridianStorage,
  todayStr,
  getPowerSettings,
  getBiometricSettings,
} from '../../services/storage';
import { computeSystemScores, computeWeightedComposite } from '../../services/metrics';

export type SettingsTab = 'appearance' | 'security' | 'audio' | 'data' | 'power' | 'notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  currentPalette: MaterialTheme;
  currentMode: ThemeMode;
  onSelectTheme: (palette: MaterialTheme, mode: ThemeMode) => void;
  onDataChanged: () => void;
  onLockAppNow?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
  currentPalette,
  currentMode,
  onSelectTheme,
  onDataChanged,
  onLockAppNow,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & notifications
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Security & Biometrics
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [bioSettings, setBioSettings] = useState<BiometricSecuritySettings>(() => getBiometricSettings());
  const [pinInputOpen, setPinInputOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSavedSuccess, setPinSavedSuccess] = useState(false);
  const [testBioResult, setTestBioResult] = useState<string | null>(null);

  // Audio & Soundscapes
  const [isNoisePlaying, setIsNoisePlaying] = useState(false);
  const [focusSoundType, setFocusSoundType] = useState<'binaural' | 'brown' | 'white' | 'rain' | 'forest'>('binaural');

  // Power & Performance
  const [deviceStatus, setDeviceStatus] = useState<AndroidSystemStatus | null>(null);
  const [powerSettings, setPowerSettings] = useState<AndroidPowerSettings>(() => getPowerSettings());

  // Data & Snapshots
  const [dbSummary, setDbSummary] = useState(() => MeridianStorage.getDatabaseSummary());
  const [snapshots, setSnapshots] = useState(() => MeridianStorage.getLocalSnapshots());
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Notifications
  const [reminderTime, setReminderTime] = useState('20:00');
  const [isReminderSaved, setIsReminderSaved] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPowerSettings(getPowerSettings());
      setBioSettings(getBiometricSettings());
      setDbSummary(MeridianStorage.getDatabaseSummary());
      setSnapshots(MeridianStorage.getLocalSnapshots());
      setTestBioResult(null);
      NativeAndroid.getSystemStatus().then(setDeviceStatus);
      Biometrics.checkBiometricStatus().then(setBiometricStatus);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // ------------------------------------
  // Appearance Handlers
  // ------------------------------------
  const handleThemeChange = (palette: MaterialTheme, mode: ThemeMode) => {
    Haptics.selection();
    onSelectTheme(palette, mode);
  };

  // ------------------------------------
  // Security Handlers
  // ------------------------------------
  const handleToggleBiometrics = async () => {
    Haptics.medium();
    if (!bioSettings.enabled) {
      const res = await Biometrics.authenticate('Authorize biometric security for Meridian');
      if (res.success) {
        const updated: BiometricSecuritySettings = {
          ...bioSettings,
          enabled: true,
          lockOnLaunch: true,
        };
        setBioSettings(updated);
        MeridianStorage.saveBiometricSettings(updated);
        setStatusMessage({ text: 'Biometric lock enabled.' });
      } else {
        setTestBioResult(res.error || 'Biometric enrollment failed');
      }
    } else {
      const updated: BiometricSecuritySettings = {
        ...bioSettings,
        enabled: false,
        lockOnLaunch: false,
      };
      setBioSettings(updated);
      MeridianStorage.saveBiometricSettings(updated);
      Haptics.warning();
    }
  };

  const handleToggleSensitiveLock = () => {
    Haptics.light();
    const updated: BiometricSecuritySettings = {
      ...bioSettings,
      lockSensitiveModules: !bioSettings.lockSensitiveModules,
    };
    setBioSettings(updated);
    MeridianStorage.saveBiometricSettings(updated);
  };

  const handleSavePin = () => {
    if (newPin.length === 4) {
      Biometrics.setPIN(newPin);
      setBioSettings(MeridianStorage.getBiometricSettings());
      setPinSavedSuccess(true);
      setPinInputOpen(false);
      setNewPin('');
      setTimeout(() => setPinSavedSuccess(false), 2500);
    }
  };

  const handleTestBiometricPrompt = async () => {
    Haptics.medium();
    setTestBioResult('Prompting...');
    const res = await Biometrics.authenticate('Test Biometric Verification');
    if (res.success) {
      setTestBioResult('✅ Biometric verified successfully!');
      setTimeout(() => setTestBioResult(null), 3000);
    } else {
      setTestBioResult(`❌ ${res.error || 'Authentication unverified'}`);
    }
  };

  // ------------------------------------
  // Audio Handlers
  // ------------------------------------
  const handleToggleFocusNoise = () => {
    Haptics.selection();
    if (isNoisePlaying) {
      NativeAndroid.stopFocusNoise();
      setIsNoisePlaying(false);
    } else {
      NativeAndroid.startFocusNoise(focusSoundType as any);
      setIsNoisePlaying(true);
    }
  };

  const handleSelectSoundType = (type: 'binaural' | 'brown' | 'white' | 'rain' | 'forest') => {
    Haptics.light();
    setFocusSoundType(type);
    if (isNoisePlaying) {
      NativeAndroid.stopFocusNoise();
      NativeAndroid.startFocusNoise(type as any);
    }
  };

  const handlePlayTibetanBowl = () => {
    Haptics.medium();
    NativeAndroid.playTibetanBowl();
  };

  const handlePlayCelebration = () => {
    Haptics.success();
    NativeAndroid.playMilestoneCelebration();
  };

  // ------------------------------------
  // Data / Android Storage & Backup Handlers
  // ------------------------------------
  const handleShareToGoogleDriveOrSystem = async () => {
    Haptics.selection();
    const jsonStr = MeridianStorage.exportFullBackup();
    const filename = `meridian-backup-${todayStr()}.json`;
    const res = await NativeAndroid.shareOrSaveBackupFile(jsonStr, filename);
    setStatusMessage({ text: res.message, isError: !res.success });
  };

  const handleExportJSON = () => {
    Haptics.selection();
    const jsonStr = MeridianStorage.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'Backup downloaded to device.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const ok = MeridianStorage.importFullBackup(content);
        if (ok) {
          setStatusMessage({ text: 'Database restored successfully!' });
          setDbSummary(MeridianStorage.getDatabaseSummary());
          setSnapshots(MeridianStorage.getLocalSnapshots());
          onDataChanged();
        } else {
          setStatusMessage({ text: 'Import failed: Invalid backup format', isError: true });
        }
      } catch (err: any) {
        setStatusMessage({ text: `Invalid file format: ${err.message}`, isError: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateSnapshot = () => {
    Haptics.success();
    MeridianStorage.createLocalSnapshot(newSnapshotLabel.trim() || undefined);
    setSnapshots(MeridianStorage.getLocalSnapshots());
    setNewSnapshotLabel('');
    setIsCreatingSnapshot(false);
    setStatusMessage({ text: 'Point-in-time snapshot created successfully!' });
  };

  const handleRestoreSnapshot = (id: string) => {
    Haptics.medium();
    const ok = MeridianStorage.restoreLocalSnapshot(id);
    if (ok) {
      setStatusMessage({ text: 'Snapshot restored successfully!' });
      setDbSummary(MeridianStorage.getDatabaseSummary());
      onDataChanged();
    } else {
      setStatusMessage({ text: 'Failed to restore snapshot', isError: true });
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    Haptics.light();
    MeridianStorage.deleteLocalSnapshot(id);
    setSnapshots(MeridianStorage.getLocalSnapshots());
    setStatusMessage({ text: 'Snapshot deleted.' });
  };

  const handleReset = () => {
    MeridianStorage.resetAllData();
    setConfirmReset(false);
    setDbSummary(MeridianStorage.getDatabaseSummary());
    setSnapshots([]);
    onDataChanged();
    onClose();
  };

  // ------------------------------------
  // Power & Performance Handlers
  // ------------------------------------
  const handleToggleLowPowerMode = () => {
    Haptics.light();
    const nextState = !powerSettings.lowPowerMode;
    const updated: AndroidPowerSettings = {
      ...powerSettings,
      lowPowerMode: nextState,
      disableAnimations: nextState ? true : powerSettings.disableAnimations,
      reduceSamplingRate: nextState ? true : powerSettings.reduceSamplingRate,
    };
    setPowerSettings(updated);
    MeridianStorage.savePowerSettings(updated);
    if (nextState) Haptics.warning();
    else Haptics.success();
  };

  const handleToggleAnimations = () => {
    Haptics.light();
    const updated: AndroidPowerSettings = {
      ...powerSettings,
      disableAnimations: !powerSettings.disableAnimations,
    };
    setPowerSettings(updated);
    MeridianStorage.savePowerSettings(updated);
  };

  const handleSetHapticsIntensity = (intensity: AndroidPowerSettings['hapticsIntensity']) => {
    const updated: AndroidPowerSettings = {
      ...powerSettings,
      hapticsIntensity: intensity,
    };
    setPowerSettings(updated);
    MeridianStorage.savePowerSettings(updated);
    if (intensity === 'subtle') Haptics.light();
    else if (intensity === 'standard') Haptics.medium();
    else if (intensity === 'strong') Haptics.success();
  };

  // ------------------------------------
  // Notifications Handlers
  // ------------------------------------
  const handleScheduleReminder = async () => {
    Haptics.light();
    const [h, m] = reminderTime.split(':').map(Number);
    const success = await NativeAndroid.scheduleDailyReminder(h || 20, m || 0);
    if (success) {
      setIsReminderSaved(true);
      setTimeout(() => setIsReminderSaved(false), 3000);
    }
  };

  const handleTestNotification = async () => {
    Haptics.medium();
    NativeAndroid.playTibetanBowl();
    await NativeAndroid.scheduleTimerFinishedNotification(
      '🌿 Meridian System Alert',
      'Daily pulse reminders & audio feedback are functioning normally.',
      2
    );
  };

  const handleShareDailyReport = async () => {
    Haptics.light();
    const journal = MeridianStorage.getJournal();
    const study = MeridianStorage.getStudy();
    const recovery = MeridianStorage.getRecovery();
    const finance = MeridianStorage.getFinance();
    const pulse = MeridianStorage.getPulse();
    const goals = MeridianStorage.getGoals();
    const weights = MeridianStorage.getWeights();

    const scores = computeSystemScores(journal, study, recovery, finance, pulse, goals);
    const composite = computeWeightedComposite(scores, weights);

    const firstQuit = recovery.quits?.[0];
    const daysClean = firstQuit
      ? Math.max(0, Math.floor((Date.now() - firstQuit.quitTimestamp) / (1000 * 60 * 60 * 24)))
      : 0;

    const summaryText = `🌿 Meridian Personal OS — Daily Digest (${todayStr()})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⭐ Composite Index: ${composite}/100\n` +
      `📚 Study Retention: ${scores.studyScore}/100\n` +
      `🛡️ Recovery Streak: ${daysClean} days clean (${scores.recoveryScore}/100)\n` +
      `💓 Pulse Wellbeing: ${scores.checkinScore}/100\n` +
      `🎯 Active Targets: ${goals.goals.filter(g => !g.archived).length} in progress\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;

    const shared = await NativeAndroid.shareContent('Meridian Daily Digest', summaryText);
    if (shared) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  const navTabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security & PIN', icon: ShieldCheck },
    { id: 'audio', label: 'Audio & Synth', icon: Volume2 },
    { id: 'data', label: 'Data & Storage Hub', icon: HardDrive },
    { id: 'power', label: 'Power & Performance', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/65 animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          Haptics.light();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-on-surface">
                Settings & Preferences
              </h2>
              <p className="text-xs text-on-surface-variant">
                Offline Android system storage, Material You themes, biometrics & audio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Scrollable on mobile) */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-outline-variant bg-surface-container-high/50 overflow-x-auto no-scrollbar touch-pan-x text-xs font-semibold">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  Haptics.selection();
                  setActiveTab(tab.id);
                  setStatusMessage(null);
                }}
                className={`px-3.5 py-2 rounded-full flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status feedback message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                statusMessage.isError
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {statusMessage.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Light / Dark Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-on-surface-variant mb-2.5">
                  Surface Lighting
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light' as ThemeMode, label: 'Light', icon: Sun },
                    { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
                    { id: 'system' as ThemeMode, label: 'System', icon: Monitor },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = currentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleThemeChange(currentPalette, m.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                            : 'border-outline-variant text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palettes Grid */}
              <div>
                <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-on-surface-variant mb-2.5">
                  Material 3 Tonal Seed Palette
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(THEME_PALETTES) as MaterialTheme[]).map((key) => {
                    const pal = THEME_PALETTES[key];
                    const isSelected = currentPalette === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleThemeChange(key, currentMode)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left group ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-surface-container-high shadow-md'
                            : 'border-outline-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1.5">
                            <span
                              className="w-5 h-5 rounded-full border border-surface shadow-xs"
                              style={{ backgroundColor: pal.light.primary }}
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-surface shadow-xs"
                              style={{ backgroundColor: pal.light.secondary }}
                            />
                            <span
                              className="w-5 h-5 rounded-full border border-surface shadow-xs"
                              style={{ backgroundColor: pal.light.tertiary }}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-on-surface">{pal.name}</div>
                            <div className="text-[11px] text-on-surface-variant font-mono">
                              {pal.seed}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: 'var(--md-sys-color-primary)',
                              color: 'var(--md-sys-color-on-primary)',
                            }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & BIOMETRICS */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Biometric App Lock Card */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Biometric App Launch Lock</div>
                      <div className="text-[11px] text-on-surface-variant">
                        Require fingerprint, facial scan, or PIN when opening the app
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBiometrics}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      bioSettings.enabled
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-variant text-on-surface-variant border border-outline-variant'
                    }`}
                  >
                    {bioSettings.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {bioSettings.enabled && (
                  <div className="pt-2 border-t border-outline-variant/60 space-y-2.5">
                    {/* Sensitive Modules Gate */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-on-surface">Lock Sensitive Modules</div>
                        <div className="text-[11px] text-on-surface-variant">
                          Require verification to access Journal, Recovery & Finance
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleSensitiveLock}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          bioSettings.lockSensitiveModules
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-surface-variant text-on-surface-variant border border-outline-variant'
                        }`}
                      >
                        {bioSettings.lockSensitiveModules ? 'Active' : 'Off'}
                      </button>
                    </div>

                    {/* Auto-Lock Inactivity Period */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-semibold text-on-surface">Auto-Lock Inactivity Period</div>
                        <div className="text-[11px] text-on-surface-variant">
                          Lock when idle or placed into the background
                        </div>
                      </div>
                      <select
                        value={bioSettings.lockTimeoutMinutes}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...bioSettings, lockTimeoutMinutes: val };
                          setBioSettings(updated);
                          MeridianStorage.saveBiometricSettings(updated);
                        }}
                        className="px-2.5 py-1 text-xs rounded-xl bg-surface border border-outline-variant font-mono"
                      >
                        <option value={0}>Immediate</option>
                        <option value={1}>1 Minute</option>
                        <option value={5}>5 Minutes</option>
                        <option value={15}>15 Minutes</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* PIN / Passkey Management */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Passkey & PIN Fallback</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {bioSettings.hasPINFallback ? 'Custom 4-digit PIN is configured' : 'Using default PIN (0000)'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPinInputOpen(!pinInputOpen)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-outline-variant hover:bg-surface-variant text-on-surface"
                  >
                    {pinInputOpen ? 'Cancel' : 'Change PIN'}
                  </button>
                </div>

                {pinInputOpen && (
                  <div className="pt-2 border-t border-outline-variant/60 space-y-2">
                    <label className="text-[11px] font-semibold text-on-surface">Enter New 4-Digit Security PIN</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-28 px-3 py-1.5 text-center text-sm font-mono tracking-widest rounded-xl bg-surface border border-outline-variant"
                      />
                      <button
                        type="button"
                        disabled={newPin.length !== 4}
                        onClick={handleSavePin}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-primary text-on-primary disabled:opacity-40"
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>
                )}

                {pinSavedSuccess && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Security PIN updated successfully!</span>
                  </div>
                )}
              </div>

              {/* Immediate Lock & Verification Testing */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestBiometricPrompt}
                  className="py-2.5 px-3 rounded-2xl border border-outline-variant hover:bg-surface-container-high text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>Test Biometrics</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    Haptics.warning();
                    onClose();
                    onLockAppNow?.();
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock App Now</span>
                </button>
              </div>

              {testBioResult && (
                <div className="text-xs text-on-surface-variant font-mono p-2.5 rounded-xl bg-surface border border-outline-variant">
                  {testBioResult}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO & SYNTH */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Waves className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Ambient Focus Soundscapes</div>
                      <div className="text-[11px] text-on-surface-variant">
                        Synthesizer engine for deep medical study sprints and focus
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleFocusNoise}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isNoisePlaying
                        ? 'bg-emerald-500 text-black shadow-sm animate-pulse'
                        : 'bg-primary text-on-primary'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isNoisePlaying ? 'Playing Focus Noise' : 'Start Focus Audio'}</span>
                  </button>
                </div>

                {/* Soundscape Type Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-outline-variant/60">
                  {[
                    { id: 'binaural' as const, label: 'Alpha Flow (10Hz)' },
                    { id: 'brown' as const, label: 'Deep Brown Noise' },
                    { id: 'white' as const, label: 'Soft White Noise' },
                    { id: 'rain' as const, label: 'Night Rainfall' },
                    { id: 'forest' as const, label: 'Zen Forest Winds' },
                  ].map((s) => {
                    const isSelected = focusSoundType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSoundType(s.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          isSelected
                            ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                            : 'border-outline-variant hover:bg-surface text-on-surface-variant'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Chimes & Milestones */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="text-xs font-bold text-on-surface">Audio Chimes & Feedback</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePlayTibetanBowl}
                    className="p-3 rounded-xl border border-outline-variant hover:bg-surface text-xs font-semibold flex items-center justify-center gap-2 text-on-surface"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Tibetan Bell Chime</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayCelebration}
                    className="p-3 rounded-xl border border-outline-variant hover:bg-surface text-xs font-semibold flex items-center justify-center gap-2 text-on-surface"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Milestone Fanfare</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & ANDROID STORAGE HUB */}
          {activeTab === 'data' && (
            <div className="space-y-5">
              {/* Database Overview Card */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Local Database Status</div>
                      <div className="text-[10px] text-on-surface-variant">100% Offline & Private on Device</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Encrypted LocalStorage
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-outline-variant/60">
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.journalCount}</div>
                    <div className="text-[10px] text-on-surface-variant">Journals</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.studySprintCount}</div>
                    <div className="text-[10px] text-on-surface-variant">Sprints</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.recoveryDays}d</div>
                    <div className="text-[10px] text-on-surface-variant">Recovery</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.financeCount}</div>
                    <div className="text-[10px] text-on-surface-variant">Finances</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.checkinCount}</div>
                    <div className="text-[10px] text-on-surface-variant">Check-ins</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-outline-variant text-center">
                    <div className="text-xs font-bold text-on-surface">{dbSummary.goalCount}</div>
                    <div className="text-[10px] text-on-surface-variant">Goals</div>
                  </div>
                </div>
              </div>

              {/* Android Native Google Drive & File Backup */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-on-surface">Android System & Google Drive Backup</div>
                    <div className="text-[11px] text-on-surface-variant">
                      Uses Android&apos;s native share &amp; file picker — no manual OAuth Client ID setup required
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Share to Google Drive / Files */}
                  <button
                    type="button"
                    onClick={handleShareToGoogleDriveOrSystem}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Save to Google Drive / Files</span>
                  </button>

                  {/* Import from Google Drive / Files SAF */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-outline-variant hover:bg-surface text-on-surface text-xs font-bold transition-all active:scale-95"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>Import from Drive / Device</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,application/json"
                    className="hidden"
                  />
                </div>

                {/* Direct Download fallback */}
                <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant">Or download JSON directly to device storage:</span>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Direct Download</span>
                  </button>
                </div>
              </div>

              {/* Point-in-Time Local Snapshots Vault */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-on-surface">Local Point-in-Time Snapshots</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
                    className="px-3 py-1 text-xs font-bold rounded-xl bg-primary text-on-primary"
                  >
                    {isCreatingSnapshot ? 'Cancel' : '+ Create Snapshot'}
                  </button>
                </div>

                {isCreatingSnapshot && (
                  <div className="p-3 rounded-xl bg-surface border border-outline-variant space-y-2">
                    <label className="text-[11px] font-semibold text-on-surface">Snapshot Label (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., Pre-exam study sprint backup"
                        value={newSnapshotLabel}
                        onChange={(e) => setNewSnapshotLabel(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSnapshot}
                        className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {snapshots.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-2">
                    No point-in-time snapshots created yet. Create one before making major study or finance edits!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-2.5 rounded-xl bg-surface border border-outline-variant/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-on-surface">{snap.label}</div>
                          <div className="text-[10px] text-on-surface-variant">
                            {new Date(snap.timestamp).toLocaleDateString()} at {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {snap.summary?.journalCount || 0} journals, {snap.summary?.studySprintCount || 0} sprints
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRestoreSnapshot(snap.id)}
                            className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container font-semibold text-[11px] hover:bg-primary hover:text-on-primary transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1 rounded-lg text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wipe & Reset Database */}
              <div className="pt-2 border-t border-outline-variant">
                {confirmReset ? (
                  <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 space-y-2">
                    <p className="text-xs font-semibold text-red-400">
                      Wipe all local data and reset to a clean slate?
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1 text-xs rounded-full border border-outline-variant"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white"
                      >
                        Yes, Wipe Database
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe & Reset Local Database</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: POWER & PERFORMANCE */}
          {activeTab === 'power' && (
            <div className="space-y-4">
              {/* Battery & Power Saver */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Low Power Mode</div>
                      <div className="text-[11px] text-on-surface-variant">
                        Throttles animations and reduces background sampling to extend battery life
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleLowPowerMode}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      powerSettings.lowPowerMode
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'bg-surface-variant text-on-surface-variant border border-outline-variant'
                    }`}
                  >
                    {powerSettings.lowPowerMode ? 'Active' : 'Off'}
                  </button>
                </div>

                <div className="pt-2 border-t border-outline-variant/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Disable UI Transitions</div>
                      <div className="text-[10px] text-on-surface-variant">Instant cuts without GPU blending</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAnimations}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        powerSettings.disableAnimations
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-surface-variant text-on-surface-variant border border-outline-variant'
                      }`}
                    >
                      {powerSettings.disableAnimations ? 'Disabled' : 'Enabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Haptic Feedback */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-2.5">
                <div className="text-xs font-bold text-on-surface">Haptic Vibration Feedback</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['off', 'subtle', 'standard', 'strong'] as const).map((lvl) => {
                    const isSelected = powerSettings.hapticsIntensity === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleSetHapticsIntensity(lvl)}
                        className={`py-2 px-1 rounded-xl border text-xs font-semibold capitalize transition-all ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary'
                            : 'border-outline-variant hover:bg-surface text-on-surface-variant'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Daily Reminder Scheduler */}
              <div className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-on-surface">Daily Pulse Reminder</div>
                    <div className="text-[11px] text-on-surface-variant">
                      Receive an evening notification to log your daily reflection &amp; habits
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/60">
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-surface border border-outline-variant font-mono text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handleScheduleReminder}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary"
                  >
                    Save Schedule
                  </button>
                  {isReminderSaved && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Test Alert & Share */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="py-2.5 px-3 rounded-2xl border border-outline-variant hover:bg-surface text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <span>Test Notification</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareDailyReport}
                  className="py-2.5 px-3 rounded-2xl border border-outline-variant hover:bg-surface text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>{shareSuccess ? 'Shared!' : 'Share Daily Digest'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
