export type ModuleRoute = 'overview' | 'timeline' | 'journal' | 'study' | 'recovery' | 'finance' | 'checkin' | 'goals';

export type MaterialTheme = 'botanical' | 'ocean' | 'terracotta' | 'lavender' | 'rose' | 'monochrome';
export type ThemeMode = 'light' | 'dark' | 'system';

/* Moneyball Sabermetrics Types */
export interface DailyWARRecord {
  date: string;
  dailyWAR: number;
  cumulativeWAR: number;
  composite: number;
  replacementBaseline: number;
  outcome: 'W' | 'L' | 'D';
  cognitiveWAR: number;
  disciplineWAR: number;
  capitalWAR: number;
  vitalityWAR: number;
}

export interface LifeWARSummary {
  totalWAR: number;
  weeklyWAR: number;
  seasonWAR: number;
  replacementBaseline: number;
  winLossRecord: { wins: number; losses: number; draws: number; winPct: number };
  cognitiveWAR: number;
  disciplineWAR: number;
  capitalWAR: number;
  vitalityWAR: number;
  history: DailyWARRecord[];
}

export interface SabermetricAlphaInsight {
  id: string;
  type: 'undervalued_habit' | 'negative_drag' | 'high_leverage' | 'synergy';
  title: string;
  variableA: string;
  variableB: string;
  correlation: number;
  pValue: number;
  impact: string;
  recommendation: string;
  confidence: 'high' | 'very_high' | 'moderate';
  sampleSize: number;
}

export interface MonteCarloScenario {
  id: string;
  name: string;
  studyMinsPerDay: number; // delta
  cravingResistancePct: number; // 0-100
  savingsRatePct: number; // 0-100
  sleepTargetHours: number;
  iterations: number;
  p10: number[]; // 10th percentile curve
  p50: number[]; // 50th median curve
  p90: number[]; // 90th upside curve
  successRate: number; // % reaching target composite
  targetComposite: number;
  expectedFinalScore: number;
  finalOutcomes: number[]; // All 1,000 simulation end scores
  samplePaths: number[][]; // Representative trajectory paths for D3 spaghetti/envelope charts
  mean: number;
  stdDev: number;
  iqr: [number, number]; // [25th, 75th percentile]
}

