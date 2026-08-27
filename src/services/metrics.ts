import {
  JournalEntry,
  StudyState,
  RecoveryState,
  FinanceState,
  PulseState,
  GoalsState,
  ScoreboardRow,
  SystemScores,
  SystemWeights,
} from '../types';
import { formatLocalDate, todayStr, daysAgoStr, fmtNaira, fmtDateShort, RECOVERY_MILESTONES } from './storage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeSystemScores(
  journal: JournalEntry[],
  study: StudyState,
  recovery: RecoveryState,
  finance: FinanceState,
  pulse: PulseState,
  goals: GoalsState
): SystemScores {
  // Journal score: based on entries in last 7 days (target ~5-7 entries)
  const now = Date.now();
  const last7Journal = journal.filter(e => now - new Date(e.timestamp).getTime() <= 7 * 86400000).length;
  const journalScore = clamp(Math.round((last7Journal / 5) * 100));

  // Study score: based on 7-day hours vs weekly targets
  let study7Mins = 0;
  for (let i = 0; i < 7; i++) {
    const ds = daysAgoStr(i);
    study7Mins += study.logs.filter(l => l.date === ds).reduce((s, l) => s + (l.durationMins || 0), 0);
  }
  const totalTargetMins = study.subjects.reduce((s, su) => s + (su.weeklyTargetMins || 0), 0) || 1200;
  const studyScore = clamp(Math.round((study7Mins / totalTargetMins) * 100));

  // Recovery score: based on longest clean streak & active adherence
  const withDays = recovery.quits.map(q => Math.max(0, Math.floor((Date.now() - q.quitTimestamp) / 86400000)));
  const longestDays = withDays.length ? Math.max(...withDays) : 0;
  const recoveryScore = clamp(Math.round((longestDays / 60) * 100));

  // Finance score: based on current month's savings rate and budget adherence
  const ym = todayStr().slice(0, 7);
  const monthTxns = finance.transactions.filter(t => t.date.slice(0, 7) === ym);
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amountKobo, 0);
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountKobo, 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 50;
  const financeScore = clamp(Math.round(50 + savingsRate * 0.5));

  // Pulse score: check-in frequency and avg mood/energy
  const last7Logs = pulse.logs.filter(l => l.date >= daysAgoStr(6));
  const checkinDays = last7Logs.length;
  const pulseScore = clamp(Math.round((checkinDays / 7) * 100));

  // Goals score: average % completion of numeric goals and active streaks
  const activeGoals = goals.goals.filter(g => !g.archived);
  let totalGoalPct = 0;
  if (activeGoals.length > 0) {
    activeGoals.forEach(g => {
      if (g.targetType === 'numeric') {
        const sum = goals.checkins.filter(c => c.goalId === g.id).reduce((s, c) => s + (Number(c.value) || 0), 0);
        totalGoalPct += Math.min(100, Math.round((sum / (g.targetValue || 1)) * 100));
      } else {
        // Daily habit goal check
        const checks = new Set(goals.checkins.filter(c => c.goalId === g.id).map(c => c.date));
        totalGoalPct += checks.has(todayStr()) || checks.has(daysAgoStr(1)) ? 100 : 50;
      }
    });
  }
  const goalsScore = activeGoals.length > 0 ? clamp(Math.round(totalGoalPct / activeGoals.length)) : 70;

  return {
    journalScore,
    studyScore,
    recoveryScore,
    financeScore,
    checkinScore: pulseScore,
    goalsScore,
  };
}

export function computeWeightedComposite(scores: SystemScores, weights: SystemWeights): number {
  const total = weights.journal + weights.study + weights.recovery + weights.finance + weights.checkin + weights.goals;
  if (total <= 0) return 75;
  const sum =
    scores.journalScore * weights.journal +
    scores.studyScore * weights.study +
    scores.recoveryScore * weights.recovery +
    scores.financeScore * weights.finance +
    scores.checkinScore * weights.checkin +
    scores.goalsScore * weights.goals;
  return Math.round(sum / total);
}

