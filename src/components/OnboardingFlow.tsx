"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { buildInitialPlan } from "@/lib/adaptiveCoach";
import { getDiagnosticForLanguage } from "@/lib/materials";
import {
  COACH_SKILL_LABELS,
  GOAL_OPTIONS,
  type CoachSkillKey,
  type DetailedAssessment,
  type Difficulty,
  type SpeakingGoalId,
  type UserProfile,
} from "@/lib/types";
import { Btn, Card, Chip, Field, Input, SectionLabel } from "./ui";
import CoachedText from "./CoachedText";
import InlineRecorder from "./InlineRecorder";

const WEAKNESS_OPTIONS: { key: CoachSkillKey; label: string; hint: string }[] = [
  { key: "pronunciation", label: "Pronunciation & articulation", hint: "Tricky consonants, mumbling, or unclear word endings" },
  { key: "pacing", label: "Speaking too fast or too slow", hint: "Rushing under pressure or choppy rhythm" },
  { key: "fluency", label: "Filler words & hesitation", hint: "Saying um, uh, like, you know, or restarting sentences" },
  { key: "pausesBreathing", label: "Pauses & breathing control", hint: "Running out of breath or skipping natural pauses" },
  { key: "projection", label: "Voice projection & volume", hint: "Sounding too quiet or trailing off at sentence ends" },
  { key: "expression", label: "Flat tone / monotone delivery", hint: "Wanting natural pitch variety and emotional emphasis" },
  { key: "clarity", label: "Overall speech clarity", hint: "People occasionally asking you to repeat yourself" },
  { key: "confidence", label: "Confidence & spontaneous speaking", hint: "Freezing up during impromptu questions or meetings" },
];

const TIME_OPTIONS = [
  { min: 10, label: "10 min / day", desc: "Quick daily anchor — 2–3 crisp drills" },
  { min: 15, label: "15 min / day", desc: "Balanced coach session — recommended for most learners" },
  { min: 20, label: "20 min / day", desc: "Focused growth — drills + passage + spontaneous talk" },
  { min: 30, label: "30 min / day", desc: "Deep training — endurance passages + retries" },
];

