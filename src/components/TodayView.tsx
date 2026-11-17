"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PROGRAM, dayLabel, dayProgressLabel, BUILTIN_EXERCISES, type ProgramExercise } from "@/lib/program";
import { generateSessionDebrief } from "@/lib/adaptiveCoach";
import { getCoachedExerciseById } from "@/lib/materials";
import {
  COACH_SKILL_LABELS,
  MATERIAL_TYPE_LABELS,
  dateKey,
  fmtDur,
  type CoachedExercise,
  type Exercise,
  type SessionDebrief,
} from "@/lib/types";
import { Btn, Card, Chip, Modal, Ring, SectionLabel, Select, Stat, Timer, TrainingCalendar } from "./ui";
import CoachedText from "./CoachedText";

const CAT_TONE: Record<string, "brand" | "accent" | "good" | "warn" | "bad" | "muted"> = {
  breathing: "brand",
  pronunciation: "accent",
  clarity: "good",
  fluency: "warn",
  pitch: "brand",
  confidence: "bad",
  reading: "muted",
  "connected speech": "muted",
  impromptu: "warn",
  storytelling: "accent",
  conversation: "brand",
  pacing: "warn",
};

function ProgramExerciseCard({
  ex,
  index,
  done,
  onDone,
  onTick,
  onSendScript,
}: {
  ex: ProgramExercise;
  index: number;
  done: boolean;
  onDone: () => void;
  onTick: (s: number) => void;
  onSendScript: (title: string, text: string) => void;
}) {
  const { openAddWord } = useStore();
  const [open, setOpen] = useState(false);
  const hasMaterial = ex.material && ex.material.length > 0;
  return (
    <div className={`xcard ${done ? "xcard-done" : ""}`}>
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className={`xnum ${done ? "xnum-done" : ""}`}>
          {done ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6.5L4.5 9 10 3" />
            </svg>
          ) : (
            index + 1
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold leading-tight">{ex.name}</span>
            <Chip tone={CAT_TONE[ex.category] ?? "muted"}>{ex.category}</Chip>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] tabular-nums text-[var(--muted)]">
            <span>⏱ {fmtDur(ex.durationSec)}</span>
            {ex.reps > 0 && <span>×{ex.reps} reps</span>}
            {ex.restSec > 0 && <span>rest {ex.restSec}s</span>}
            {hasMaterial && <span className="text-[var(--brand)]">+ material</span>}
          </div>
        </div>
        <svg
          className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 5.5l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">{ex.instructions}</p>
          {ex.tips && (
            <ul className="mt-2 grid gap-1">
              {ex.tips.map((t, i) => (
                <li key={i} className="text-[12px] text-[var(--muted)]">
                  <span className="text-[var(--accent)]">→</span> {t}
                </li>
              ))}
            </ul>
          )}
          {hasMaterial && (
            <div className="mt-3">
              <SectionLabel>{ex.materialLabel ?? "Practice material"}</SectionLabel>
              <div className="mt-1.5 grid gap-1.5">
                {ex.material!.map((m, i) => (
                  <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2 text-[13.5px] leading-relaxed">
                    <span className="material-words">
                      {m.split(/\*\*(.+?)\*\*/g).map((part, j) =>
                        j % 2 === 1 ? (
                          <b key={j} className="text-[var(--ink)]">
                            {part}
                          </b>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn variant="soft" onClick={() => onSendScript(ex.name, ex.material!.join("\n\n"))}>
                  Send to Recorder
                </Btn>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Timer resetKey={ex.name} seconds={ex.durationSec} onTick={onTick} />
            <Btn variant="soft" onClick={() => openAddWord("", "exercise")}>
              + Add My Word
            </Btn>
            <Btn variant={done ? "ghost" : "primary"} onClick={onDone} className="ml-auto">
              {done ? "Undo" : "Done"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function CoachedExerciseCard({
  ex,
  index,
  done,
  onDone,
  onTick,
  onRecordExercise,
}: {
  ex: CoachedExercise;
  index: number;
  done: boolean;
  onDone: () => void;
  onTick: () => void;
  onRecordExercise: (ex: CoachedExercise) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={`xcard ${done ? "xcard-done" : ""}`}>
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className={`xnum ${done ? "xnum-done" : ""}`}>
          {done ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6.5L4.5 9 10 3" />
            </svg>
          ) : (
            index + 1
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold leading-tight">{ex.title}</span>
            <Chip tone="brand">{MATERIAL_TYPE_LABELS[ex.materialType]}</Chip>
            <Chip tone={ex.difficulty === "beginner" ? "good" : ex.difficulty === "intermediate" ? "warn" : "bad"}>
              {ex.difficulty}
            </Chip>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] tabular-nums text-[var(--muted)]">
            <span>⏱ {fmtDur(ex.durationSec)}</span>
            <span>target ~{ex.targetWpm} WPM</span>
            <span>×{ex.reps} rep{ex.reps > 1 ? "s" : ""}</span>
            <span className="text-[var(--brand)]">Coach cues + audio model</span>
          </div>
        </div>
        <svg
          className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 5.5l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 grid gap-4 border-t border-[var(--line)] pt-3">
          <CoachedText exercise={ex} compact />
          <div className="flex flex-wrap items-center gap-2">
            <Timer resetKey={ex.id} seconds={ex.durationSec} onTick={onTick} />
            <Btn variant="soft" onClick={() => onRecordExercise(ex)}>
              Record & Evaluate
            </Btn>
            <Btn variant={done ? "ghost" : "primary"} onClick={onDone} className="ml-auto">
              {done ? "Completed ✓" : "Mark done"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodayView({ nav }: { nav: (v: string) => void }) {
  const {
    nowMs,
    settings,
    profile,
    coachPlan,
    todayPlan,
    stats,
    improvement,
    skillStandings,
    setSettings,
    addLog,
    markDayDone,
    saveDebrief,
    setGuidedOpen,
    setOnboardingOpen,
    openAddWord,
    setPracticeWordId,
    toast,
    recordings,
    debriefs,
    exercises,
    logs,
    words,
    dueWords,
    weakSounds,
  } = useStore();

  const [tab, setTab] = useState<"coach" | "curriculum">("coach");
  const [coachDone, setCoachDone] = useState<Record<string, boolean>>({});
  const [curriculumDone, setCurriculumDone] = useState<Record<string, boolean>>({});
  const [accum, setAccum] = useState(0);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [debriefModal, setDebriefModal] = useState<SessionDebrief | null>(null);

  const day = settings.currentDay;
  const { week, day: pday } = dayLabel(day);
  const allCurriculumEx = useMemo(() => [...pday.warmup, ...pday.main], [pday]);
  const curriculumDoneCount = allCurriculumEx.filter((e) => curriculumDone[e.id]).length;
  const allCurriculumDone = curriculumDoneCount === allCurriculumEx.length && allCurriculumEx.length > 0;

  const todayKeyStr = useMemo(() => dateKey(nowMs || undefined), [nowMs]);
  const todaySecs = useMemo(
    () => logs.filter((l) => l.date === todayKeyStr).reduce((a, l) => a + l.seconds, 0),
    [logs, todayKeyStr]
  );
  const todayDebrief = useMemo(() => debriefs.find((d) => d.date === todayKeyStr) ?? null, [debriefs, todayKeyStr]);

  const coachDoneCount = todayPlan.exercises.filter((e) => coachDone[e.id]).length;
  const goalMin = settings.dailyGoalMin;
  const goalValue = Math.min(1, todaySecs / (goalMin * 60));

  const favorites = useMemo(() => {
    const ids = new Set(settings.favorites);
    const all: Exercise[] = [...BUILTIN_EXERCISES, ...exercises];
    return all.filter((e) => ids.has(e.id)).slice(0, 6);
  }, [settings.favorites, exercises]);

  // Top 3 weaknesses: combine real recorded standings with coachPlan priority areas
  const activeWeaknesses = useMemo(() => {
    const scored = skillStandings
      .filter((s) => s.score != null)
      .sort((a, b) => (a.score as number) - (b.score as number));
    if (scored.length >= 2) {
      return scored.slice(0, 3).map((s) => ({
        skill: s.skill,
        label: s.label,
        badge: `${s.score}/100`,
        detail: s.evidence,
      }));
    }
    return coachPlan.priorityAreas.map((p) => ({
      skill: p.skill,
      label: COACH_SKILL_LABELS[p.skill],
      badge: `Priority #${p.priority}`,
      detail: p.reason,
    }));
  }, [skillStandings, coachPlan.priorityAreas]);

  const finishCoachSession = async () => {
    const completedList = todayPlan.exercises.filter((e) => coachDone[e.id]);
    const seconds = Math.max(accum, Math.max(1, completedList.length) * 90);
    const todayRecs = recordings.filter((r) => dateKey(r.createdAt) === todayKeyStr);

    const { debrief, updatedPlan } = generateSessionDebrief({
      durationSec: seconds,
      exercisesCompleted: completedList.length ? completedList : todayPlan.exercises.slice(0, 1),
      sessionRecordings: todayRecs,
      allRecordings: recordings,
      profile,
      plan: coachPlan,
    });

    addLog({
      seconds,
      mode: "daily-coach",
      completed: completedList.length,
      scores: null,
      overallScore: debrief.avgOverallScore,
      note: `Personalized Daily Session — ${todayPlan.focusLabel}`,
    });
    await saveDebrief(debrief, updatedPlan);
    setDebriefModal(debrief);
    setCoachDone({});
    setAccum(0);
    toast("Session logged & coach plan updated!");
  };

  const finishCurriculumSession = () => {
    const seconds = Math.max(accum, curriculumDoneCount * 45);
    addLog({
      seconds,
      mode: "daily",
      completed: curriculumDoneCount,
      scores: null,
      note: `${dayProgressLabel(day)} — ${pday.title}`,
    });
    markDayDone(day);
    toast(`Session logged: ${fmtDur(seconds)}, ${curriculumDoneCount}/${allCurriculumEx.length} exercises`);
    setCurriculumDone({});
    setAccum(0);
  };

  const sendScript = (title: string, text: string) => {
    setSettings({ task: { title, mode: "daily", script: text } });
    nav("record");
  };

  const sendCoachedExercise = (ex: CoachedExercise) => {
    setSettings({
      task: {
        title: ex.title,
        mode: ex.materialType === "impromptu" ? "impromptu" : "daily-coach",
        script: ex.plainText,
        exerciseId: ex.id,
        targetWpm: ex.targetWpm,
        annotatedText: ex.annotatedText,
        coaching: {
          whatToDo: ex.whatToDo,
          howToSpeak: ex.howToSpeak,
          emphasisWords: ex.emphasisWords,
          pauseNotes: ex.pauseNotes,
          mistakesToAvoid: ex.mistakesToAvoid,
        },
      },
    });
    nav("record");
  };

  return (
    <div className="grid gap-5">
      {/* HERO DAILY COACH DASHBOARD */}
      <section className="coach-hero p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Ring value={goalValue} size={84} stroke={7}>
            <div className="text-center">
              <p className="font-display text-[17px] font-bold leading-none">{Math.round(goalValue * 100)}%</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">today</p>
            </div>
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">Level {coachPlan.adaptiveLevel} · {coachPlan.difficulty}</Chip>
              <Chip tone="accent">Focus: {todayPlan.focusLabel}</Chip>
              <Chip>Target {coachPlan.targetWpmMin}–{coachPlan.targetWpmMax} WPM</Chip>
              {todayDebrief && <Chip tone="good">Today&apos;s session completed ✓</Chip>}
            </div>

            <h2 className="mt-2 font-display text-[22px] font-bold tracking-tight sm:text-[25px]">
              {profile.name ? `Welcome back, ${profile.name}` : "Your Daily Speech Coaching Session"}
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
              {todayPlan.coachRationale}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => setGuidedOpen(true)} className="px-5 py-3 text-[14px]">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3.5 2.5v9l7-4.5z" />
              </svg>
              Start Today&apos;s Training
            </Btn>
            <Btn variant="ghost" onClick={() => nav("record")}>
              Quick Record
            </Btn>
          </div>
        </div>

        {/* Key dashboard stat bar */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            label="Current Streak"
            value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
            sub={`Best ${stats.bestStreak}d · ${stats.daysPracticed} total days`}
            tone="accent"
          />
          <Stat
            label="Today's Progress"
            value={`${Math.round(todaySecs / 60)} / ${goalMin} min`}
            sub={`${todayDebrief ? todayDebrief.exercisesCompleted.length : coachDoneCount} of ${todayPlan.exercises.length} exercises`}
            tone="brand"
          />
          <Stat
            label="Speaking Score"
            value={improvement.currentAvg != null ? `${improvement.currentAvg}/100` : "No baseline"}
            sub={
              improvement.delta != null && improvement.recordingCount >= 2
                ? `${improvement.delta >= 0 ? "+" : ""}${improvement.delta} pts vs Day 1 baseline`
                : improvement.recordingCount === 1
                ? "Baseline established — keep recording"
                : "Record 1 take to set baseline"
            }
          />
          <Stat
            label="Needs Attention"
            value={activeWeaknesses[0]?.label.split("&")[0].trim() ?? "Clarity"}
            sub={activeWeaknesses[0]?.badge ?? "Priority #1"}
            tone="bad"
          />
        </div>
      </section>

      {/* Baseline nudge if skipped during onboarding */}
      {recordings.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--panel))] px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold">Record your 60-second Speaking Baseline</p>
            <p className="text-[12px] text-[var(--muted)]">
              One short recording establishes your starting WPM, filler rate, pause rhythm, and pitch range so every future improvement is measured honestly.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="soft" onClick={() => setOnboardingOpen(true)}>
              Take Initial Assessment
            </Btn>
          </div>
        </div>
      )}

      {/* Main grid + sidebar */}
      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="grid content-start gap-5">
          {/* Switcher: Personalized Today vs 12-Week Curriculum */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
              <button
                type="button"
                onClick={() => setTab("coach")}
                className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === "coach" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                Today&apos;s Coach Plan ({todayPlan.exercises.length + 1} steps · ~{todayPlan.totalMinutes}m)
              </button>
              <button
                type="button"
                onClick={() => setTab("curriculum")}
                className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === "curriculum" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                12-Week Curriculum ({dayProgressLabel(day)})
              </button>
            </div>
            <span className="text-[12px] text-[var(--muted)]">
              {tab === "coach"
                ? "Auto-selected for your weaknesses & schedule"
                : `${week.title} · ${pday.title}`}
            </span>
          </div>

          {/* TAB 1: PERSONALIZED COACH SESSION */}
          {tab === "coach" && (
            <div className="grid gap-3">
              {/* Warm-up card */}
              <div className="xcard">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="xnum">0</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{todayPlan.breathingWarmup.title}</span>
                        <Chip tone="brand">warm-up · {todayPlan.breathingWarmup.minutes} min</Chip>
                      </div>
                      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                        {todayPlan.breathingWarmup.patternLabel} · {todayPlan.breathingWarmup.cycles} cycles before speaking.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="soft" onClick={() => nav("breathe")}>Open Breathing Trainer</Btn>
                  </div>
                </div>
              </div>

              {todayPlan.exercises.map((ex, i) => (
                <CoachedExerciseCard
                  key={ex.id}
                  ex={ex}
                  index={i}
                  done={!!coachDone[ex.id]}
                  onDone={() => setCoachDone((d) => ({ ...d, [ex.id]: !d[ex.id] }))}
                  onTick={() => setAccum((a) => a + 1)}
                  onRecordExercise={sendCoachedExercise}
                />
              ))}

              {/* Finish & get smart daily debrief */}
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">Finish today&apos;s coached session</p>
                    <p className="text-[12.5px] text-[var(--muted)]">
                      Get your Smart Daily Coach Debrief: performance summary, #1 weakness, 3 specific suggestions, tomorrow&apos;s plan, and adaptive difficulty update.
                    </p>
                  </div>
                  <Btn variant="soft" onClick={() => setGuidedOpen(true)}>
                    Guided Mode
                  </Btn>
                  <Btn onClick={() => void finishCoachSession()} disabled={coachDoneCount === 0 && accum === 0 && recordings.filter((r) => dateKey(r.createdAt) === todayKeyStr).length === 0}>
                    Complete & Get Debrief
                  </Btn>
                </div>
              </Card>

              {/* Show latest coach debrief summary if user already finished a session */}
              {debriefs[0] && (
                <Card
                  title="Latest Coach Debrief"
                  sub={`${debriefs[0].date} · ${debriefs[0].avgOverallScore != null ? `${debriefs[0].avgOverallScore}/100 avg` : "Session completed"}`}
                  right={<Chip tone="brand">Plan evolved</Chip>}
                >
                  <p className="text-[13px] leading-relaxed text-[var(--ink)]">{debriefs[0].summary}</p>
                  <p className="mt-2 text-[12px] text-[var(--muted)]">
                    <strong className="text-[var(--ink)]">Top focus identified:</strong> {debriefs[0].biggestWeakness.label} — {debriefs[0].biggestWeakness.evidence}
                  </p>
                  <ul className="mt-2.5 grid gap-1.5">
                    {debriefs[0].suggestions.map((s, i) => (
                      <li key={i} className="text-[12.5px] leading-relaxed text-[var(--muted)]">
                        <span className="mr-1.5 font-bold text-[var(--brand)]">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: PRESERVED 12-WEEK CURRICULUM (84 DAYS) */}
          {tab === "curriculum" && (
            <div className="grid gap-4">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="brand">{dayProgressLabel(day)}</Chip>
                      <Chip>{week.title}</Chip>
                      <Chip tone="accent">target ~{pday.targetWpm} wpm</Chip>
                      {settings.completedDays.includes(`day-${day}`) && <Chip tone="good">Day completed</Chip>}
                    </div>
                    <h3 className="mt-2 font-display text-[19px] font-semibold tracking-tight">{pday.title}</h3>
                    <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                      Focus: {pday.focus} · {Math.round(allCurriculumEx.reduce((a, e) => a + e.durationSec, 0) / 60)} min planned
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn variant="ghost" onClick={() => setSettings({ currentDay: Math.max(1, day - 1) })} title="Previous day">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3L5 7l4 4" /></svg>
                    </Btn>
                    <Select value={day} onChange={(e) => setSettings({ currentDay: Number(e.target.value) })} className="w-[155px]">
                      {PROGRAM.flatMap((w) => w.days.map((d) => ({ d, n: (w.week - 1) * 7 + d.day }))).map(({ d, n }) => (
                        <option key={n} value={n}>W{Math.ceil(n / 7)} D{((n - 1) % 7) + 1}: {d.title.slice(0, 18)}</option>
                      ))}
                    </Select>
                    <Btn variant="ghost" onClick={() => setSettings({ currentDay: Math.min(84, day + 1) })} title="Next day">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3l4 4-4 4" /></svg>
                    </Btn>
                  </div>
                </div>
              </Card>

              <div className="grid gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <SectionLabel>Warm-up — {curriculumDoneCount}/{allCurriculumEx.length} complete</SectionLabel>
                </div>
                {pday.warmup.map((e, i) => (
                  <ProgramExerciseCard
                    key={e.id}
                    ex={e}
                    index={i}
                    done={!!curriculumDone[e.id]}
                    onDone={() => setCurriculumDone((d) => ({ ...d, [e.id]: !d[e.id] }))}
                    onTick={() => setAccum((a) => a + 1)}
                    onSendScript={sendScript}
                  />
                ))}
                <div className="mt-2 px-1">
                  <SectionLabel>Main exercises</SectionLabel>
                </div>
                {pday.main.map((e, i) => (
                  <ProgramExerciseCard
                    key={e.id}
                    ex={e}
                    index={i + pday.warmup.length}
                    done={!!curriculumDone[e.id]}
                    onDone={() => setCurriculumDone((d) => ({ ...d, [e.id]: !d[e.id] }))}
                    onTick={() => setAccum((a) => a + 1)}
                    onSendScript={sendScript}
                  />
                ))}
              </div>

              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">Finish curriculum day</p>
                    <p className="text-[12.5px] text-[var(--muted)]">
                      Logs {fmtDur(Math.max(accum, curriculumDoneCount * 45))} of practice ({curriculumDoneCount}/{allCurriculumEx.length} exercises).
                    </p>
                  </div>
                  <Btn onClick={finishCurriculumSession} disabled={curriculumDoneCount === 0 && accum === 0}>
                    Log session
                  </Btn>
                  {allCurriculumDone && (
                    <Btn
                      variant="soft"
                      onClick={() => {
                        setSettings({ currentDay: Math.min(84, day + 1) });
                        toast("Moved to the next day", "info");
                      }}
                    >
                      Next day →
                    </Btn>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="grid content-start gap-5">
          {/* Weaknesses needing attention */}
          <Card title="Weaknesses needing attention" sub="Updated automatically from your recordings & profile.">
            <div className="grid gap-2.5">
              {activeWeaknesses.map((w, idx) => (
                <div key={w.skill} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{w.label}</span>
                    <Chip tone={idx === 0 ? "bad" : "warn"}>{w.badge}</Chip>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--muted)]">{w.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="soft" onClick={() => nav("modes")}>Targeted Practice →</Btn>
              <Btn variant="ghost" onClick={() => nav("progress")}>Full Report</Btn>
            </div>
          </Card>

          {/* Compact Training Calendar */}
          <Card title="Training calendar" sub="Keep your consistency visible.">
            <TrainingCalendar logs={logs} goalMin={goalMin} compact />
          </Card>

          {/* Today's impromptu topic */}
          <Card title="Today's impromptu topic" sub="30 seconds to think. 90 seconds to speak. No notes.">
            <div className="grid gap-2">
              {pday.impromptu.map((t, i) => (
                <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13px] leading-relaxed">
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="soft" onClick={() => sendScript(pday.impromptu[0], "")}>
                Record this
              </Btn>
              <Btn variant="ghost" onClick={() => nav("modes")}>
                More topics →
              </Btn>
            </div>
          </Card>

          {pday.script && (
            <Card
              title="Curriculum script"
              sub={pday.script.title}
              right={
                <button
                  className="chip chip-muted cursor-pointer hover:chip-hover"
                  onClick={() => setScriptOpen((o) => !o)}
                >
                  {scriptOpen ? "Hide" : "Show"}
                </button>
              }
            >
              {scriptOpen ? (
                <div className="grid gap-3">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed">{pday.script.text}</p>
                  <Btn variant="soft" onClick={() => sendScript(pday.script!.title, pday.script!.text)}>
                    Read it in the Recorder
                  </Btn>
                </div>
              ) : (
                <p className="text-[12.5px] text-[var(--muted)]">
                  A {pday.script.text.split(/\s+/).length}-word script for {dayProgressLabel(day)}. Expand or send to Recorder.
                </p>
              )}
            </Card>
          )}

          {/* Personal Pronunciation Word Bank & Due Spaced Reviews */}
          <Card
            title="My Pronunciation Word Bank"
            sub={
              dueWords.length > 0
                ? `${dueWords.length} difficult word${dueWords.length === 1 ? "" : "s"} due for spaced review today`
                : `${words.length} saved word${words.length === 1 ? "" : "s"} tracked`
            }
            right={
              <Btn variant="soft" onClick={() => openAddWord("", "manual")}>
                + Add Word
              </Btn>
            }
          >
            {words.length === 0 ? (
              <div className="grid gap-2.5">
                <p className="text-[12.5px] text-[var(--muted)]">
                  Save words you find hard to pronounce. They automatically weave into your daily sentences, paragraphs, and spaced-repetition drills.
                </p>
                <Btn variant="ghost" onClick={() => nav("words")}>
                  Open Word Bank →
                </Btn>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {(dueWords.length > 0 ? dueWords : words).slice(0, 6).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setPracticeWordId(w.id)}
                      className={`chip cursor-pointer hover:brightness-95 ${
                        w.status === "difficult" ? "chip-bad" : w.status === "learning" ? "chip-warn" : "chip-good"
                      }`}
                      title={`Practice "${w.word}" (${w.phonetic}) — ${w.masteryScore}/100`}
                    >
                      {w.word} · {w.masteryScore}%
                    </button>
                  ))}
                </div>
                {weakSounds.length > 0 && (
                  <div className="rounded-lg bg-[var(--panel2)] px-3 py-2 text-[11.5px] text-[var(--muted)]">
                    <strong className="text-[var(--ink)]">Detected weak sounds: </strong>
                    {weakSounds.slice(0, 3).map((s) => `${s.short} (${s.phonemes})`).join(" · ")}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {dueWords.length > 0 && (
                    <Btn onClick={() => setPracticeWordId(dueWords[0].id)}>
                      Practice Due Word →
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => nav("words")}>
                    Open Word Bank
                  </Btn>
                </div>
              </div>
            )}
          </Card>

          {/* Favorites */}
          <Card title="Your favorite exercises" sub="Starred from the Library.">
            {favorites.length === 0 ? (
              <div className="grid gap-2">
                <p className="text-[12.5px] text-[var(--muted)]">
                  No favorites yet. Star exercises in the Library for quick access here.
                </p>
                <Btn variant="ghost" onClick={() => nav("library")}>
                  Open Library →
                </Btn>
              </div>
            ) : (
              <div className="grid gap-2">
                {favorites.map((f) => (
                  <div key={f.id} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium leading-tight">{f.name}</span>
                      <span className="text-[11px] tabular-nums text-[var(--muted)]">{fmtDur(f.durationSec)}</span>
                    </div>
                    <div className="mt-2">
                      <Timer resetKey={f.id} seconds={f.durationSec} onTick={() => setAccum((a) => a + 1)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* End-of-session Smart Coach Debrief Modal (when finished directly from Dashboard) */}
      <Modal
        open={!!debriefModal}
        onClose={() => setDebriefModal(null)}
        title="Smart Daily Coach Debrief"
        wide
      >
        {debriefModal && (
          <div className="grid gap-4">
            <div className="coach-hero p-4">
              <div className="flex flex-wrap gap-2">
                <Chip tone="good">Session Saved</Chip>
                {debriefModal.avgOverallScore != null && (
                  <Chip tone="brand">Score: {debriefModal.avgOverallScore}/100</Chip>
                )}
                {debriefModal.avgWpm != null && <Chip>Avg pace: {debriefModal.avgWpm} WPM</Chip>}
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed">{debriefModal.summary}</p>
              <p className="mt-1.5 text-[12px] font-medium text-[var(--brand)]">
                {debriefModal.planChangeNote}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
              <SectionLabel>Biggest Weakness Identified</SectionLabel>
              <p className="mt-1 text-[14px] font-semibold">{debriefModal.biggestWeakness.label}</p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{debriefModal.biggestWeakness.evidence}</p>
            </div>

            <div>
              <SectionLabel>Three Specific Improvement Suggestions</SectionLabel>
              <ol className="mt-2 grid gap-2">
                {debriefModal.suggestions.map((s, i) => (
                  <li key={i} className="rounded-lg bg-[var(--panel2)] p-2.5 text-[12.5px] leading-relaxed">
                    <strong className="mr-1.5 text-[var(--brand)]">{i + 1}.</strong>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <SectionLabel>Recommended for Tomorrow</SectionLabel>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {debriefModal.tomorrowExerciseIds
                  .map((id) => getCoachedExerciseById(id))
                  .filter((x): x is CoachedExercise => Boolean(x))
                  .map((ex) => (
                    <div key={ex.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5">
                      <Chip tone="muted">{MATERIAL_TYPE_LABELS[ex.materialType]}</Chip>
                      <p className="mt-1 text-[12.5px] font-semibold">{ex.title}</p>
                      <p className="text-[11px] text-[var(--muted)]">{fmtDur(ex.durationSec)} · {ex.difficulty}</p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Btn onClick={() => setDebriefModal(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
