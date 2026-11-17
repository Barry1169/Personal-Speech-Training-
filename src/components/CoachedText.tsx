"use client";

import { useState } from "react";
import { langOf, type CoachedExercise } from "@/lib/types";
import { useModelAudio } from "@/lib/tts";
import { useStore } from "@/lib/store";
import { Btn, Chip, SectionLabel } from "./ui";

export function AnnotatedScript({
  text,
  showCues = true,
}: {
  text: string;
  showCues?: boolean;
}) {
  const paragraphs = text.split(/\n\n+/);

  const renderInline = (para: string) => {
    if (!showCues) {
      const cleaned = para
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/[∧|‖]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return <span>{cleaned}</span>;
    }

    // Tokenize **emphasis**, ∧ (breath), ‖ (full pause), | (short pause)
    const parts = para.split(/(\*\*[^*]+\*\*|∧|‖|\|)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <span key={i} className="cue-emphasis" title="Emphasize this word">
            {part.slice(2, -2)}
          </span>
        );
      }
      if (part === "∧") {
        return (
          <span key={i} className="cue-breath" title="Quiet nasal breath here">
            ∧ breath
          </span>
        );
      }
      if (part === "‖") {
        return (
          <span key={i} className="cue-pause cue-pause-long" title="Full pause (0.8–1.0s)">
            ‖ pause
          </span>
        );
      }
      if (part === "|") {
        return (
          <span key={i} className="cue-pause" title="Short beat (0.4s)">
            |
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="grid gap-3 text-[14.5px] leading-[2.05] text-[var(--ink)]">
      {paragraphs.map((p, idx) => (
        <p key={idx}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

export default function CoachedText({
  exercise,
  compact = false,
}: {
  exercise: CoachedExercise;
  compact?: boolean;
}) {
  const { settings, setSettings, openAddWord } = useStore();
  const [showCues, setShowCues] = useState(true);
  const [rate, setRate] = useState(settings.ttsRate || 0.9);
  const [briefOpen, setBriefOpen] = useState(!compact);
  const exLang = langOf(exercise);
  const preferredVoice = exLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;
  const audio = useModelAudio(preferredVoice, exLang);
  const showRoman = settings.showHindiRomanized ?? true;

  const modelText = exercise.plainText.trim();

  return (
    <div className="grid gap-4">
      {/* Model Audio Bar + Script Cues */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {modelText && audio.supported && (
              <>
                {audio.playing ? (
                  <Btn variant="danger" onClick={audio.stop}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5" /></svg>
                    Stop model
                  </Btn>
                ) : (
                  <Btn variant="soft" onClick={() => audio.playPassage(modelText, rate, preferredVoice, exLang)}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2v8l7-4z" /></svg>
                    {exLang === "hi" ? "Hear Hindi model" : "Hear model audio"}
                  </Btn>
                )}
                <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 text-[11px]">
                  {[
                    { label: "0.75×", v: 0.75 },
                    { label: "0.9×", v: 0.9 },
                    { label: "1.0×", v: 1.0 },
                  ].map((sp) => (
                    <button
                      key={sp.label}
                      type="button"
                      onClick={() => {
                        setRate(sp.v);
                        setSettings({ ttsRate: sp.v });
                      }}
                      className={`rounded-md px-2 py-1 font-semibold transition ${
                        Math.abs(rate - sp.v) < 0.04 ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
                {audio.voices.length > 1 && (
                  <select
                    aria-label="Model voice"
                    value={preferredVoice ?? ""}
                    onChange={(e) =>
                      setSettings(
                        exLang === "hi"
                          ? { preferredVoiceHi: e.target.value || null }
                          : { preferredVoice: e.target.value || null }
                      )
                    }
                    className="inp w-auto max-w-[170px] py-1 text-[11.5px]"
                  >
                    <option value="">{exLang === "hi" ? "Default Hindi voice" : "Default English voice"}</option>
                    {audio.voices.slice(0, 12).map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name.slice(0, 26)} ({v.lang})
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            {!modelText && (
              <Chip tone="accent">Spontaneous speaking guide — no fixed script</Chip>
            )}
            {modelText && !audio.supported && (
              <span className="text-[11.5px] text-[var(--muted)]">Browser audio model unavailable — use the rhythm & emphasis cues below.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {exercise.romanizedText && (
              <button
                type="button"
                onClick={() => setSettings({ showHindiRomanized: !showRoman })}
                className={`chip cursor-pointer ${showRoman ? "chip-brand" : "chip-muted"}`}
                title="Toggle Romanized Hinglish reading guide underneath the Hindi Devanagari script"
              >
                {showRoman ? "Romanized: ON" : "Romanized: OFF"}
              </button>
            )}
            <button
              type="button"
              onClick={() => openAddWord("", "exercise")}
              className="chip chip-brand cursor-pointer hover:brightness-95"
              title="Save a difficult word from this exercise to your Personal Word Bank"
            >
              + Add My Word
            </button>
            <button
              type="button"
              onClick={() => setShowCues((s) => !s)}
              className={`chip cursor-pointer ${showCues ? "chip-brand" : "chip-muted"}`}
            >
              {showCues ? "Coaching cues: ON" : "Coaching cues: OFF"}
            </button>
          </div>
        </div>

        {exLang === "hi" && audio.supported && !audio.hasNativeVoice && (
          <p className="mb-2 text-[11.5px] text-[var(--muted)]">
            Tip: If Hindi model audio sounds robotic, install the Hindi voice pack in Windows/Chrome settings — or upload any real Hindi speaker clip in the <strong>Shadow</strong> tab!
          </p>
        )}

        {audio.playing && audio.activeSentence >= 0 && (
          <p className="mb-2 text-[11.5px] font-medium text-[var(--brand)]">
            Playing model audio — sentence {audio.activeSentence + 1} (listen to the rhythm, pauses, and falling pitch at sentence endings)
          </p>
        )}

        <AnnotatedScript text={exercise.annotatedText} showCues={showCues} />

        {exercise.romanizedText && showRoman && (
          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] leading-relaxed text-[var(--muted)]">
            <span className="mr-1.5 font-bold uppercase tracking-wider text-[10.5px] text-[var(--brand)]">
              Romanized Guide:
            </span>
            {exercise.romanizedText}
          </div>
        )}

        {showCues && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--muted)]">
            <span><span className="cue-emphasis">word</span> emphasize</span>
            <span><span className="cue-breath">∧ breath</span> quiet inhale</span>
            <span><span className="cue-pause">|</span> short beat (0.4s)</span>
            <span><span className="cue-pause cue-pause-long">‖ pause</span> full pause (0.8–1s)</span>
            <span className="ml-auto font-medium text-[var(--ink)]">Target pace: ~{exercise.targetWpm} WPM</span>
          </div>
        )}
      </div>

      {/* Structured 5-part Coach Briefing */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setBriefOpen((o) => !o)}
        >
          <span className="section-label">Coach Briefing — Exactly how to practice this</span>
          <span className="text-[11.5px] font-semibold text-[var(--brand)]">{briefOpen ? "Hide details" : "Show coaching guide"}</span>
        </button>

        {briefOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>1. What to do</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">{exercise.whatToDo}</p>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>2. How to speak it</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">{exercise.howToSpeak}</p>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>3. Words to emphasize</SectionLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {exercise.emphasisWords.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => audio.speakWord(w, 0.85)}
                    title={audio.supported ? `Listen to "${w}"` : w}
                    className="chip chip-accent cursor-pointer hover:brightness-95"
                  >
                    {audio.supported && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2v8l7-4z" /></svg>
                    )}
                    {w}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                Lift pitch gently and slow 10% on these anchor words. Click any pill to hear it spoken clearly.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>4. Where to pause & breathe</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">{exercise.pauseNotes}</p>
            </div>
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--bad)_25%,var(--line))] bg-[color-mix(in_srgb,var(--bad)_5%,var(--panel2))] p-3 sm:col-span-2">
              <SectionLabel>5. Mistakes to avoid</SectionLabel>
              <ul className="mt-1.5 grid gap-1">
                {exercise.mistakesToAvoid.map((m, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-[var(--ink)]">
                    <span className="mr-1.5 font-bold text-[var(--bad)]">×</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
