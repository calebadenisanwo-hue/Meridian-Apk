import {
  JournalEntry,
  StudyState,
  RecoveryState,
  FinanceState,
  PulseState,
  GoalsState,
  DayTagsMap,
  SystemScores,
  SystemWeights,
  ScoreboardRow,
  CompositeHistoryEntry,
  MaterialTheme,
  ThemeMode,
  BiometricSecuritySettings,
  AndroidPowerSettings,
} from '../types';
import { MEDICAL_CURRICULUM } from '../data/curriculumData';

const KEYS = {
  journal: 'logbook:entries',
  study: 'medLedgerCleanV2',
  recovery: 'unboundRecoveryV1',
  finance: 'ledgerNgV1',
  checkin: 'meridianCheckinV1',
  goals: 'meridianGoalsV1',
  daytags: 'meridian:daytags',
  weights: 'meridianWeights',
  compositeHistory: 'meridianCompositeHistoryV1',
  themePalette: 'meridian:themePalette',
  themeMode: 'meridian:themeMode',
  biometrics: 'meridian:biometricSecurity',
  power: 'meridian:powerSettings',
  snapshots: 'meridian:local_snapshots',
};

const NON_DATA_KEYS = new Set([KEYS.themePalette, KEYS.themeMode, KEYS.biometrics, KEYS.power, KEYS.snapshots]);

export const RECOVERY_MILESTONES = [
  { days: 1, label: '24 Hours', sub: 'First Day Clean', icon: '🌱' },
  { days: 3, label: '3 Days', sub: 'Physical Peak', icon: '🥉' },
  { days: 7, label: '1 Week', sub: '7 Days Strong', icon: '🥈' },
  { days: 14, label: '2 Weeks', sub: 'Fortitude', icon: '🥇' },
  { days: 30, label: '30 Days', sub: '1 Month Clean', icon: '⭐' },
  { days: 60, label: '60 Days', sub: '2 Months', icon: '✨' },
  { days: 90, label: '90 Days', sub: 'Quarter Year', icon: '🏆' },
  { days: 180, label: '180 Days', sub: 'Half Year', icon: '💎' },
  { days: 365, label: '1 Year', sub: 'Solitaire Medal', icon: '👑' },
  { days: 500, label: '500 Days', sub: 'Mastery', icon: '🔥' },
  { days: 1000, label: '1,000 Days', sub: 'Titanium', icon: '⚡' },
];

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
  }
}

/* Helper date string generators */
export function formatLocalDate(dt = new Date()): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return formatLocalDate(new Date());
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatLocalDate(d);
}

