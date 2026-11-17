"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { generateSessionDebrief } from "@/lib/adaptiveCoach";
import { getCoachedExerciseById } from "@/lib/materials";
import { stopSpeaking } from "@/lib/tts";
import {
  COACH_SKILL_LABELS,
  MATERIAL_TYPE_LABELS,
  fmtDur,
  type CoachedExercise,
  type Recording,
  type SessionDebrief,
} from "@/lib/types";
import { Btn, Chip, SectionLabel, Timer } from "./ui";
import CoachedText from "./CoachedText";
import InlineRecorder from "./InlineRecorder";

type BreathPhase = "Inhale (3s)" | "Hold (4s)" | "Exhale (6s)";
interface BreathState {
  active: boolean;
  phase: BreathPhase;
  sec: number;
  cycles: number;
}

const INITIAL_BREATH: BreathState = {
  active: false,
  phase: "Inhale (3s)",
  sec: 3,
  cycles: 0,
};

export default function GuidedSessionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    practiceLanguage,
    todayPlan,
    profile,
    coachPlan,
    recordings,
    addLog,
    saveDebrief,
    toast,
  } = useStore();

  // Steps: 0 = breathing warmup, 1..N = coached exercises, N+1 = Smart Daily Debrief
  const exercises = todayPlan.exercises;
  const totalSteps = exercises.length + 1; // warmup + exercises
  const [stepIdx, setStepIdx] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [sessionRecs, setSessionRecs] = useState<Recording[]>([]);
  const [debrief, setDebrief] = useState<SessionDebrief | null>(null);
  const [planNote, setPlanNote] = useState<string>("");
  const startedAtRef = useRef<number>(0);

  // Mini breathing timer state inside Step 0 (single atomic state object so StrictMode never double-increments)
  const [breath, setBreath] = useState<BreathState>(INITIAL_BREATH);

  useEffect(() => {
    if (open) {
      startedAtRef.current = Date.now();
    }
  }, [open]);

  useEffect(() => {
    if (!breath.active) return;
    const iv = setInterval(() => {
      setBreath((prev) => {
        if (!prev.active) return prev;
        if (prev.sec > 1) return { ...prev, sec: prev.sec - 1 };
        if (prev.phase === "Inhale (3s)") return { ...prev, phase: "Hold (4s)", sec: 4 };
        if (prev.phase === "Hold (4s)") return { ...prev, phase: "Exhale (6s)", sec: 6 };
        return { ...prev, phase: "Inhale (3s)", sec: 3, cycles: prev.cycles + 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [breath.active]);

  const currentExercise: CoachedExercise | null =
    stepIdx >= 1 && stepIdx <= exercises.length ? exercises[stepIdx - 1] : null;

  const tomorrowExercises = useMemo(() => {
    if (!debrief) return [];
    return debrief.tomorrowExerciseIds
      .map((id) => getCoachedExerciseById(id))
      .filter((x): x is CoachedExercise => Boolean(x));
  }, [debrief]);

  if (!open) return null;

  const markExerciseComplete = (exId: string) => {
    setCompletedIds((prev) => (prev.includes(exId) ? prev : [...prev, exId]));
  };

  const finishAndDebrief = async () => {
    stopSpeaking();
    setBreath((b) => ({ ...b, active: false }));
    const doneExercises = exercises.filter((e) => completedIds.includes(e.id));
    const effectiveCompleted = doneExercises.length > 0 ? doneExercises : exercises.slice(0, Math.max(1, stepIdx));
    const elapsedSec = Math.max(
      120,
      Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000),
      effectiveCompleted.length * 90
    );

    const mergedAllRecordings = [
      ...sessionRecs,
      ...recordings.filter((r) => !sessionRecs.some((s) => s.id === r.id)),
    ];

    const { debrief: generated, updatedPlan } = generateSessionDebrief({
      durationSec: elapsedSec,
      exercisesCompleted: effectiveCompleted,
      sessionRecordings: sessionRecs,
      allRecordings: mergedAllRecordings,
      profile,
      plan: coachPlan,
      language: practiceLanguage,
    });

    // Only log extra session time if no recordings logged it already, or log the guided coaching completion cleanly
    addLog({
      language: practiceLanguage,
      seconds: sessionRecs.length === 0 ? elapsedSec : Math.max(60, elapsedSec - sessionRecs.reduce((a, r) => a + r.durationSec, 0)),
      mode: "guided-daily",
      completed: effectiveCompleted.length,
      scores: null,
      overallScore: generated.avgOverallScore,
      note: `Daily Guided Coaching (${practiceLanguage === "hi" ? "Hindi" : "English"}) — ${todayPlan.focusLabel}`,
    });

    await saveDebrief(generated, updatedPlan);
    setDebrief(generated);
    setPlanNote(updatedPlan.adjustmentNote);
    setStepIdx(totalSteps);
    toast("Daily coaching session complete — plan updated!");
  };

  const resetAndClose = () => {
    stopSpeaking();
    setBreath(INITIAL_BREATH);
    setStepIdx(0);
    setCompletedIds([]);
    setSessionRecs([]);
    setDebrief(null);
    onClose();
  };

  const pct = debrief ? 100 : Math.round((stepIdx / totalSteps) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={resetAndClose}
    >
      <div
        className="modal-pop flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-[var(--panel)] shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top progress header */}
        <header className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="brand">Guided Daily Session</Chip>
                <span className="text-[12px] font-semibold text-[var(--muted)]">
                  {debrief
                    ? "Session Complete · Smart Coach Debrief"
                    : stepIdx === 0
                    ? `Step 1 of ${totalSteps} · Breathing Warm-up`
                    : `Step ${stepIdx + 1} of ${totalSteps} · ${
                        currentExercise ? MATERIAL_TYPE_LABELS[currentExercise.materialType] : ""
                      }`}
                </span>
              </div>
              <h2 className="mt-1 truncate font-display text-[17px] font-bold">
                {debrief
                  ? "Your Daily Coaching Summary"
                  : stepIdx === 0
                  ? todayPlan.breathingWarmup.title
                  : currentExercise?.title}
              </h2>
            </div>
            <button className="icon-btn shrink-0" onClick={resetAndClose} aria-label="Close session">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
              style={{ width: `${Math.max(8, pct)}%` }}
            />
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP 0: WARMUP */}
          {stepIdx === 0 && !debrief && (
            <div className="grid gap-5">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
                <SectionLabel>Why we start here</SectionLabel>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink)]">
                  {todayPlan.breathingWarmup.instructions}
                </p>
                <p className="mt-2 text-[12px] text-[var(--muted)]">
                  Today&apos;s focus: <strong className="text-[var(--ink)]">{todayPlan.focusLabel}</strong> · {exercises.length} focused speaking exercises ahead (~{todayPlan.totalMinutes} min total).
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-8">
                <div
                  className="flex h-40 w-40 items-center justify-center rounded-full text-center text-white transition-transform duration-700"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, var(--brand-soft), var(--brand) 72%)",
                    transform: breath.active && breath.phase !== "Exhale (6s)" ? "scale(1.16)" : "scale(1)",
                  }}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-85">
                      {breath.active ? breath.phase : "3 · 4 · 6"}
                    </p>
                    <p className="mt-1 font-display text-4xl font-bold tabular-nums">
                      {breath.active ? breath.sec : `${todayPlan.breathingWarmup.cycles}×`}
                    </p>
                    <p className="mt-0.5 text-[11px] opacity-85">
                      {breath.active ? `Cycle ${breath.cycles + 1} of ${todayPlan.breathingWarmup.cycles}` : "Tap Start"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <Btn
                    variant={breath.active ? "soft" : "primary"}
                    onClick={() => {
                      setBreath((b) =>
                        b.active ? { ...b, active: false } : { ...b, active: true, phase: "Inhale (3s)", sec: 3 }
                      );
                    }}
                  >
                    {breath.active ? "Pause breathing" : "Start 3-4-6 warm-up"}
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setBreath((b) => ({ ...b, active: false }));
                      setStepIdx(1);
                    }}
                  >
                    Skip to Exercise 1 →
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* STEPS 1..N: COACHED EXERCISE */}
          {currentExercise && !debrief && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="brand">{MATERIAL_TYPE_LABELS[currentExercise.materialType]}</Chip>
                  <Chip tone={currentExercise.difficulty === "beginner" ? "good" : currentExercise.difficulty === "intermediate" ? "warn" : "bad"}>
                    {currentExercise.difficulty}
                  </Chip>
                  <Chip tone="accent">Target ~{currentExercise.targetWpm} WPM</Chip>
                  {completedIds.includes(currentExercise.id) && <Chip tone="good">✓ Completed</Chip>}
                </div>
                <Timer
                  key={currentExercise.id}
                  resetKey={currentExercise.id}
                  seconds={currentExercise.durationSec}
                  onComplete={() => toast(`Time's up on "${currentExercise.title}" — great focus!`, "ok")}
                />
              </div>

              <CoachedText exercise={currentExercise} />

              <div className="border-t border-[var(--line)] pt-4">
                <SectionLabel>Record & Get Instant Coaching Assessment</SectionLabel>
                <p className="mt-1 mb-3 text-[12px] text-[var(--muted)]">
                  Speak the material aloud (or speak spontaneously for impromptu topics) to measure your WPM, fillers, pause rhythm, pitch variety, and specific word accuracy.
                </p>
                <InlineRecorder
                  key={currentExercise.id}
                  title={currentExercise.title}
                  mode={currentExercise.materialType === "impromptu" ? "impromptu" : "guided-daily"}
                  language={currentExercise.language ?? practiceLanguage}
                  scriptText={currentExercise.plainText || null}
                  exerciseId={currentExercise.id}
                  targetWpm={currentExercise.targetWpm}
                  saveLabel="Save Take & Mark Complete"
                  compact
                  onSaved={(rec) => {
                    setSessionRecs((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
                    markExerciseComplete(currentExercise.id);
                  }}
                />
              </div>
            </div>
          )}

          {/* FINAL STEP: SMART DAILY COACH DEBRIEF */}
          {debrief && (
            <div className="grid gap-5">
              <div className="coach-hero p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="good">Daily Session Logged</Chip>
                  {debrief.avgOverallScore != null && (
                    <Chip tone="brand">Session Score: {debrief.avgOverallScore}/100</Chip>
                  )}
                  {debrief.avgWpm != null && <Chip>Avg Pace: {debrief.avgWpm} WPM</Chip>}
                  <Chip>Duration: {fmtDur(debrief.durationSec)}</Chip>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--ink)]">{debrief.summary}</p>
                <p className="mt-2 text-[12.5px] font-medium text-[var(--brand)]">
                  Training Plan Updated: {planNote}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_6%,var(--panel))] p-4">
                  <SectionLabel>Biggest Weakness to Target Next</SectionLabel>
                  <p className="mt-2 font-display text-[17px] font-bold">{debrief.biggestWeakness.label}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                    {debrief.biggestWeakness.evidence}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
                  <SectionLabel>Updated Priority Focus Areas</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {coachPlan.priorityAreas.map((p) => (
                      <Chip key={p.skill} tone={p.priority === 1 ? "brand" : "muted"}>
                        #{p.priority} {COACH_SKILL_LABELS[p.skill]}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-[var(--muted)]">
                    Adaptive Level {coachPlan.adaptiveLevel} ({coachPlan.difficulty}) · Target {coachPlan.targetWpmMin}–{coachPlan.targetWpmMax} WPM
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <SectionLabel>Three Specific Improvement Suggestions</SectionLabel>
                <ol className="mt-2.5 grid gap-2">
                  {debrief.suggestions.map((sug, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {tomorrowExercises.length > 0 && (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                  <SectionLabel>Recommended for Tomorrow&apos;s Session</SectionLabel>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    {tomorrowExercises.map((ex) => (
                      <div key={ex.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                        <Chip tone="muted">{MATERIAL_TYPE_LABELS[ex.materialType]}</Chip>
                        <p className="mt-1.5 text-[13px] font-semibold leading-snug">{ex.title}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {fmtDur(ex.durationSec)} · ~{ex.targetWpm} WPM · {ex.difficulty}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer controls */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
          {!debrief ? (
            <>
              <Btn
                variant="ghost"
                disabled={stepIdx === 0}
                onClick={() => {
                  stopSpeaking();
                  setStepIdx((s) => Math.max(0, s - 1));
                }}
              >
                ← Previous
              </Btn>
              <div className="flex flex-wrap items-center gap-2">
                {currentExercise && !completedIds.includes(currentExercise.id) && (
                  <Btn variant="soft" onClick={() => markExerciseComplete(currentExercise.id)}>
                    Mark practiced (without recording)
                  </Btn>
                )}
                {stepIdx < exercises.length ? (
                  <Btn
                    onClick={() => {
                      stopSpeaking();
                      if (currentExercise) markExerciseComplete(currentExercise.id);
                      setBreath((b) => ({ ...b, active: false }));
                      setStepIdx((s) => s + 1);
                    }}
                  >
                    {stepIdx === 0 ? "Begin Exercise 1 →" : "Next Exercise →"}
                  </Btn>
                ) : (
                  <Btn onClick={() => void finishAndDebrief()}>
                    Finish & Get Coach Debrief →
                  </Btn>
                )}
              </div>
            </>
          ) : (
            <div className="flex w-full justify-end">
              <Btn onClick={resetAndClose}>Done — Back to Dashboard</Btn>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