export function computeWeeklyScoreboard(
  journal: JournalEntry[],
  study: StudyState,
  recovery: RecoveryState,
  finance: FinanceState,
  pulse: PulseState,
  goals: GoalsState
): ScoreboardRow[] {
  const now = Date.now();
  const d7 = 7 * 86400000;
  const d14 = 14 * 86400000;

  // Journal
  const jThis = journal.filter(e => {
    const diff = now - new Date(e.timestamp).getTime();
    return diff <= d7;
  }).length;
  const jLast = journal.filter(e => {
    const diff = now - new Date(e.timestamp).getTime();
    return diff > d7 && diff <= d14;
  }).length;

  // Study Hours
  let sThisMins = 0;
  let sLastMins = 0;
  for (let i = 0; i < 7; i++) {
    const d = daysAgoStr(i);
    sThisMins += study.logs.filter(l => l.date === d).reduce((s, l) => s + (l.durationMins || 0), 0);
  }
  for (let i = 7; i < 14; i++) {
    const d = daysAgoStr(i);
    sLastMins += study.logs.filter(l => l.date === d).reduce((s, l) => s + (l.durationMins || 0), 0);
  }
  const sThis = Math.round((sThisMins / 60) * 10) / 10;
  const sLast = Math.round((sLastMins / 60) * 10) / 10;

  // Recovery Slips (lower is better)
  const rThis = recovery.logs.filter(l => l.type === 'reset' && l.date >= daysAgoStr(6)).length;
  const rLast = recovery.logs.filter(l => l.type === 'reset' && l.date >= daysAgoStr(13) && l.date < daysAgoStr(6)).length;

  // Finance Net Cash Flow
  let fThisKobo = 0;
  let fLastKobo = 0;
  finance.transactions.forEach(t => {
    if (t.date >= daysAgoStr(6)) {
      if (t.type === 'income') fThisKobo += t.amountKobo;
      else if (t.type === 'expense') fThisKobo -= t.amountKobo;
    } else if (t.date >= daysAgoStr(13) && t.date < daysAgoStr(6)) {
      if (t.type === 'income') fLastKobo += t.amountKobo;
      else if (t.type === 'expense') fLastKobo -= t.amountKobo;
    }
  });

  // Pulse Check-ins
  const pThis = pulse.logs.filter(l => l.date >= daysAgoStr(6)).length;
  const pLast = pulse.logs.filter(l => l.date >= daysAgoStr(13) && l.date < daysAgoStr(6)).length;

  // Goals Check-ins
  const gThis = goals.checkins.filter(c => c.date >= daysAgoStr(6)).length;
  const gLast = goals.checkins.filter(c => c.date >= daysAgoStr(13) && c.date < daysAgoStr(6)).length;

  function makeRow(
    key: string,
    label: string,
    unit: string,
    thisVal: number,
    lastVal: number,
    fmt: (v: number) => string,
    invert = false
  ): ScoreboardRow {
    const diff = thisVal - lastVal;
    let direction: 'pos' | 'neg' | 'flat' = 'flat';
    if (diff > 0) direction = invert ? 'neg' : 'pos';
    else if (diff < 0) direction = invert ? 'pos' : 'neg';
    const pct = lastVal !== 0 ? Math.round((diff / Math.abs(lastVal)) * 100) : thisVal > 0 ? 100 : 0;
    return { key, label, unit, thisVal, lastVal, diff, direction, pct, fmt };
  }

  return [
    makeRow('journal', 'Journal', 'entries', jThis, jLast, v => String(v)),
    makeRow('study', 'Study Output', 'hrs', sThis, sLast, v => `${v.toFixed(1)}h`),
    makeRow('recovery', 'Recovery Slips', 'slips', rThis, rLast, v => String(v), true),
    makeRow('finance', 'Net Flow', '₦', fThisKobo, fLastKobo, v => fmtNaira(v)),
    makeRow('checkin', 'Pulse Logs', 'days', pThis, pLast, v => `${v}d`),
    makeRow('goals', 'Goal Actions', 'logs', gThis, gLast, v => String(v)),
  ];
}