export default function OnboardingFlow({
  onFinished,
  isReassessment = false,
  onCancel,
}: {
  onFinished: (startNow: boolean) => void;
  isReassessment?: boolean;
  onCancel?: () => void;
}) {
  const { profile: existingProfile, practiceLanguage, completeOnboarding, toast } = useStore();
  const diagEx = useMemo(() => getDiagnosticForLanguage(practiceLanguage), [practiceLanguage]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isReassessment ? 2 : 1);

  const [name, setName] = useState(existingProfile.name);
  const [goals, setGoals] = useState<SpeakingGoalId[]>(
    existingProfile.goals.length ? existingProfile.goals : ["clarity_pronunciation"]
  );
  const [experienceLevel, setExperienceLevel] = useState<Difficulty>(existingProfile.experienceLevel);
  const [weaknesses, setWeaknesses] = useState<CoachSkillKey[]>(
    existingProfile.selfWeaknesses.length ? existingProfile.selfWeaknesses : ["clarity", "pacing", "fluency"]
  );
  const [dailyMinutes, setDailyMinutes] = useState<number>(existingProfile.dailyMinutes || 15);
  const [baselineId, setBaselineId] = useState<string | null>(existingProfile.baselineRecordingId);
  const [baselineAssessment, setBaselineAssessment] = useState<DetailedAssessment | null>(null);

  const toggleGoal = (id: SpeakingGoalId) => {
    setGoals((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const toggleWeakness = (key: CoachSkillKey) => {
    setWeaknesses((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((x) => x !== key) : prev) : [...prev, key]
    );
  };

  const draftProfile: UserProfile = useMemo(
    () => ({
      name: name.trim(),
      goals,
      experienceLevel,
      selfWeaknesses: weaknesses,
      dailyMinutes,
      onboardingCompleted: true,
      onboardingCompletedAt: existingProfile.onboardingCompletedAt,
      baselineRecordingId: baselineId,
    }),
    [name, goals, experienceLevel, weaknesses, dailyMinutes, existingProfile.onboardingCompletedAt, baselineId]
  );

  const generatedPlan = useMemo(
    () => buildInitialPlan(draftProfile, baselineAssessment),
    [draftProfile, baselineAssessment]
  );

  const finalize = (startNow: boolean) => {
    completeOnboarding({ ...draftProfile, onboardingCompletedAt: Date.now() }, generatedPlan);
    toast(
      startNow
        ? "Personal training plan created — starting today's guided session!"
        : "Your personalized speech training plan is ready!"
    );
    onFinished(startNow);
  };

  return (
    <div className="mx-auto max-w-[920px] py-4">
      {/* Progress stepper */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: "Welcome" },
            { n: 2, label: "Your Profile" },
            { n: 3, label: "Speaking Baseline" },
            { n: 4, label: "Personal Plan" },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  step === s.n
                    ? "bg-[var(--brand)] text-white"
                    : step > s.n
                    ? "bg-[var(--good)] text-white"
                    : "border border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)]"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </span>
              <span className={`hidden text-[12px] font-semibold sm:inline ${step === s.n ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                {s.label}
              </span>
              {s.n < 4 && <span className="mx-1 hidden h-px w-5 bg-[var(--line)] sm:inline-block" />}
            </div>
          ))}
        </div>
        {onCancel && (
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
        )}
      </div>

      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="coach-hero p-6 sm:p-9">
          <Chip tone="brand">Personal AI Speech Training Coach</Chip>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
            Train your voice like a craft — with clear daily coaching and honest feedback.
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[var(--muted)]">
            In three minutes, we will learn your goals, record a short optional baseline check, and build a calm daily routine sized to your schedule. Every day you open SpeechCoach, your next focused session will be waiting — no guesswork, no clutter.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <p className="font-display text-[14px] font-semibold">1. Guided Daily Materials</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">
                Sentences, passages, tongue twisters, stories, conversations, and impromptu prompts — each with emphasis marks, breath cues, and model audio.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <p className="font-display text-[14px] font-semibold">2. Explainable Voice Analysis</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">
                Real on-device measurements for WPM, fillers, pauses, volume steadiness, and pitch span — transparently separated from subjective listening checks.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <p className="font-display text-[14px] font-semibold">3. Adaptive Personal Coach</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">
                Tracks your streaks and recurring mistakes locally in your browser, steps difficulty up or down automatically, and evolves your plan after each session.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Btn onClick={() => setStep(2)} className="px-5 py-2.5 text-[14px]">
              Build My Training Plan →
            </Btn>
            <Btn variant="ghost" onClick={() => finalize(false)}>
              Skip setup & explore dashboard
            </Btn>
            <span className="ml-auto text-[11.5px] text-[var(--muted)]">
              100% private · Audio & progress stay locally on this device
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: GOALS, LEVEL, WEAKNESSES, DAILY TIME */}
      {step === 2 && (
        <Card
          title="Tell your coach about your voice"
          sub="We use this to pick beginner-friendly starting exercises and avoid overwhelming your daily routine."
        >
          <div className="grid gap-6">
            <div className="max-w-sm">
              <Field label="What should your coach call you? (optional)">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan"
                />
              </Field>
            </div>

            <div>
              <SectionLabel>1. What are your speaking goals? (pick one or more)</SectionLabel>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {GOAL_OPTIONS.map((g) => {
                  const on = goals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        on
                          ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_10%,var(--panel))]"
                          : "border-[var(--line)] bg-[var(--panel2)] hover:border-[var(--muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold">{g.label}</span>
                        <span className={`text-[12px] font-bold ${on ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
                          {on ? "✓" : "+"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--muted)]">{g.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionLabel>2. Current speaking experience level</SectionLabel>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                {[
                  { id: "beginner" as Difficulty, label: "Beginner", desc: "Building clear habits, calm pace, and basic confidence." },
                  { id: "intermediate" as Difficulty, label: "Intermediate", desc: "Comfortable talking, ready to remove fillers and add polish." },
                  { id: "advanced" as Difficulty, label: "Advanced", desc: "Refining executive presence, vocal variety, and tough Q&A." },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setExperienceLevel(lvl.id)}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      experienceLevel === lvl.id
                        ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_10%,var(--panel))]"
                        : "border-[var(--line)] bg-[var(--panel2)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <p className="text-[13.5px] font-semibold">{lvl.label}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--muted)]">{lvl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>3. Which weaknesses do you notice most right now?</SectionLabel>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {WEAKNESS_OPTIONS.map((w) => {
                  const on = weaknesses.includes(w.key);
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => toggleWeakness(w.key)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left transition ${
                        on
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_11%,var(--panel))]"
                          : "border-[var(--line)] bg-[var(--panel2)] hover:border-[var(--muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold">{w.label}</span>
                        <span className={`text-[11px] font-bold ${on ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                          {on ? "Selected" : "+"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{w.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionLabel>4. Realistic daily practice time</SectionLabel>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-4">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.min}
                    type="button"
                    onClick={() => setDailyMinutes(t.min)}
                    className={`rounded-xl border p-3 text-left transition ${
                      dailyMinutes === t.min
                        ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_10%,var(--panel))]"
                        : "border-[var(--line)] bg-[var(--panel2)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <p className="font-display text-[15px] font-bold">{t.label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
              {!isReassessment ? (
                <Btn variant="ghost" onClick={() => setStep(1)}>← Back</Btn>
              ) : (
                <span />
              )}
              <Btn onClick={() => setStep(3)}>Continue to Initial Voice Check →</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: INITIAL SPEAKING ASSESSMENT */}
      {step === 3 && (
        <Card
          title="Initial Speaking Assessment (60 seconds)"
          sub="Read the short calibrated passage below once. We will measure your starting pace, pause cadence, fillers, volume steadiness, and vocal pitch range to calibrate your plan."
          right={
            <Btn variant="ghost" onClick={() => setStep(4)}>
              Skip voice check for now →
            </Btn>
          }
        >
          <div className="grid gap-5">
            <CoachedText exercise={diagEx} compact />
            <InlineRecorder
              title={practiceLanguage === "hi" ? "Hindi Speaking Baseline" : "Initial Speaking Baseline"}
              mode="diagnostic"
              language={practiceLanguage}
              scriptText={diagEx.plainText}
              exerciseId={diagEx.id}
              targetWpm={diagEx.targetWpm}
              saveLabel="Save Baseline & Generate My Plan →"
              compact
              onSaved={(rec, assessment) => {
                setBaselineId(rec.id);
                setBaselineAssessment(assessment);
                setStep(4);
              }}
            />
            <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
              <Btn variant="ghost" onClick={() => setStep(2)}>← Back to Profile</Btn>
              <Btn variant="soft" onClick={() => setStep(4)}>
                {baselineAssessment ? "View My Personalized Plan →" : "Continue without voice baseline →"}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: PERSONALIZED TRAINING PLAN */}
      {step === 4 && (
        <div className="grid gap-5">
          <div className="coach-hero p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="good">Plan Ready</Chip>
              <Chip tone="brand">Adaptive Level {generatedPlan.adaptiveLevel} · {generatedPlan.difficulty}</Chip>
              <Chip tone="accent">Target pace: {generatedPlan.targetWpmMin}–{generatedPlan.targetWpmMax} WPM</Chip>
              <Chip>{dailyMinutes} min / day</Chip>
            </div>
            <h2 className="mt-3 font-display text-[24px] font-bold tracking-tight">
              {name.trim() ? `${name.trim()}'s Personalized Speech Training Plan` : "Your Personalized Speech Training Plan"}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted)]">
              {generatedPlan.adjustmentNote}
            </p>
            {baselineAssessment && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="brand">Baseline Overall Score: {baselineAssessment.overallScore}/100</Chip>
                <Chip>Pace: {baselineAssessment.dimensions.pace.rawDisplay}</Chip>
                <Chip>Fillers: {baselineAssessment.dimensions.fluency.rawDisplay}</Chip>
                <Chip>Expression: {baselineAssessment.dimensions.expression.rawDisplay}</Chip>
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Your Top 3 Priority Areas" sub="Your coach automatically weights daily exercises toward these areas.">
              <div className="grid gap-3">
                {generatedPlan.priorityAreas.map((p) => (
                  <div key={p.skill} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-white">
                        {p.priority}
                      </span>
                      <span className="text-[13.5px] font-semibold">{COACH_SKILL_LABELS[p.skill]}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{p.reason}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Your Daily Training Blueprint" sub={`Sized cleanly for ${dailyMinutes} minutes — focused, never overwhelming.`}>
              <ol className="grid gap-2.5">
                {generatedPlan.dailyBlueprint.map((slot, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[11px] font-bold text-[var(--brand)] border border-[var(--line)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold">{slot.slot}</span>
                        <Chip tone="muted">{slot.minutes} min</Chip>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]">{slot.focus}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold">Ready for Day 1?</p>
                <p className="text-[12.5px] text-[var(--muted)]">
                  Start your first guided session now, or open your Daily Dashboard to browse the full 12-week program and practice studio.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="ghost" onClick={() => setStep(3)}>← Re-check voice</Btn>
                <Btn variant="soft" onClick={() => finalize(false)}>Go to Dashboard</Btn>
                <Btn onClick={() => finalize(true)}>Start Today&apos;s Training →</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