export function fmtDateShort(dOrIso: string): string {
  if (!dOrIso) return '';
  let dt: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dOrIso)) {
    const [y, m, d] = dOrIso.split('-').map(Number);
    dt = new Date(y, m - 1, d);
  } else {
    dt = new Date(dOrIso);
  }
  if (isNaN(dt.getTime())) return dOrIso;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtNaira(kobo: number): string {
  const n = (kobo || 0) / 100;
  const sign = n < 0 ? '-' : '';
  return sign + '₦' + Math.abs(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

/* Default state factories - Clean Slate */
export function getDefaultStudyState(): StudyState {
  const subjects = MEDICAL_CURRICULUM.flatMap(s =>
    s.modules.map((m, mi) => ({
      id: `${s.id}_${mi}`,
      name: `${m.code} — ${m.title}`,
      weeklyTargetMins: m.days.reduce((acc, d) => acc + d.m, 0),
      color: s.id === 'ana' ? '#2D6A4F' : s.id === 'phs' ? '#00796B' : '#D97706',
      categoryId: s.id,
    }))
  );
  return {
    subjects,
    logs: [],
    progress: {
      done: {},
    },
  };
}

export function getDefaultRecoveryState(): RecoveryState {
  return {
    categories: [
      { id: 'substance', name: 'Substance & Nicotine', color: '#E53E3E' },
      { id: 'digital', name: 'Digital & Screen Time', color: '#4FA9E0' },
      { id: 'behavioral', name: 'Behavioral & Habits', color: '#C77DFF' },
      { id: 'dietary', name: 'Dietary & Sugar', color: '#3FBF80' },
      { id: 'custom', name: 'Custom Target', color: '#D3A346' },
    ],
    quits: [],
    logs: [],
  };
}

export function getDefaultFinanceState(): FinanceState {
  return {
    setupComplete: true,
    accounts: [
      { id: 'bank-main', name: 'Primary Bank Account', kind: 'bank', accent: '#22A566', opening: 0, openingDate: todayStr() },
      { id: 'cash-wallet', name: 'Cash Wallet', kind: 'cash', accent: '#C9963A', opening: 0, openingDate: todayStr() },
      { id: 'savings-vault', name: 'Savings Vault', kind: 'savings', accent: '#4FA9E0', opening: 0, openingDate: todayStr() },
      { id: 'investment-portfolio', name: 'Investments & Portfolio', kind: 'investment', accent: '#C77DFF', opening: 0, openingDate: todayStr() },
    ],
    categories: [
      { id: 'exp-food', name: 'Food & Groceries', kind: 'expense', color: '#4FA9E0' },
      { id: 'exp-transport', name: 'Transport & Fuel', kind: 'expense', color: '#E8A33D' },
      { id: 'exp-data', name: 'Data & Utilities', kind: 'expense', color: '#3FBF9F' },
      { id: 'exp-school', name: 'Books & Academic Kit', kind: 'expense', color: '#D3A346' },
      { id: 'exp-health', name: 'Health & Pharmacy', kind: 'expense', color: '#E0574B' },
      { id: 'exp-other', name: 'Miscellaneous', kind: 'expense', color: '#8E9A93' },
      { id: 'inc-salary', name: 'Allowance / Salary', kind: 'income', color: '#7CC576' },
      { id: 'inc-hustle', name: 'Side Project / Consulting', kind: 'income', color: '#4FA9E0' },
      { id: 'inc-invest', name: 'Dividends & Returns', kind: 'income', color: '#C77DFF' },
    ],
    transactions: [],
    budgets: {},
  };
}

export function getDefaultPulseState(): PulseState {
  return {
    habits: [
      { id: 'h1', name: 'Morning Movement & Hydration', createdAt: Date.now(), archived: false },
      { id: 'h2', name: 'Focused Deep Work Sprint', createdAt: Date.now(), archived: false },
      { id: 'h3', name: 'Active Study / Reading Practice', createdAt: Date.now(), archived: false },
      { id: 'h4', name: 'Evening Wind-down & Screen Off', createdAt: Date.now(), archived: false },
    ],
    logs: [],
  };
}

export function getDefaultGoalsState(): GoalsState {
  return {
    categories: [
      { id: 'academic', name: 'Academic & Curriculum', color: '#22A566' },
      { id: 'health', name: 'Health & Conditioning', color: '#F0A8C4' },
      { id: 'financial', name: 'Financial Assets', color: '#4FA9E0' },
      { id: 'mastery', name: 'Skill & Habits', color: '#D3A346' },
    ],
    goals: [],
    checkins: [],
  };
}

export function getDefaultJournalEntries(): JournalEntry[] {
  return [];
}

/* =====================================================================
   MAIN STORAGE CLIENT
===================================================================== */
export class MeridianStorage {
  static getTheme(): { palette: MaterialTheme; mode: ThemeMode } {
    const palette = (localStorage.getItem(KEYS.themePalette) as MaterialTheme) || 'botanical';
    const mode = (localStorage.getItem(KEYS.themeMode) as ThemeMode) || 'dark';
    return { palette, mode };
  }

  static setTheme(palette: MaterialTheme, mode: ThemeMode) {
    localStorage.setItem(KEYS.themePalette, palette);
    localStorage.setItem(KEYS.themeMode, mode);
  }

  /* Journal */
  static getJournal(): JournalEntry[] {
    return readJSON<JournalEntry[]>(KEYS.journal, getDefaultJournalEntries());
  }

  static saveJournal(entries: JournalEntry[]): void {
    writeJSON(KEYS.journal, entries);
  }

  /* Study */
  static getStudy(): StudyState {
    const state = readJSON<StudyState | null>(KEYS.study, null);
    if (!state || !state.subjects || state.subjects.length === 0) {
      const def = getDefaultStudyState();
      writeJSON(KEYS.study, def);
      return def;
    }
    return state;
  }

  static saveStudy(state: StudyState): void {
    writeJSON(KEYS.study, state);
  }

  /* Recovery */
  static getRecovery(): RecoveryState {
    const state = readJSON<RecoveryState | null>(KEYS.recovery, null);
    if (!state || !state.categories) {
      const def = getDefaultRecoveryState();
      writeJSON(KEYS.recovery, def);
      return def;
    }
    return state;
  }

  static saveRecovery(state: RecoveryState): void {
    writeJSON(KEYS.recovery, state);
  }

  /* Finance */
  static getFinance(): FinanceState {
    const state = readJSON<FinanceState | null>(KEYS.finance, null);
    if (!state || !state.categories) {
      const def = getDefaultFinanceState();
      writeJSON(KEYS.finance, def);
      return def;
    }

    // Ensure accounts array exists and has savings and investment
    if (!Array.isArray(state.accounts)) {
      state.accounts = getDefaultFinanceState().accounts;
      writeJSON(KEYS.finance, state);
      return state;
    }

    let modified = false;
    if (!state.accounts.some(a => a.id === 'savings-vault' || a.kind === 'savings')) {
      state.accounts.push({
        id: 'savings-vault',
        name: 'Savings Vault',
        kind: 'savings',
        accent: '#4FA9E0',
        opening: 0,
        openingDate: todayStr(),
      });
      modified = true;
    }

    if (!state.accounts.some(a => a.id === 'investment-portfolio' || a.kind === 'investment')) {
      state.accounts.push({
        id: 'investment-portfolio',
        name: 'Investments & Portfolio',
        kind: 'investment',
        accent: '#C77DFF',
        opening: 0,
        openingDate: todayStr(),
      });
      modified = true;
    }

    if (modified) {
      writeJSON(KEYS.finance, state);
    }

    return state;
  }

  static saveFinance(state: FinanceState): void {
    writeJSON(KEYS.finance, state);
  }

  /* Pulse */
  static getPulse(): PulseState {
    const state = readJSON<PulseState | null>(KEYS.checkin, null);
    if (!state || !state.habits) {
      const def = getDefaultPulseState();
      writeJSON(KEYS.checkin, def);
      return def;
    }
    return state;
  }

  static savePulse(state: PulseState): void {
    writeJSON(KEYS.checkin, state);
  }

  /* Goals */
  static getGoals(): GoalsState {
    const state = readJSON<GoalsState | null>(KEYS.goals, null);
    if (!state || !state.categories) {
      const def = getDefaultGoalsState();
      writeJSON(KEYS.goals, def);
      return def;
    }
    return state;
  }

  static saveGoals(state: GoalsState): void {
    writeJSON(KEYS.goals, state);
  }

  /* Day Tags */
  static getDayTags(): DayTagsMap {
    return readJSON<DayTagsMap>(KEYS.daytags, {});
  }

  static saveDayTags(map: DayTagsMap): void {
    writeJSON(KEYS.daytags, map);
  }

  static addDayTag(date: string, tag: string): void {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    const map = this.getDayTags();
    if (!map[date]) map[date] = [];
    if (!map[date].includes(clean)) {
      map[date].push(clean);
      this.saveDayTags(map);
    }
  }

  static removeDayTag(date: string, tag: string): void {
    const map = this.getDayTags();
    if (!map[date]) return;
    map[date] = map[date].filter(t => t !== tag);
    if (map[date].length === 0) delete map[date];
    this.saveDayTags(map);
  }

  /* System Weights */
  static getWeights(): SystemWeights {
    return readJSON<SystemWeights>(KEYS.weights, {
      journal: 1,
      study: 1,
      recovery: 1,
      finance: 1,
      checkin: 1,
      goals: 1,
    });
  }

  static saveWeights(weights: SystemWeights): void {
    writeJSON(KEYS.weights, weights);
  }

  /* Composite History */
  static getCompositeHistory(): CompositeHistoryEntry[] {
    return readJSON<CompositeHistoryEntry[]>(KEYS.compositeHistory, []);
  }

  static recordCompositeSnapshot(composite: number): void {
    if (composite == null || isNaN(composite)) return;
    const history = this.getCompositeHistory();
    const today = todayStr();
    const idx = history.findIndex(h => h.date === today);
    if (idx >= 0) {
      history[idx].composite = composite;
    } else {
      history.push({ date: today, composite });
    }
    history.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = history.slice(-180);
    writeJSON(KEYS.compositeHistory, trimmed);
  }

  /* Complete Backup Export & Import */
  static exportFullBackup(): string {
    const backup = {
      meridianBackup: true,
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        journal: this.getJournal(),
        study: this.getStudy(),
        recovery: this.getRecovery(),
        finance: this.getFinance(),
        pulse: this.getPulse(),
        goals: this.getGoals(),
        daytags: this.getDayTags(),
        weights: this.getWeights(),
        compositeHistory: this.getCompositeHistory(),
      },
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (data.journal) writeJSON(KEYS.journal, data.journal);
      if (data.study) writeJSON(KEYS.study, data.study);
      if (data.recovery) writeJSON(KEYS.recovery, data.recovery);
      if (data.finance) writeJSON(KEYS.finance, data.finance);
      if (data.pulse) writeJSON(KEYS.checkin, data.pulse);
      if (data.goals) writeJSON(KEYS.goals, data.goals);
      if (data.daytags) writeJSON(KEYS.daytags, data.daytags);
      if (data.weights) writeJSON(KEYS.weights, data.weights);
      if (data.compositeHistory) writeJSON(KEYS.compositeHistory, data.compositeHistory);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  static getDatabaseSummary(): {
    journalCount: number;
    studySprintCount: number;
    recoveryDays: number;
    financeCount: number;
    checkinCount: number;
    goalCount: number;
  } {
    const journal = this.getJournal();
    const study = this.getStudy();
    const recovery = this.getRecovery();
    const finance = this.getFinance();
    const pulse = this.getPulse();
    const goals = this.getGoals();

    // calculate recovery days from first quit target
    let recDays = 0;
    const firstQuit = recovery.quits?.[0];
    if (firstQuit?.quitTimestamp) {
      const diff = Date.now() - firstQuit.quitTimestamp;
      recDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      journalCount: Array.isArray(journal) ? journal.length : 0,
      studySprintCount: study.logs?.length || 0,
      recoveryDays: recDays,
      financeCount: (finance.transactions?.length || 0) + (finance.accounts?.length || 0),
      checkinCount: pulse.logs?.length || 0,
      goalCount: goals.goals?.length || 0,
    };
  }

  static getLocalSnapshots(): Array<{
    id: string;
    timestamp: string;
    label: string;
    summary: ReturnType<typeof MeridianStorage.getDatabaseSummary>;
    data: any;
  }> {
    return readJSON(KEYS.snapshots, []);
  }

  static createLocalSnapshot(label?: string): string {
    const snapshots = this.getLocalSnapshots();
    const summary = this.getDatabaseSummary();
    const newSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: label || `Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      summary,
      data: {
        journal: this.getJournal(),
        study: this.getStudy(),
        recovery: this.getRecovery(),
        finance: this.getFinance(),
        pulse: this.getPulse(),
        goals: this.getGoals(),
        daytags: this.getDayTags(),
        weights: this.getWeights(),
        compositeHistory: this.getCompositeHistory(),
      },
    };
    // Keep maximum 8 recent snapshots
    const updated = [newSnapshot, ...snapshots.slice(0, 7)];
    writeJSON(KEYS.snapshots, updated);
    return newSnapshot.id;
  }

  static restoreLocalSnapshot(id: string): boolean {
    const snapshots = this.getLocalSnapshots();
    const target = snapshots.find(s => s.id === id);
    if (!target || !target.data) return false;
    return this.importFullBackup(JSON.stringify({ data: target.data }));
  }

  static deleteLocalSnapshot(id: string): void {
    const snapshots = this.getLocalSnapshots();
    const updated = snapshots.filter(s => s.id !== id);
    writeJSON(KEYS.snapshots, updated);
  }

  static getThemeConfig(): { palette: MaterialTheme; mode: ThemeMode } {
    return {
      palette: readJSON<MaterialTheme>(KEYS.themePalette, 'botanical'),
      mode: readJSON<ThemeMode>(KEYS.themeMode, 'system'),
    };
  }

  static saveThemeConfig(cfg: { palette: MaterialTheme; mode: ThemeMode }): void {
    writeJSON(KEYS.themePalette, cfg.palette);
    writeJSON(KEYS.themeMode, cfg.mode);
  }

  static getBiometricSettings(): BiometricSecuritySettings {
    return readJSON<BiometricSecuritySettings>(KEYS.biometrics, {
      enabled: false,
      lockOnLaunch: false,
      lockSensitiveModules: true,
      lockTimeoutMinutes: 5,
      hasPINFallback: false,
    });
  }

  static saveBiometricSettings(cfg: BiometricSecuritySettings): void {
    writeJSON(KEYS.biometrics, cfg);
  }

  static getPowerSettings(): AndroidPowerSettings {
    return readJSON<AndroidPowerSettings>(KEYS.power, {
      lowPowerMode: false,
      disableAnimations: false,
      reduceSamplingRate: false,
      hapticsIntensity: 'standard',
    });
  }

  static savePowerSettings(cfg: AndroidPowerSettings): void {
    writeJSON(KEYS.power, cfg);
    MeridianStorage.applyPowerSettingsToDOM(cfg);
  }

  static getLowPowerMode(): boolean {
    return MeridianStorage.getPowerSettings().lowPowerMode;
  }

  static setLowPowerMode(enabled: boolean): void {
    const current = MeridianStorage.getPowerSettings();
    const updated: AndroidPowerSettings = {
      ...current,
      lowPowerMode: enabled,
      disableAnimations: enabled,
      reduceSamplingRate: enabled,
    };
    MeridianStorage.savePowerSettings(updated);
  }

  static applyPowerSettingsToDOM(cfg: AndroidPowerSettings): void {
    if (typeof document === 'undefined') return;
    if (cfg && (cfg.lowPowerMode || cfg.disableAnimations)) {
      document.documentElement.classList.add('low-power-mode');
    } else {
      document.documentElement.classList.remove('low-power-mode');
    }
  }

  static resetAllData(): void {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
}

// Standalone export helpers for bulletproof modular compatibility
export function getBiometricSettings(): BiometricSecuritySettings {
  return MeridianStorage.getBiometricSettings();
}

export function saveBiometricSettings(cfg: BiometricSecuritySettings): void {
  MeridianStorage.saveBiometricSettings(cfg);
}

export function getPowerSettings(): AndroidPowerSettings {
  return MeridianStorage.getPowerSettings();
}

export function savePowerSettings(cfg: AndroidPowerSettings): void {
  MeridianStorage.savePowerSettings(cfg);
}

export function getLowPowerMode(): boolean {
  return MeridianStorage.getLowPowerMode();
}

export function setLowPowerMode(enabled: boolean): void {
  MeridianStorage.setLowPowerMode(enabled);
}

export function applyPowerSettingsToDOM(cfg: AndroidPowerSettings): void {
  MeridianStorage.applyPowerSettingsToDOM(cfg);
}