export function buildTodaysMove(scores: SystemScores, scoreboard: ScoreboardRow[]) {
  const scoreEntries = [
    { key: 'journalScore', label: 'Journal', route: 'journal', color: 'var(--md-sys-color-primary)', icon: 'BookOpen' },
    { key: 'studyScore', label: 'Study Ledger', route: 'study', color: '#22A566', icon: 'GraduationCap' },
    { key: 'recoveryScore', label: 'Unbound', route: 'recovery', color: '#D3A346', icon: 'ShieldCheck' },
    { key: 'financeScore', label: 'Finance Ledger', route: 'finance', color: '#4FA9E0', icon: 'Wallet' },
    { key: 'checkinScore', label: 'Pulse Check-in', route: 'checkin', color: '#F0A8C4', icon: 'Activity' },
    { key: 'goalsScore', label: 'Goals', route: 'goals', color: '#E8B368', icon: 'Target' },
  ].map(e => ({ ...e, score: scores[e.key as keyof SystemScores] || 0 }));

  scoreEntries.sort((a, b) => a.score - b.score);
  const weakest = scoreEntries[0];
  const sb = scoreboard.find(r => r.key === weakest.route);

  let recommendation = '';
  if (sb && sb.direction === 'neg' && Math.abs(sb.pct) >= 15) {
    recommendation = `${weakest.label} dropped ${Math.abs(sb.pct)}% this week compared to last week. A single focused 15-minute action will turn the trend positive.`;
  } else if (weakest.score < 50) {
    recommendation = `${weakest.label} is your lowest-scoring system at ${weakest.score}/100. Investing 10 minutes here provides the biggest system boost today.`;
  } else {
    recommendation = `All systems are in healthy alignment! Log a quick reflection or study sprint to compound your streak.`;
  }

  return {
    label: weakest.label,
    route: weakest.route,
    color: weakest.color,
    score: weakest.score,
    recommendation,
  };
}

export function buildPersonalRecords(
  journal: JournalEntry[],
  study: StudyState,
  recovery: RecoveryState,
  finance: FinanceState,
  pulse: PulseState,
  goals: GoalsState
) {
  const records = [];

  // Longest study streak
  const studyDates = new Set(study.logs.map(l => l.date));
  let studyStreak = 0;
  let tempStudy = 0;
  for (let i = 0; i < 365; i++) {
    const ds = daysAgoStr(i);
    if (studyDates.has(ds)) {
      tempStudy++;
      if (tempStudy > studyStreak) studyStreak = tempStudy;
    } else {
      tempStudy = 0;
    }
  }
  if (studyStreak > 0) {
    records.push({
      label: 'Longest Study Streak',
      value: `${studyStreak} day${studyStreak === 1 ? '' : 's'}`,
      route: 'study',
      color: '#22A566',
      badge: 'Focus Engine',
    });
  }

  // Longest recovery clean streak
  const withDays = recovery.quits.map(q => ({
    name: q.name,
    days: Math.max(0, Math.floor((Date.now() - q.quitTimestamp) / 86400000)),
  }));
  const bestQuit = withDays.sort((a, b) => b.days - a.days)[0];
  if (bestQuit && bestQuit.days > 0) {
    records.push({
      label: `Clean Streak (${bestQuit.name})`,
      value: `${bestQuit.days} day${bestQuit.days === 1 ? '' : 's'}`,
      route: 'recovery',
      color: '#D3A346',
      badge: 'Unbound Master',
    });
  }

  // Best finance single-day surplus
  const dailyFinance: Record<string, number> = {};
  finance.transactions.forEach(t => {
    const net = t.type === 'income' ? t.amountKobo : t.type === 'expense' ? -t.amountKobo : 0;
    dailyFinance[t.date] = (dailyFinance[t.date] || 0) + net;
  });
  const bestFinDay = Object.entries(dailyFinance).sort((a, b) => b[1] - a[1])[0];
  if (bestFinDay && bestFinDay[1] > 0) {
    records.push({
      label: 'Best Day Net Inflow',
      value: `+${fmtNaira(bestFinDay[1])}`,
      route: 'finance',
      color: '#4FA9E0',
      badge: fmtDateShort(bestFinDay[0]),
    });
  }

  // Pulse streak
  const pulseDates = new Set(pulse.logs.map(l => l.date));
  let pulseStreak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = daysAgoStr(i);
    if (pulseDates.has(ds)) {
      pulseStreak++;
    } else if (i > 0) {
      break;
    }
  }
  if (pulseStreak > 0) {
    records.push({
      label: 'Daily Check-in Streak',
      value: `${pulseStreak} day${pulseStreak === 1 ? '' : 's'}`,
      route: 'checkin',
      color: '#F0A8C4',
      badge: 'High Self-Awareness',
    });
  }

  // Goals completion
  const completedGoals = goals.goals.filter(g => {
    if (g.targetType === 'numeric') {
      const sum = goals.checkins.filter(c => c.goalId === g.id).reduce((s, c) => s + (Number(c.value) || 0), 0);
      return sum >= (g.targetValue || 1);
    }
    return false;
  }).length;
  if (completedGoals > 0) {
    records.push({
      label: 'Completed Milestone Goals',
      value: `${completedGoals} goal${completedGoals === 1 ? '' : 's'}`,
      route: 'goals',
      color: '#E8B368',
      badge: 'Goal Crusher',
    });
  }

  return records;
}

