"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { MODES, SCENARIOS, type ModeContent, type Scenario } from "@/lib/program";
import { COACHED_MATERIALS } from "@/lib/materials";
import {
  MATERIAL_TYPE_LABELS,
  fmtDur,
  type CoachedExercise,
  type Difficulty,
  type PracticeMaterialType,
} from "@/lib/types";
import { Btn, Card, Chip, SectionLabel, Textarea } from "./ui";
import CoachedText from "./CoachedText";

function speak(text: string, rate: number) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS unavailable */
  }
}

function StopTTS() {
  return (
    <Btn
      variant="ghost"
      onClick={() => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      }}
    >
      Stop voice
    </Btn>
  );
}

const MATERIAL_TYPES: PracticeMaterialType[] = [
  "short_sentence",
  "paragraph",
  "long_passage",
  "storytelling",
  "tongue_twister",
  "conversation",
  "impromptu",
];

export default function ModesView({ nav }: { nav: (v: string) => void }) {
  const { settings, coachPlan, profile, setSettings, toast } = useStore();
  const [section, setSection] = useState<"materials" | "modes">("materials");
  const [focusTrack, setFocusTrack] = useState<"all" | "stammering" | "youtube">(() =>
    profile.goals.includes("stammer_fluency")
      ? "stammering"
      : profile.goals.includes("youtube_creator")
      ? "youtube"
      : "all"
  );
  const [matType, setMatType] = useState<PracticeMaterialType | "all">("all");
  const [matDiff, setMatDiff] = useState<Difficulty | "all">("all");
  const [selectedMaterial, setSelectedMaterial] = useState<CoachedExercise>(() => {
    if (profile.goals.includes("stammer_fluency")) {
      return COACHED_MATERIALS.find((m) => m.focusTags?.includes("stammering")) ?? COACHED_MATERIALS[0];
    }
    if (profile.goals.includes("youtube_creator")) {
      return COACHED_MATERIALS.find((m) => m.focusTags?.includes("youtube")) ?? COACHED_MATERIALS[0];
    }
    return COACHED_MATERIALS.find((m) => m.difficulty === coachPlan.difficulty) ?? COACHED_MATERIALS[0];
  });

  const [active, setActive] = useState<ModeContent | Scenario | null>(null);
  const [randomTopic, setRandomTopic] = useState<string | null>(null);
  const [prepLeft, setPrepLeft] = useState<number | null>(null);
  const [prepRun, setPrepRun] = useState(0);
  const [topicText, setTopicText] = useState("");
  const prepIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (prepRun === 0) return;
    prepIv.current = setInterval(() => {
      setPrepLeft((p) => {
        if (p === null) return p;
        if (p <= 1) {
          if (prepIv.current) clearInterval(prepIv.current);
          toastRef.current("Prep time is up — go!", "info");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => {
      if (prepIv.current) clearInterval(prepIv.current);
    };
  }, [prepRun]);

  const filteredMaterials = useMemo(
    () =>
      COACHED_MATERIALS.filter((m) => {
        if (focusTrack !== "all" && !m.focusTags?.includes(focusTrack)) return false;
        if (matType !== "all" && m.materialType !== matType) return false;
        if (matDiff !== "all" && m.difficulty !== matDiff) return false;
        return true;
      }),
    [focusTrack, matType, matDiff]
  );

  const stammerCount = useMemo(
    () => COACHED_MATERIALS.filter((m) => m.focusTags?.includes("stammering")).length,
    []
  );
  const youtubeCount = useMemo(
    () => COACHED_MATERIALS.filter((m) => m.focusTags?.includes("youtube")).length,
    []
  );

  const isMode = (x: ModeContent | Scenario | null): x is ModeContent => !!x && "usesTTS" in x;

  const sendToRecorder = (title: string, script: string, mode: string) => {
    setSettings({ task: { title, mode, script } });
    toast("Task loaded in the Recorder", "info");
    nav("record");
  };

  const sendCoachedMaterial = (ex: CoachedExercise) => {
    setSettings({
      task: {
        title: ex.title,
        mode: ex.materialType === "impromptu" ? "impromptu" : ex.materialType,
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
    toast("Practice material loaded in Recorder", "info");
    nav("record");
  };

  const pickRandom = (sc: Scenario) => {
    const t = sc.prompts[Math.floor(Math.random() * sc.prompts.length)];
    setRandomTopic(t);
    setPrepLeft(30);
    setPrepRun((r) => r + 1);
  };

  return (
    <div className="grid gap-5">
      {/* Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1">
          <button
            type="button"
            onClick={() => setSection("materials")}
            className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              section === "materials" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Coached Practice Materials ({COACHED_MATERIALS.length})
          </button>
          <button
            type="button"
            onClick={() => setSection("modes")}
            className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              section === "modes" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            5 Training Modes & 6 Scenarios
          </button>
        </div>
        <span className="text-[12px] text-[var(--muted)]">
          Recommended level: <strong className="capitalize text-[var(--ink)]">{coachPlan.difficulty}</strong> (Level {coachPlan.adaptiveLevel})
        </span>
      </div>

      {/* SECTION 1: COACHED PRACTICE MATERIALS (ALL 7 CATEGORIES + STAMMERING & YOUTUBE TRACKS) */}
      {section === "materials" && (
        <div className="grid gap-5">
          {/* Specialty Focus Tracks + Category/Difficulty Filters */}
          <Card>
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Focus track:</span>
                <button
                  type="button"
                  onClick={() => setFocusTrack("all")}
                  className={`chip cursor-pointer ${focusTrack === "all" ? "chip-brand" : "chip-muted"}`}
                >
                  All Materials ({COACHED_MATERIALS.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFocusTrack("stammering");
                    setMatType("all");
                    setMatDiff("all");
                    const first = COACHED_MATERIALS.find((m) => m.focusTags?.includes("stammering"));
                    if (first) setSelectedMaterial(first);
                  }}
                  className={`chip cursor-pointer ${focusTrack === "stammering" ? "chip-good" : "chip-muted"}`}
                >
                  Stammering & Fluency ({stammerCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFocusTrack("youtube");
                    setMatType("all");
                    setMatDiff("all");
                    const first = COACHED_MATERIALS.find((m) => m.focusTags?.includes("youtube"));
                    if (first) setSelectedMaterial(first);
                  }}
                  className={`chip cursor-pointer ${focusTrack === "youtube" ? "chip-accent" : "chip-muted"}`}
                >
                  YouTube Camera ({youtubeCount})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  onClick={() => setMatType("all")}
                  className={`chip cursor-pointer ${matType === "all" ? "chip-brand" : "chip-muted"}`}
                >
                  All 7 types
                </button>
                {MATERIAL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMatType(t)}
                    className={`chip cursor-pointer ${matType === t ? "chip-brand" : "chip-muted"}`}
                  >
                    {MATERIAL_TYPE_LABELS[t]}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMatDiff(d)}
                      className={`chip cursor-pointer capitalize ${matDiff === d ? "chip-accent" : "chip-muted"}`}
                    >
                      {d === "all" ? "Any level" : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 30-Day Fluency & YouTube Creator Roadmap Banner */}
          {(focusTrack === "stammering" || focusTrack === "youtube") && (
            <div className="coach-hero animate-pop p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Chip tone="good">30-Day Fluency & YouTube Camera Roadmap</Chip>
                  <h3 className="mt-2 font-display text-[17px] font-bold">
                    Calm, Evidence-Based Daily Routine for Smoother Speech on Camera
                  </h3>
                </div>
                <Chip tone="accent">15–20 min / day</Chip>
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">Week 1 · Easy Starts</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    3-4-6 breathing + <strong>Gentle Onset</strong> & <strong>Light Contacts</strong> (soft P/B/T/D/K/G) to stop hard throat blocks.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">Week 2 · Smooth Airflow</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    <strong>Continuous Airflow</strong> phrase linking & <strong>Calm Rate Control (~105 WPM)</strong> so you never panic-rush sentences.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">Week 3 · Tension Recovery</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    <strong>Pull-Out Recovery</strong> for sticky moments + <strong>YouTube Video Hook & Intro</strong> camera practice.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">Week 4 · Unscripted Camera</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    <strong>60s YouTube Talking-Head</strong> drills using 3 keywords only—finish every take calmly without restarting.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11.5px] text-[var(--muted)]">
                <strong>Honest coaching note:</strong> Stammering is a speech motor timing habit, not a flaw—30 days won&apos;t magically erase it 100% overnight, but daily practice consistently builds noticeably smoother starts, lower tension, and real on-camera confidence. For severe or distressing stuttering, pairing daily drills with a licensed Speech-Language Pathologist (SLP) gives the best long-term outcome.
              </p>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            {/* Material picker list */}
            <div className="grid max-h-[720px] content-start gap-2 overflow-y-auto pr-1">
              {filteredMaterials.length === 0 ? (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-center text-[12.5px] text-[var(--muted)]">
                  No materials match that exact filter combination. Reset a filter above to see all exercises.
                </div>
              ) : (
                filteredMaterials.map((m) => {
                  const isSelected = selectedMaterial.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMaterial(m)}
                      className={`mode-card p-3.5 ${isSelected ? "mode-card-active" : ""}`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip tone="brand">{MATERIAL_TYPE_LABELS[m.materialType]}</Chip>
                        <Chip tone={m.difficulty === "beginner" ? "good" : m.difficulty === "intermediate" ? "warn" : "bad"}>
                          {m.difficulty}
                        </Chip>
                        {m.focusTags?.includes("stammering") && <Chip tone="good">Anti-Stammer</Chip>}
                        {m.focusTags?.includes("youtube") && <Chip tone="accent">YouTube</Chip>}
                      </div>
                      <p className="mt-2 font-display text-[14px] font-semibold leading-snug">{m.title}</p>
                      <p className="mt-1 text-[11.5px] text-[var(--muted)]">
                        ⏱ {fmtDur(m.durationSec)} · ~{m.targetWpm} WPM · ×{m.reps} rep{m.reps > 1 ? "s" : ""}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Active Coached Material Workspace */}
            <Card
              title={selectedMaterial.title}
              sub={`${MATERIAL_TYPE_LABELS[selectedMaterial.materialType]} · ${selectedMaterial.difficulty} · target ~${selectedMaterial.targetWpm} WPM`}
              right={
                <Btn onClick={() => sendCoachedMaterial(selectedMaterial)}>
                  Practice & Record →
                </Btn>
              }
            >
              <CoachedText exercise={selectedMaterial} />
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: PRESERVED 5 TRAINING MODES + 6 REAL-WORLD SCENARIOS */}
      {section === "modes" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`mode-card ${active?.id === m.id ? "mode-card-active" : ""}`}
                onClick={() => setActive(m)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[15px] font-semibold tracking-tight">{m.name}</span>
                  <Chip tone="brand">{m.minutes} min</Chip>
                </div>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--accent)]">{m.tagline}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{m.description}</p>
              </button>
            ))}
          </div>

          {active && (
            <Card
              title={active.name}
              sub={active.tagline}
              right={
                <div className="flex gap-2">
                  {isMode(active) && active.sentences && <StopTTS />}
                  <Chip tone="accent">{active.minutes} min</Chip>
                </div>
              }
            >
              {isMode(active) ? (
                <ModeWorkspace mode={active} rate={settings.ttsRate} onSend={sendToRecorder} />
              ) : (
                <ScenarioWorkspace
                  sc={active}
                  randomTopic={randomTopic}
                  onRandom={() => pickRandom(active)}
                  prepLeft={prepLeft}
                  topicText={topicText}
                  setTopicText={setTopicText}
                  onSend={sendToRecorder}
                />
              )}
            </Card>
          )}

          <SectionLabel>Real-world speaking practice</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={`mode-card ${active?.id === s.id ? "mode-card-active" : ""}`}
                onClick={() => {
                  setActive(s);
                  setRandomTopic(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[15px] font-semibold tracking-tight">{s.name}</span>
                  <Chip>{s.minutes} min</Chip>
                </div>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--accent)]">{s.tagline}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeWorkspace({
  mode,
  rate,
  onSend,
}: {
  mode: ModeContent;
  rate: number;
  onSend: (t: string, s: string, m: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {mode.sentences && (
        <div className="grid gap-2">
          {mode.sentences.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <button className="icon-btn mt-0.5 shrink-0" title="Play" onClick={() => speak(s, rate)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M3.5 2.5v9l7-4.5z" />
                </svg>
              </button>
              <p className="flex-1 text-[13.5px] leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
      {mode.words && (
        <div className="flex flex-wrap gap-2">
          {mode.words.map((w, i) => (
            <span key={i} className="flex items-center gap-2 rounded-lg bg-[var(--panel2)] px-3 py-1.5 text-[13px]">
              {w}
              <button className="icon-btn" title="Play" onClick={() => speak(w.replace(/\s*\/\s*/g, ", "), rate)}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M3.5 2.5v9l7-4.5z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      {mode.topics && (
        <div className="grid gap-2 sm:grid-cols-2">
          {mode.topics.map((t, i) => (
            <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13px] leading-relaxed">
              {t}
            </div>
          ))}
        </div>
      )}
      {mode.passage && (
        <div className="grid gap-2">
          <button className="icon-btn w-fit" title="Play passage" onClick={() => speak(mode.passage!, rate)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3.5 2.5v9l7-4.5z" />
            </svg>
          </button>
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">{mode.passage}</p>
          {mode.paceGuidance && <p className="text-[12px] text-[var(--muted)]">{mode.paceGuidance}</p>}
        </div>
      )}
      {mode.script && (
        <div className="grid gap-2">
          <button className="icon-btn w-fit" title="Play script" onClick={() => speak(mode.script!.text, rate * 0.95)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3.5 2.5v9l7-4.5z" />
            </svg>
          </button>
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">{mode.script.text}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Btn
          onClick={() =>
            onSend(
              `${mode.name} mode`,
              mode.script?.text ?? mode.passage ?? (mode.sentences ? mode.sentences.join("\n\n") : ""),
              mode.id
            )
          }
        >
          Start in Recorder
        </Btn>
        {mode.sentences && (
          <p className="text-[12px] text-[var(--muted)]">
            Shadowing tip: play a sentence, pause, then record your repetition — the comparison shows your divergence.
          </p>
        )}
      </div>
    </div>
  );
}

function ScenarioWorkspace({
  sc,
  randomTopic,
  onRandom,
  prepLeft,
  topicText,
  setTopicText,
  onSend,
}: {
  sc: Scenario;
  randomTopic: string | null;
  onRandom: () => void;
  prepLeft: number | null;
  topicText: string;
  setTopicText: (v: string) => void;
  onSend: (t: string, s: string, m: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip tone="accent">Rules</Chip>
        {sc.rules.map((r, i) => (
          <Chip key={i}>{r}</Chip>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sc.prompts.map((p, i) => (
          <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13px] leading-relaxed">
            {p}
          </div>
        ))}
      </div>
      {sc.id === "impromptu" && (
        <div className="rounded-xl border border-dashed border-[var(--accent)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>Random challenge</SectionLabel>
            <Btn variant="soft" onClick={onRandom}>
              Deal a topic
            </Btn>
          </div>
          {randomTopic && (
            <div className="mt-3">
              <p className="font-display text-[19px] font-semibold">{randomTopic}</p>
              {prepLeft !== null && prepLeft > 0 ? (
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Think: <span className="font-semibold tabular-nums text-[var(--accent)]">{prepLeft}s</span>
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-[var(--muted)]">Go — 90 seconds, zero fillers.</p>
              )}
            </div>
          )}
        </div>
      )}
      <div>
        <SectionLabel>Optional: your own notes / prompt</SectionLabel>
        <Textarea
          rows={2}
          className="mt-1.5"
          value={topicText}
          onChange={(e) => setTopicText(e.target.value)}
          placeholder="Paste your interview question or debate motion here (optional)."
        />
      </div>
      <Btn onClick={() => onSend(sc.name, [randomTopic ?? "", topicText].filter(Boolean).join("\n"), sc.id)}>
        Start in Recorder
      </Btn>
    </div>
  );
}