export interface LeveragePlay {
  id: string;
  action: string;
  detail: string;
  expectedProbDelta: number; // e.g. +14.5%
  module: ModuleRoute;
  completed: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface WinProbabilityState {
  currentWinProb: number; // 0-100
  baseProb: number;
  morningDelta: number;
  studyDelta: number;
  recoveryDelta: number;
  financeDelta: number;
  pulseDelta: number;
  goalsDelta: number;
  leveragePlays: LeveragePlay[];
  clutchIndex: number; // 0-100
}

export interface PlayerAttribute {
  attribute: string;
  value: number; // 0-99
  leagueAvg: number;
  tier: 'S' | 'A' | 'B' | 'C';
  description: string;
}

export interface PlayerCard {
  archetype: string;
  overallRating: number; // 0-99
  consistencyIndex: number; // 0-100
  volatilityIndex: number; // 0-100
  fatigueDecayScore: number; // 0-100
  radar: PlayerAttribute[];
  scoutingNotes: string[];
  keyAlphaLevers: string[];
}

export interface AIScoutReport {
  timestamp: string;
  headline: string;
  executiveSummary: string;
  inefficiencies: { finding: string; sabermetricEvidence: string; correctiveAction: string }[];
  projectedWARGain: number;
  recommendations: string[];
  generatedByAI: boolean;
}

/* Journal Types */
export interface JournalEntry {
  id: string;
  text: string;
  html?: string;
  tag?: string;
  pinned?: boolean;
  timestamp: string; // ISO string
}

/* Study Types */
export interface StudyDayTopic {
  id: string;
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  subjectId: string;
  subjectCode: string;
  dayNum: number;
  dayTotal: number;
  t: string; // topic title
  b: string; // brief / understand
  a: string; // anki prompt
  r: string[]; // active recall questions
  m: number; // minutes
}

export interface StudyModule {
  code: string;
  title: string;
  days: {
    t: string;
    b: string;
    a: string;
    r: string[];
    m: number;
  }[];
}

export interface StudySubject {
  id: string;
  code: string;
  name: string;
  cls: string;
  tagline: string;
  modules: StudyModule[];
}

export interface StudyLog {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string | null;
  durationMins: number;
  focusScore?: number;
  topic?: string;
  topicId?: string | null;
  note?: string;
}

export interface StudyState {
  subjects: {
    id: string;
    name: string;
    weeklyTargetMins: number;
    color: string;
    categoryId: string;
  }[];
  logs: StudyLog[];
  progress: {
    done: Record<string, boolean>;
  };
}

/* Recovery Types */
export interface RecoveryQuit {
  id: string;
  name: string;
  categoryId: string;
  quitTimestamp: number; // ms
  reason?: string;
  urgesLogged?: number;
  longestCleanDays?: number;
}

export interface RecoveryLog {
  id: string;
  quitId: string;
  date: string;
  type: 'urge' | 'reset';
  note?: string;
}

export interface RecoveryCategory {
  id: string;
  name: string;
  color: string;
}

export interface RecoveryState {
  categories: RecoveryCategory[];
  quits: RecoveryQuit[];
  logs: RecoveryLog[];
}

/* Finance Types */
export interface FinanceAccount {
  id: string;
  name: string;
  kind: 'bank' | 'cash';
  accent: string;
  opening: number; // in kobo
  openingDate: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
  color: string;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  date: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  categoryId?: string | null;
  merchant?: string;
  note?: string;
  amountKobo: number;
}

export interface FinanceState {
  setupComplete: boolean;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  budgets: Record<string, number>; // categoryId -> kobo
}

/* Pulse Checkin Types */
export interface HabitItem {
  id: string;
  name: string;
  target?: string;
  createdAt: number;
  archived: boolean;
}

export interface PulseLog {
  id: string;
  date: string; // YYYY-MM-DD
  sleepHours: number | null;
  sleepQuality?: number | null; // 1-5
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  focus?: number | null; // 1-5
  habits?: Record<string, boolean>;
  habitsCompleted?: string[]; // habit IDs
  note?: string;
}

export interface PulseState {
  habits: HabitItem[];
  logs: PulseLog[];
}

/* Goal Types */
export interface GoalCategory {
  id: string;
  name: string;
  color: string;
}

export interface GoalCheckin {
  id: string;
  goalId: string;
  date: string;
  value: number;
  note?: string;
}

export interface GoalItem {
  id: string;
  title: string;
  category?: string;
  categoryId?: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  deadline?: string | null;
  note?: string;
  targetType?: 'numeric' | 'boolean';
  createdAt?: string;
  archived?: boolean;
}

export interface GoalsState {
  categories: GoalCategory[];
  goals: GoalItem[];
  checkins: GoalCheckin[];
}

/* Day Tags */
export type DayTagsMap = Record<string, string[]>;

/* Scoreboard & Overview */
export interface ScoreboardRow {
  key: string;
  label: string;
  unit: string;
  thisVal: number;
  lastVal: number;
  diff: number;
  direction: 'pos' | 'neg' | 'flat';
  pct: number;
  fmt: (v: number) => string;
}

export interface SystemScores {
  journalScore: number;
  studyScore: number;
  recoveryScore: number;
  financeScore: number;
  checkinScore: number;
  goalsScore: number;
}

export interface SystemWeights {
  journal: number;
  study: number;
  recovery: number;
  finance: number;
  checkin: number;
  goals: number;
}

export interface CompositeHistoryEntry {
  date: string;
  composite: number;
}

/* Security & Power Types */
export interface BiometricSecuritySettings {
  enabled: boolean;
  lockOnLaunch: boolean;
  lockSensitiveModules: boolean; // Journal, Recovery, Finance
  lockTimeoutMinutes: number; // 0 = immediate, 1, 5, 15
  hasPINFallback: boolean;
  pinHash?: string;
  lastUnlockedAt?: number;
}

export interface AndroidPowerSettings {
  lowPowerMode: boolean;
  disableAnimations: boolean;
  reduceSamplingRate: boolean;
  hapticsIntensity: 'off' | 'subtle' | 'standard' | 'strong';
}