export function buildActivityMatrix(
  journal: JournalEntry[],
  study: StudyState,
  recovery: RecoveryState,
  finance: FinanceState,
  pulse: PulseState,
  goals: GoalsState,
  daysCount = 140
) {
  const activeDays = new Set<string>();
  journal.forEach(e => activeDays.add(formatLocalDate(new Date(e.timestamp))));
  study.logs.forEach(l => activeDays.add(l.date));
  recovery.logs.forEach(l => activeDays.add(l.date));
  finance.transactions.forEach(t => activeDays.add(t.date));
  pulse.logs.forEach(l => activeDays.add(l.date));
  goals.checkins.forEach(c => activeDays.add(c.date));

  const weeks = Math.ceil(daysCount / 7);
  const today = new Date();
  const dow = today.getDay();
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - dow));

  const matrixCols: { dateStr: string; isActive: boolean; isFuture: boolean }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const targetDate = new Date(end);
      targetDate.setDate(targetDate.getDate() - (w * 7 + (6 - d)));
      const dateStr = formatLocalDate(targetDate);
      const isFuture = dateStr > todayStr();
      const isActive = !isFuture && activeDays.has(dateStr);
      col.push({ dateStr, isActive, isFuture });
    }
    matrixCols.push(col);
  }
  return matrixCols;
}

export function computeCrossCorrelations(
  study: StudyState,
  recovery: RecoveryState,
  pulse: PulseState,
  finance: FinanceState
) {
  const insights = [];

  // Sleep vs Study output
  const sleepStudyPairs: { sleep: number; mins: number }[] = [];
  pulse.logs.forEach(pl => {
    if (pl.sleepHours != null) {
      const studyMins = study.logs.filter(l => l.date === pl.date).reduce((s, l) => s + (l.durationMins || 0), 0);
      sleepStudyPairs.push({ sleep: pl.sleepHours, mins: studyMins });
    }
  });
  if (sleepStudyPairs.length >= 2) {
    const highSleep = sleepStudyPairs.filter(p => p.sleep >= 7.5);
    const lowSleep = sleepStudyPairs.filter(p => p.sleep < 7.0);
    const avgHigh = highSleep.length ? highSleep.reduce((s, p) => s + p.mins, 0) / highSleep.length : 0;
    const avgLow = lowSleep.length ? lowSleep.reduce((s, p) => s + p.mins, 0) / lowSleep.length : 0;
    if (avgHigh > avgLow + 15) {
      insights.push({
        tag: 'SLEEP ↔ STUDY',
        text: `You log ~${Math.round(avgHigh - avgLow)} more study minutes on days after 7.5+ hours of sleep.`,
        color: '#22A566',
      });
    }
  }

  // Mood vs Urges in Recovery
  const moodUrgePairs: { mood: number; urges: number }[] = [];
  pulse.logs.forEach(pl => {
    if (pl.mood != null) {
      const urges = recovery.logs.filter(l => l.date === pl.date).length;
      moodUrgePairs.push({ mood: pl.mood, urges });
    }
  });
  if (moodUrgePairs.length >= 2) {
    const lowMood = moodUrgePairs.filter(p => p.mood <= 2.5);
    if (lowMood.some(p => p.urges > 0)) {
      insights.push({
        tag: 'MOOD ↔ CRAVINGS',
        text: 'Cravings concentrate heavily on days where mood is self-rated below 3/5. Consider scheduling restful breathwork on low-energy days.',
        color: '#D3A346',
      });
    }
  }

  // Spending vs Weekly Balance
  const totalSpend = finance.transactions
    .filter(t => t.type === 'expense' && t.date >= daysAgoStr(30))
    .reduce((s, t) => s + t.amountKobo, 0);
  if (totalSpend > 0) {
    insights.push({
      tag: 'FINANCIAL RUNWAY',
      text: `Current average daily outgoing burn is ${fmtNaira(Math.round(totalSpend / 30))}/day. Net liquidity provides reliable buffer.`,
      color: '#4FA9E0',
    });
  }

  return insights;
}
