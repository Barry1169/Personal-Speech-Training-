"use client";

import React, { useMemo, useState } from "react";
import { langOf, type CoachedExercise, type PracticeLanguage } from "@/lib/types";
import { speakSingle, useModelAudio } from "@/lib/tts";
import { isStructuredSpeakingExercise } from "@/lib/structuredSpeaking";
import { useStore } from "@/lib/store";
import { Btn, Chip, InfoToggleBtn, SectionLabel, WordDrillControls, WordPronunciation } from "./ui";
import { StructuredSpeakingGuide } from "./StructuredSpeakingGuide";

export function AnnotatedScript({
  text,
  showCues = true,
  language = "en",
}: {
  text: string;
  showCues?: boolean;
  language?: PracticeLanguage;
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
        const inner = part.slice(2, -2);
        return (
          <button
            key={i}
            type="button"
            className="cue-emphasis"
            title={`Emphasize "${inner}" — click to hear pronunciation`}
            onClick={() => speakSingle(inner, 0.9, undefined, language)}
          >
            {inner}
          </button>
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

/** Extract clean unique drill words for word-drill exercises (minimal pairs, custom word bank, pronunciation drills). */
function extractDrillWords(exercise: CoachedExercise): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const pushWord = (raw: string) => {
    const clean = raw.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "").trim();
    // Keep single words or short hyphenated words (skip multi-word framework phrases)
    if (!clean || clean.includes(" ") || clean.length < 2) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  };

  for (const w of exercise.emphasisWords) pushWord(w);

  // For pronunciation / word-bank drills, also pull **emphasized** contrast pairs up to 8 words
  if (
    exercise.category === "pronunciation" ||
    exercise.category === "articulation" ||
    exercise.id.startsWith("custom-word-drill-")
  ) {
    const matches = exercise.annotatedText.matchAll(/\*\*([^*]+)\*\*/g);
    for (const m of matches) {
      if (out.length >= 8) break;
      pushWord(m[1]);
    }
  }
  return out.slice(0, 8);
}

export default function CoachedText({
  exercise,
  compact = false,
  aboveBriefing,
}: {
  exercise: CoachedExercise;
  compact?: boolean;
  /** Optional primary action slot rendered directly above Coach Briefing (e.g. Record My Voice) */
  aboveBriefing?: React.ReactNode;
}) {
  const { settings, setSettings, words, openAddWord, openQuickWord } = useStore();
  const [showCues, setShowCues] = useState(true);
  const [rate, setRate] = useState(settings.ttsRate || 0.9);
  const [briefOpen, setBriefOpen] = useState(!compact);
  const exLang = langOf(exercise);
  const preferredVoice = exLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;
  const audio = useModelAudio(preferredVoice, exLang);
  const showRoman = settings.showHindiRomanized ?? true;

  const modelText = exercise.plainText.trim();
  const isStructured = useMemo(() => isStructuredSpeakingExercise(exercise), [exercise]);
  const isWordDrill =
    exercise.id.startsWith("custom-word-drill-") ||
    (!isStructured &&
      (exercise.category === "pronunciation" ||
        exercise.category === "articulation" ||
        exercise.skills[0] === "pronunciation"));

  const drillWords = useMemo(
    () => (isWordDrill ? extractDrillWords(exercise) : []),
    [exercise, isWordDrill]
  );

  return (
    <div className="grid gap-3.5">
      {/* Structured Speaking / PREP Interactive Guide — ONLY for timed structured framework exercises */}
      {isStructured && exercise.structureSteps && (
        <StructuredSpeakingGuide
          exerciseId={exercise.id}
          title={exercise.title}
          whatToDo={exercise.whatToDo}
          structureSteps={exercise.structureSteps}
          durationSec={exercise.durationSec}
          language={exLang}
        />
      )}

      {/* Model Audio Bar + Script Cues */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {modelText && audio.supported && (
              <>
                {audio.playing ? (
                  <Btn variant="danger" onClick={audio.stop}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="2" y="2" width="8" height="8" rx="1.5" />
                    </svg>
                    Stop model
                  </Btn>
                ) : (
                  <Btn
                    variant="soft"
                    onClick={() => audio.playPassage(modelText, rate, preferredVoice, exLang)}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M3 2v8l7-4z" />
                    </svg>
                    {exLang === "hi" ? "Hear Hindi model" : "Hear model audio"}
                  </Btn>
                )}
                <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 text-[11px]">
                  {[
                    { label: "0.7x", v: 0.7 },
                    { label: "0.9x", v: 0.9 },
                    { label: "1.0x", v: 1.0 },
                  ].map((sp) => (
                    <button
                      key={sp.label}
                      type="button"
                      onClick={() => {
                        setRate(sp.v);
                        setSettings({ ttsRate: sp.v });
                        if (audio.playing && modelText) {
                          audio.playPassage(modelText, sp.v, preferredVoice, exLang);
                        }
                      }}
                      className={`rounded-md px-2 py-1 font-semibold transition ${
                        Math.abs(rate - sp.v) < 0.05
                          ? "bg-[var(--brand)] text-white"
                          : "text-[var(--muted)] hover:text-[var(--ink)]"
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
                    <option value="">
                      {exLang === "hi" ? "Default Hindi voice" : "Default English voice"}
                    </option>
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
              <Chip tone="accent">Spontaneous speaking guide — speak in your own words</Chip>
            )}
            {modelText && !audio.supported && (
              <span className="text-[11.5px] text-[var(--muted)]">
                Browser audio model unavailable — use the rhythm &amp; emphasis cues below.
              </span>
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
              {showCues ? "Cues: ON" : "Cues: OFF"}
            </button>
          </div>
        </div>

        {exLang === "hi" && audio.supported && !audio.hasNativeVoice && (
          <p className="mb-2 text-[11.5px] text-[var(--muted)]">
            Tip: Install the Hindi voice pack in your browser/OS settings for richer pronunciation — or upload a real Hindi speaker clip in <strong>Shadow</strong>.
          </p>
        )}

        {audio.playing && audio.activeSentence >= 0 && (
          <p className="mb-2 text-[11.5px] font-medium text-[var(--brand)]">
            Playing sentence {audio.activeSentence + 1} — listen to pacing, pauses, and clean endings.
          </p>
        )}

        <AnnotatedScript text={exercise.annotatedText} showCues={showCues} language={exLang} />

        {exercise.romanizedText && showRoman && (
          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] leading-relaxed text-[var(--muted)]">
            <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--brand)]">
              Romanized Guide:
            </span>
            {exercise.romanizedText}
          </div>
        )}

        {showCues && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--muted)]">
            <span>
              <span className="cue-emphasis">word</span> tap to hear
            </span>
            <span>
              <span className="cue-breath">∧ breath</span> quiet inhale
            </span>
            <span>
              <span className="cue-pause">|</span> short beat (0.4s)
            </span>
            <span>
              <span className="cue-pause cue-pause-long">‖ pause</span> full pause (0.8–1s)
            </span>
            <span className="ml-auto font-medium text-[var(--ink)]">
              Target pace: ~{exercise.targetWpm} WPM
            </span>
          </div>
        )}
      </div>

      {/* Word Drill Inline Pronunciation Breakdown + [0.7x] [1.0x] [Record Word] */}
      {drillWords.length > 0 && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Word Drill — Pronunciation &amp; Speed Audio</SectionLabel>
            <span className="text-[11px] text-[var(--muted)]">
              0.7x slow · 1.0x normal · single-word check
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {drillWords.map((w) => (
              <div
                key={w}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="font-display text-[14px] font-bold text-[var(--ink)]">{w}</span>
                  <WordPronunciation word={w} language={exLang} savedWords={words} />
                </div>
                <WordDrillControls
                  word={w}
                  language={exLang}
                  onRecordWord={(wd) => openQuickWord(wd)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Voice Recording Slot — positioned directly ABOVE Coach Briefing for immediate reach */}
      {aboveBriefing}

      {/* Compact, Expandable Coach Briefing */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div
          className="flex cursor-pointer items-center justify-between gap-2 text-left"
          onClick={() => setBriefOpen((o) => !o)}
        >
          <span className="section-label">Coach Briefing — How to practice this</span>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-semibold text-[var(--brand)]">
              {briefOpen ? "Hide" : "Show guide"}
            </span>
            <InfoToggleBtn
              open={briefOpen}
              onClick={() => setBriefOpen((o) => !o)}
              label="Toggle Coach Briefing details"
            />
          </div>
        </div>

        {briefOpen && (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>1. What to do</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">
                {exercise.whatToDo}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>2. How to speak it</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">
                {exercise.howToSpeak}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>3. Words to emphasize</SectionLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {exercise.emphasisWords.map((w) => {
                  const singleWord = !w.includes(" ");
                  return (
                    <div
                      key={w}
                      className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px]"
                    >
                      <button
                        type="button"
                        onClick={() => speakSingle(w, 0.9, preferredVoice, exLang)}
                        className="font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                        title={`Hear "${w}"`}
                      >
                        {w}
                      </button>
                      {singleWord && (
                        <WordPronunciation
                          word={w}
                          language={exLang}
                          savedWords={words}
                          showIpa={false}
                        />
                      )}
                      {singleWord && (
                        <WordDrillControls
                          word={w}
                          language={exLang}
                          onRecordWord={(wd) => openQuickWord(wd)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] p-3">
              <SectionLabel>4. Where to pause &amp; breathe</SectionLabel>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">
                {exercise.pauseNotes}
              </p>
            </div>
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--bad)_28%,var(--line))] bg-[color-mix(in_srgb,var(--bad)_6%,var(--panel2))] p-3 sm:col-span-2">
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
