import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookMarked,
  Timer,
  BarChart2,
  History,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudyState, StudySubject, StudyDayTopic, StudyLog } from '../../types';
import { MeridianStorage, fmtDateShort, todayStr } from '../../services/storage';
import { MEDICAL_CURRICULUM, FLATTENED_TOPICS } from '../../data/curriculumData';

export const StudyView: React.FC = () => {
  const [studyState, setStudyState] = useState<StudyState>(() => MeridianStorage.getStudy());
  const [activeTab, setActiveTab] = useState<'curriculum' | 'timer' | 'analytics' | 'history'>('curriculum');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ana');

  // Accordion state
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({ ana_0: true });
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  // Focus Timer state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(45 * 60);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(45 * 60);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);
  const [timerSelectedTopicId, setTimerSelectedTopicId] = useState<string>('');

  // Study log search
  const [logSearch, setLogSearch] = useState('');

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerIsRunning) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerIsRunning(false);
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
            alert('🎉 Focus block completed! Awesome work.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsRunning]);

  const toggleModuleOpen = (modId: string) => {
    setOpenModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const toggleTopicOpen = (topicId: string) => {
    setOpenTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const handleToggleTopicDone = (topic: StudyDayTopic) => {
    const isCurrentlyDone = !!studyState.progress.done[topic.id];
    const newProgressDone = { ...studyState.progress.done };

    if (isCurrentlyDone) {
      delete newProgressDone[topic.id];
      const updatedLogs = studyState.logs.filter(l => l.topicId !== topic.id);
      const newState: StudyState = {
        ...studyState,
        progress: { done: newProgressDone },
        logs: updatedLogs,
      };
      setStudyState(newState);
      MeridianStorage.saveStudy(newState);
    } else {
      newProgressDone[topic.id] = true;
      const newLog: StudyLog = {
        id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: todayStr(),
        subjectId: topic.moduleId,
        durationMins: topic.m,
        focusScore: 5,
        topic: topic.t,
        topicId: topic.id,
        note: `Curriculum: ${topic.moduleCode}`,
      };
      const newState: StudyState = {
        ...studyState,
        progress: { done: newProgressDone },
        logs: [newLog, ...studyState.logs],
      };
      setStudyState(newState);
      MeridianStorage.saveStudy(newState);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleSetTimerPreset = (mins: number) => {
    setTimerIsRunning(false);
    setTimerSecondsLeft(mins * 60);
    setTimerTotalSeconds(mins * 60);
  };

  const handleCompleteTimerAndLog = () => {
    setTimerIsRunning(false);
    const elapsedMins = Math.max(1, Math.round((timerTotalSeconds - timerSecondsLeft) / 60));
    const topic = FLATTENED_TOPICS.find(t => t.id === timerSelectedTopicId);

    const newLog: StudyLog = {
      id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: todayStr(),
      subjectId: topic ? topic.moduleId : null,
      durationMins: elapsedMins,
      focusScore: 5,
      topic: topic ? topic.t : 'Focused Sprint',
      topicId: topic ? topic.id : null,
      note: 'Sprint completed with Focus Timer',
    };

    const newProgressDone = { ...studyState.progress.done };
    if (topic) newProgressDone[topic.id] = true;

    const newState: StudyState = {
      ...studyState,
      progress: { done: newProgressDone },
      logs: [newLog, ...studyState.logs],
    };
    setStudyState(newState);
    MeridianStorage.saveStudy(newState);

    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
    alert(`Logged ${elapsedMins} minute study sprint!`);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm('Delete this study log entry?')) {
      const log = studyState.logs.find(l => l.id === id);
      const newProgressDone = { ...studyState.progress.done };
      if (log?.topicId) delete newProgressDone[log.topicId];

      const newState: StudyState = {
        ...studyState,
        logs: studyState.logs.filter(l => l.id !== id),
        progress: { done: newProgressDone },
      };
      setStudyState(newState);
      MeridianStorage.saveStudy(newState);
    }
  };

  // Format timer minutes/seconds
  const timerMins = Math.floor(timerSecondsLeft / 60);
  const timerSecs = timerSecondsLeft % 60;
  const timerFormatted = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  // Current Subject calculations
  const currentSubject = MEDICAL_CURRICULUM.find(s => s.id === selectedSubjectId) || MEDICAL_CURRICULUM[0];
  const subjectTopics = FLATTENED_TOPICS.filter(t => t.subjectId === selectedSubjectId);
  const subjectDoneCount = subjectTopics.filter(t => studyState.progress.done[t.id]).length;
  const subjectTotalCount = subjectTopics.length;
  const subjectPct = Math.round((subjectDoneCount / Math.max(1, subjectTotalCount)) * 100);

  // Filtered study logs
  const filteredLogs = studyState.logs.filter(
    l =>
      !logSearch.trim() ||
      (l.topic && l.topic.toLowerCase().includes(logSearch.toLowerCase())) ||
      (l.note && l.note.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Sub-Navigation Tabs */}
      <div
        className="p-1.5 rounded-2xl border flex items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        {[
          { id: 'curriculum', label: '200L Syllabus', icon: BookMarked },
          { id: 'timer', label: 'Focus Timer', icon: Timer },
          { id: 'analytics', label: 'Mastery Analytics', icon: BarChart2 },
          { id: 'history', label: `Logs History (${studyState.logs.length})`, icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CURRICULUM VIEW */}
      {activeTab === 'curriculum' && (
        <div className="space-y-5">
          {/* Subject Switcher */}
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto no-scrollbar touch-pan-x">
            {MEDICAL_CURRICULUM.map(subj => {
              const count = FLATTENED_TOPICS.filter(t => t.subjectId === subj.id && studyState.progress.done[t.id]).length;
              const total = FLATTENED_TOPICS.filter(t => t.subjectId === subj.id).length;
              const isSelected = selectedSubjectId === subj.id;

              return (
                <button
                  key={subj.id}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'border-primary bg-primary-container text-on-primary-container shadow-sm'
                      : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{subj.name}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {count}/{total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subject Header Ribbon */}
          <div
            className="p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-primary">
                  {currentSubject.code} Syllabus
                </span>
                <span className="text-xs text-on-surface-variant">· 200 Level Medical</span>
              </div>
              <h3 className="text-lg font-bold font-display text-on-surface mt-0.5">
                {currentSubject.name} Mastery
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-lg">{currentSubject.tagline}</p>
            </div>
            <div className="text-right sm:text-right shrink-0 space-y-1">
              <div className="text-2xl font-bold font-mono text-primary">{subjectPct}%</div>
              <div className="text-xs font-mono text-on-surface-variant">
                {subjectDoneCount} of {subjectTotalCount} topics completed
              </div>
            </div>
          </div>

          {/* Modules Accordion */}
          <div className="space-y-3">
            {currentSubject.modules.map((mod, mi) => {
              const modId = `${currentSubject.id}_${mi}`;
              const isOpen = !!openModules[modId];
              const modTopics = FLATTENED_TOPICS.filter(t => t.moduleId === modId);
              const modDone = modTopics.filter(t => studyState.progress.done[t.id]).length;
              const modPct = Math.round((modDone / Math.max(1, modTopics.length)) * 100);

              return (
                <div
                  key={modId}
                  className="rounded-3xl border overflow-hidden shadow-sm transition-all"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  {/* Module Header */}
                  <div
                    onClick={() => toggleModuleOpen(modId)}
                    className="p-4.5 px-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center text-on-primary shadow-sm"
                        style={{ backgroundColor: 'var(--md-sys-color-primary)' }}
                      >
                        {mi + 1}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-semibold text-primary">{mod.code}</div>
                        <h4 className="text-sm font-bold text-on-surface">{mod.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-mono font-semibold">
                          {modDone}/{modTopics.length} done
                        </div>
                        <div className="w-20 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-1">
                          <div className="h-full bg-primary" style={{ width: `${modPct}%` }} />
                        </div>
                      </div>
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Topics List */}
                  {isOpen && (
                    <div className="p-3 pt-0 space-y-2 border-t border-outline-variant bg-black/5 dark:bg-white/5">
                      {modTopics.map(topic => {
                        const isDone = !!studyState.progress.done[topic.id];
                        const isTopicExpanded = !!openTopics[topic.id];

                        return (
                          <div
                            key={topic.id}
                            className={`rounded-2xl border p-3.5 space-y-2.5 transition-all ${
                              isDone
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-surface-container border-outline-variant'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTopicDone(topic)}
                                  className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                                    isDone
                                      ? 'bg-emerald-500 text-black border-emerald-500'
                                      : 'border-outline hover:border-primary'
                                  }`}
                                >
                                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-on-surface-variant">
                                      Day {topic.dayNum}/{topic.dayTotal} · {topic.m}m
                                    </span>
                                  </div>
                                  <h5
                                    className={`text-xs md:text-sm font-semibold mt-0.5 ${
                                      isDone ? 'line-through text-on-surface-variant' : 'text-on-surface'
                                    }`}
                                  >
                                    {topic.t}
                                  </h5>
                                  <p className="text-xs text-on-surface-variant mt-0.5">{topic.b}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleTopicOpen(topic.id)}
                                type="button"
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-on-surface-variant"
                              >
                                {isTopicExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Active Recall & Anki Prompt */}
                            {isTopicExpanded && (
                              <div className="pt-2 border-t border-outline-variant space-y-2 text-xs">
                                <div>
                                  <span className="font-mono uppercase text-[10px] font-bold text-primary">
                                    Anki Flashcard Blueprint:
                                  </span>
                                  <p className="p-2 rounded-xl bg-black/10 dark:bg-white/10 font-mono text-[11px] text-on-surface mt-1">
                                    {topic.a}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-mono uppercase text-[10px] font-bold text-primary">
                                    Active Recall Prompts (Self-test without notes):
                                  </span>
                                  <ul className="list-disc list-inside space-y-1 text-on-surface-variant mt-1">
                                    {topic.r.map((q, qi) => (
                                      <li key={qi}>{q}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FOCUS SPRINT TIMER */}
      {activeTab === 'timer' && (
        <div
          className="p-8 rounded-3xl border shadow-sm text-center space-y-6 max-w-lg mx-auto"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div>
            <span className="text-xs font-mono font-bold uppercase text-primary tracking-widest">
              Medical Focus Engine
            </span>
            <div className="text-6xl sm:text-7xl font-bold font-mono text-on-surface tracking-tighter my-3">
              {timerFormatted}
            </div>
            <p className="text-xs text-on-surface-variant">Single-task deep work sprint</p>
          </div>

          {/* Presets */}
          <div className="flex justify-center gap-2 flex-wrap">
            {[
              { m: 25, label: '25m Anki' },
              { m: 45, label: '45m Syllabus' },
              { m: 60, label: '60m Deep Review' },
            ].map(preset => (
              <button
                key={preset.m}
                type="button"
                onClick={() => handleSetTimerPreset(preset.m)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                  timerTotalSeconds === preset.m * 60
                    ? 'bg-primary-container text-on-primary-container border-primary'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Topic Select for Timer */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 text-left">
              Link this sprint to curriculum topic:
            </label>
            <select
              value={timerSelectedTopicId}
              onChange={e => setTimerSelectedTopicId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
            >
              <option value="" className="dark:bg-zinc-800">
                — General Review (No specific topic) —
              </option>
              {FLATTENED_TOPICS.map(t => (
                <option key={t.id} value={t.id} className="dark:bg-zinc-800">
                  {t.moduleCode} · {t.t}
                </option>
              ))}
            </select>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setTimerIsRunning(!timerIsRunning)}
              type="button"
              className="px-6 py-3 rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-2 transform active:scale-95"
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              {timerIsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{timerIsRunning ? 'Pause Sprint' : 'Start Focus Sprint'}</span>
            </button>

            <button
              onClick={() => handleSetTimerPreset(timerTotalSeconds / 60)}
              type="button"
              className="p-3 rounded-full border border-outline-variant hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleCompleteTimerAndLog}
              type="button"
              className="px-4 py-3 rounded-full text-xs font-bold border border-outline-variant hover:border-primary text-on-surface"
            >
              Log Now
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <h3 className="text-base font-bold font-display">Syllabus Completion by Course</h3>
            <div className="space-y-3">
              {MEDICAL_CURRICULUM.map(subj => {
                const topics = FLATTENED_TOPICS.filter(t => t.subjectId === subj.id);
                const done = topics.filter(t => studyState.progress.done[t.id]).length;
                const pct = Math.round((done / Math.max(1, topics.length)) * 100);

                return (
                  <div key={subj.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>{subj.name}</span>
                      <span className="font-mono">{done}/{topics.length} topics ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: subj.id === 'ana' ? '#2D6A4F' : subj.id === 'phs' ? '#00796B' : '#D97706' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <input
            type="text"
            value={logSearch}
            onChange={e => setLogSearch(e.target.value)}
            placeholder="Search study logs, topics or takeaways..."
            className="w-full px-4 py-2 text-xs rounded-full border bg-black/5 dark:bg-white/5 border-outline-variant text-on-surface"
          />

          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-sm"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-on-surface-variant">
                No study logs found.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-primary">
                        {fmtDateShort(log.date)}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                        {log.durationMins} mins
                      </span>
                    </div>
                    <h5 className="text-xs md:text-sm font-semibold text-on-surface">
                      {log.topic || 'Study Block'}
                    </h5>
                    {log.note && <p className="text-xs text-on-surface-variant">{log.note}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
