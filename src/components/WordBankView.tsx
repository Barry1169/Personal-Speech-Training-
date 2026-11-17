"use client";

import { useEffect, useMemo, useState } from "react";
import { generateCustomWordDrillContent } from "@/lib/pronunciation";
import { getCoachedExerciseById } from "@/lib/materials";
import { speakSingle, stopSpeaking } from "@/lib/tts";
import { useStore } from "@/lib/store";
import {
  SOUND_CATEGORY_LABELS,
  WORD_PROBLEM_TYPE_LABELS,
  type CoachedExercise,
  type PersonalWord,
  type SoundCategoryKey,
  type WordStatus,
} from "@/lib/types";
import {
  Btn,
  Card,
  Chip,
  InfoToggleBtn,
  Input,
  ScoreBar,
  SectionLabel,
  Stat,
  WordDrillControls,
  WordPronunciation,
} from "./ui";
import { AnnotatedScript } from "./CoachedText";

const STARTER_WORDS_EN = [
  "thorough",
  "rural",
  "literally",
  "world",
  "strategy",
  "subscribe",
  "strengths",
  "specifically",
];

const STARTER_WORDS_HI = [
  "स्पष्ट",
  "प्रयत्न",
  "विश्वास",
  "आत्मविश्वास",
  "धैर्य",
  "प्रभावशाली",
  "दृष्टिकोण",
  "उदाहरण",
];

function AudioCompareBtn({ recordingId, label }: { recordingId: string; label: string }) {
  const { getBlob } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const load = async () => {
    setLoading(true);
    try {
      const b = await getBlob(recordingId);
      if (b && b.size > 0) {
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(b));
      }
    } finally {
      setLoading(false);
    }
  };

  if (url) return <audio controls src={url} className="mt-2 h-9 w-full" />;
  return (
    <Btn variant="ghost" className="mt-2" disabled={loading} onClick={() => void load()}>
      {loading ? "Loading…" : `▶ Play ${label}`}
    </Btn>
  );
}

export default function WordBankView({ nav }: { nav: (v: string) => void }) {
  const {
    nowMs,
    practiceLanguage,
    settings,
    words,
    dueWords,
    weakSounds,
    weakCombos,
    overallBeforeAfter,
    addWord,
    updateWord,
    deleteWord,
    openAddWord,
    openEditWord,
    openFiveRepPractice,
    openQuickWord,
    setPracticeWordId,
    setSettings,
    toast,
  } = useStore();

  const preferredVoice = practiceLanguage === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;
  const starterWords = practiceLanguage === "hi" ? STARTER_WORDS_HI : STARTER_WORDS_EN;

  const [tab, setTab] = useState<"active" | "all" | "due" | WordStatus>("active");
  const [soundFilter, setSoundFilter] = useState<SoundCategoryKey | "all">("all");
  const [query, setQuery] = useState("");
  const [drillSeed, setDrillSeed] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedWordIds, setExpandedWordIds] = useState<Record<string, boolean>>({});

  const toggleWordDetails = (id: string) =>
    setExpandedWordIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const counts = useMemo(() => {
    let active = 0;
    let difficult = 0;
    let learning = 0;
    let mastered = 0;
    for (const w of words) {
      if (!w.clearedFromActive && w.status !== "mastered") active++;
      if (w.status === "difficult" && !w.clearedFromActive) difficult++;
      else if (w.status === "learning" && !w.clearedFromActive) learning++;
      else mastered++;
    }
    return { total: words.length, active, difficult, learning, mastered, due: dueWords.length };
  }, [words, dueWords.length]);

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dueSet = new Set(dueWords.map((w) => w.id));
    return words.filter((w) => {
      if (tab === "active" && (w.clearedFromActive || w.status === "mastered")) return false;
      if (tab === "due" && !dueSet.has(w.id)) return false;
      if ((tab === "difficult" || tab === "learning") && (w.status !== tab || w.clearedFromActive)) return false;
      if (tab === "mastered" && w.status !== "mastered" && !w.clearedFromActive) return false;
      if (soundFilter !== "all" && !w.soundTags.includes(soundFilter)) return false;
      if (
        q &&
        !w.word.toLowerCase().includes(q) &&
        !w.meaning.toLowerCase().includes(q) &&
        !w.phonetic.toLowerCase().includes(q) &&
        !(w.customPronunciation?.toLowerCase().includes(q) ?? false) &&
        !(w.notes?.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }, [words, dueWords, tab, soundFilter, query]);

  const customDrill = useMemo(
    () => generateCustomWordDrillContent(words, drillSeed, practiceLanguage),
    [words, drillSeed, practiceLanguage]
  );

  const launchExerciseInRecorder = (ex: CoachedExercise) => {
    setSettings({
      task: {
        title: ex.title,
        mode: "pronunciation",
        language: ex.language ?? practiceLanguage,
        script: ex.plainText,
        romanizedText: ex.romanizedText,
        exerciseId: ex.id,
        targetWpm: ex.targetWpm,
        annotatedText: ex.annotatedText,
        structureSteps: ex.structureSteps,
        coaching: {
          whatToDo: ex.whatToDo,
          howToSpeak: ex.howToSpeak,
          emphasisWords: ex.emphasisWords,
          pauseNotes: ex.pauseNotes,
          mistakesToAvoid: ex.mistakesToAvoid,
        },
      },
    });
    toast(`Loaded "${ex.title}" in Record & Assess`, "info");
    nav("record");
  };

  const practiceCustomParagraphInRecorder = () => {
    if (!customDrill.paragraph) return;
    const names = customDrill.targetWords.map((w) => w.word);
    setSettings({
      task: {
        title: `${practiceLanguage === "hi" ? "My Hindi Word Bank Paragraph" : "My Word Bank Paragraph"} (${names.slice(0, 3).join(", ")})`,
        mode: "pronunciation",
        language: practiceLanguage,
        script: customDrill.paragraph,
        romanizedText: customDrill.romanizedParagraph,
        targetWpm: practiceLanguage === "hi" ? 108 : 112,
        annotatedText: customDrill.annotatedParagraph,
        coaching: {
          whatToDo: `Read this custom paragraph built from your personal difficult words: ${names.join(", ")}.`,
          howToSpeak: "Slow down slightly (~110–115 WPM) and keep steady breath as you enter each highlighted target word.",
          emphasisWords: names,
          pauseNotes: "Take a silent breath ∧ before every sentence and hold ‖ pauses cleanly.",
          mistakesToAvoid: [
            "Rushing past your personal problem words.",
            "Dropping final consonant releases.",
          ],
        },
      },
    });
    toast("Custom word paragraph loaded in Recorder", "info");
    nav("record");
  };

  const formatReviewLabel = (w: PersonalWord): string => {
    const refNow = nowMs || w.updatedAt;
    if (w.attempts.length === 0) return "New · ready to practice";
    const diffMs = w.nextReviewAt - refNow;
    if (diffMs <= 0) return "Due for review now";
    const days = Math.max(1, Math.ceil(diffMs / 86400000));
    return `Next review in ${days}d`;
  };

  return (
    <div className="grid gap-5">
      {/* Top Personal Pronunciation Coach Hero */}
      <div className="coach-hero p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">Personal Pronunciation Coach</Chip>
              {counts.due > 0 && <Chip tone="warn">{counts.due} word{counts.due === 1 ? "" : "s"} due today</Chip>}
              {counts.mastered > 0 && <Chip tone="good">{counts.mastered} mastered</Chip>}
            </div>
            <h2 className="mt-2 font-display text-[22px] font-bold tracking-tight">
              Train every difficult word until it flows naturally
            </h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
              Save tricky words from any exercise or AI assessment. Your coach provides slow &amp; natural audio, IPA, tongue/lip placement, spaced repetition, weak-sound detection, and custom daily paragraphs built from your words.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => openAddWord("", "manual")}>+ Add My Word</Btn>
            {dueWords.length > 0 && (
              <Btn variant="soft" onClick={() => setPracticeWordId(dueWords[0].id)}>
                Review Due Words ({dueWords.length}) →
              </Btn>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <Stat label="Saved Words" value={counts.total} sub="In personal bank" />
          <Stat label="Difficult" value={counts.difficult} sub="Needs slow focus" tone={counts.difficult > 0 ? "bad" : undefined} />
          <Stat label="Learning" value={counts.learning} sub="Building consistency" tone="accent" />
          <Stat label="Mastered" value={counts.mastered} sub="Multi-day verified" tone="brand" />
          <Stat label="Due Today" value={counts.due} sub="Spaced repetition" />
        </div>
      </div>

      {/* Empty state quick-starter suggestions */}
      {words.length === 0 && (
        <Card
          title={`Start your ${practiceLanguage === "hi" ? "Hindi (हिन्दी)" : "English"} Word Bank`}
          sub="Add your own tricky words above, or tap any common trouble word below to try Smart Pronunciation Practice immediately."
        >
          <div className="flex flex-wrap gap-2">
            {starterWords.map((sw) => (
              <button
                key={sw}
                type="button"
                onClick={() => {
                  const res = addWord(sw, { language: practiceLanguage, source: "manual", status: "difficult" });
                  setPracticeWordId(res.word.id);
                }}
                className="chip chip-brand cursor-pointer px-3 py-1.5 text-[12.5px] hover:brightness-95"
              >
                + {sw}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Personal Word Bank Filterable Library */}
      {words.length > 0 && (
        <Card
          title={`My Personal Word Bank (${filteredWords.length})`}
          sub="Click any word to practice slow & natural pronunciation, record, and track spaced-repetition mastery."
          right={
            <Btn variant="soft" onClick={() => openAddWord("", "manual")}>
              + Add My Word
            </Btn>
          }
        >
          <div className="grid gap-4">
            {/* Category Tabs + Search + Sound Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "active", label: `Active (${counts.active})` },
                  { id: "due", label: `Due Today (${counts.due})` },
                  { id: "difficult", label: `Difficult (${counts.difficult})` },
                  { id: "learning", label: `Learning (${counts.learning})` },
                  { id: "mastered", label: `Mastered / Cleared (${counts.mastered})` },
                  { id: "all", label: `All History (${counts.total})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`chip cursor-pointer ${tab === t.id ? "chip-brand" : "chip-muted"}`}
                >
                  {t.label}
                </button>
              ))}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by sound"
                  value={soundFilter}
                  onChange={(e) => setSoundFilter(e.target.value as SoundCategoryKey | "all")}
                  className="inp w-auto py-1.5 text-[12px]"
                >
                  <option value="all">All sounds</option>
                  {(Object.keys(SOUND_CATEGORY_LABELS) as SoundCategoryKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SOUND_CATEGORY_LABELS[k].label}
                    </option>
                  ))}
                </select>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search words…"
                  className="w-44 py-1.5 text-[12.5px]"
                />
              </div>
            </div>

            {/* Word Cards Grid */}
            {filteredWords.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[var(--muted)]">
                {tab === "active" && counts.mastered > 0 ? (
                  <div className="space-y-2">
                    <p>
                      All saved words have been cleared or mastered! Your full attempt history is preserved under{" "}
                      <strong>Mastered / Cleared</strong>.
                    </p>
                    <Btn variant="soft" onClick={() => setTab("all")}>
                      View All History ({counts.total})
                    </Btn>
                  </div>
                ) : (
                  <p>
                    No saved words match this filter. Try switching tabs or click <strong>+ Add My Word</strong>.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredWords.map((w) => {
                  const isDue = dueWords.some((d) => d.id === w.id);
                  const detailsOpen = Boolean(expandedWordIds[w.id]);
                  const problemLabel = w.problemType
                    ? w.problemType === "other" && w.problemTypeOther
                      ? w.problemTypeOther
                      : WORD_PROBLEM_TYPE_LABELS[w.problemType]
                    : null;

                  return (
                    <div
                      key={w.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4 transition hover:border-[var(--line-strong)]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="font-display text-[17px] font-bold text-[var(--ink)]">{w.word}</span>
                              <WordPronunciation
                                word={w.word}
                                language={practiceLanguage}
                                phonetic={w.customPronunciation || w.phonetic}
                                ipa={w.ipa}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {w.clearedFromActive ? (
                              <Chip tone="good">✓ Cleared</Chip>
                            ) : (
                              <Chip
                                tone={w.status === "mastered" ? "good" : w.status === "learning" ? "warn" : "bad"}
                                className="capitalize"
                              >
                                {w.status}
                              </Chip>
                            )}
                            {isDue && !w.clearedFromActive && <Chip tone="brand">Due</Chip>}
                            <InfoToggleBtn
                              open={detailsOpen}
                              onClick={() => toggleWordDetails(w.id)}
                              label={`Details for ${w.word}`}
                            />
                          </div>
                        </div>

                        {/* Saved personal metadata + sound tags */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {problemLabel && <Chip tone="accent">{problemLabel}</Chip>}
                          {w.difficultPart && <Chip tone="warn">Part: {w.difficultPart}</Chip>}
                          {w.detectedPronunciation && (
                            <Chip tone="bad">Heard: &ldquo;{w.detectedPronunciation}&rdquo;</Chip>
                          )}
                          {w.soundTags.slice(0, 3).map((s) => (
                            <Chip key={s} tone="muted">
                              {SOUND_CATEGORY_LABELS[s].short}
                            </Chip>
                          ))}
                        </div>

                        {/* Mastery bar */}
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
                            <span>
                              Mastery: <strong className="text-[var(--ink)]">{w.masteryScore}/100</strong> (
                              {w.attempts.length} take{w.attempts.length === 1 ? "" : "s"})
                            </span>
                            <span>{w.clearedFromActive ? "History saved" : formatReviewLabel(w)}</span>
                          </div>
                          <ScoreBar value={w.masteryScore} />
                        </div>

                        {/* Expandable meaning, notes, mouth cue & personal voice recording */}
                        {detailsOpen && (
                          <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-2.5 text-[12px] leading-relaxed">
                            <p className="text-[var(--muted)]">
                              <strong className="text-[var(--ink)]">Meaning:</strong> {w.meaning}
                            </p>
                            <p className="text-[var(--muted)]">
                              <strong className="text-[var(--ink)]">Example:</strong> &ldquo;{w.exampleSentence}&rdquo;
                            </p>
                            {w.notes && (
                              <p className="text-[var(--muted)]">
                                <strong className="text-[var(--ink)]">Your notes:</strong> {w.notes}
                              </p>
                            )}
                            <p className="text-[11.5px] text-[var(--brand)]">
                              → {w.mouthGuide.tongue}
                            </p>
                            {w.userRecordingBlobKey && (
                              <AudioCompareBtn
                                recordingId={w.userRecordingBlobKey}
                                label="My Saved Pronunciation"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Standardized per-word audio & practice controls */}
                      <div className="space-y-2 border-t border-[var(--line)] pt-2.5">
                        <WordDrillControls
                          word={w.word}
                          language={practiceLanguage}
                          onRecordWord={(wd) => openQuickWord(wd)}
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Btn
                            onClick={() =>
                              openFiveRepPractice({
                                word: w.word,
                                language: practiceLanguage,
                                correctionTip: w.mouthGuide.tongue,
                              })
                            }
                          >
                            Practice This Word (5×)
                          </Btn>
                          <Btn variant="soft" onClick={() => setPracticeWordId(w.id)}>
                            Coach
                          </Btn>

                          <select
                            aria-label={`Change category for ${w.word}`}
                            value={w.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value as WordStatus;
                              updateWord({
                                ...w,
                                status: nextStatus,
                                clearedFromActive: nextStatus === "mastered" ? w.clearedFromActive : false,
                              });
                            }}
                            className="inp ml-auto w-auto py-1 text-[11.5px]"
                          >
                            <option value="difficult">Difficult</option>
                            <option value="learning">Learning</option>
                            <option value="mastered">Mastered</option>
                          </select>

                          <button
                            type="button"
                            title="Edit word & metadata"
                            onClick={() => openEditWord(w)}
                            className="icon-btn"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                            </svg>
                          </button>

                          {confirmDeleteId === w.id ? (
                            <Btn
                              variant="danger"
                              onClick={() => {
                                deleteWord(w.id);
                                setConfirmDeleteId(null);
                              }}
                            >
                              Confirm
                            </Btn>
                          ) : (
                            <button
                              type="button"
                              title="Delete word"
                              onClick={() => setConfirmDeleteId(w.id)}
                              className="icon-btn hover:text-[var(--bad)]"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M3 4.5h10M6 4.5V3h4v1.5M5 4.5l.6 8.5h4.8l.6-8.5" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Custom Sentences & Connected Paragraph Generated From Saved Difficult Words */}
      {customDrill.targetWords.length > 0 && (
        <Card
          title="Custom Sentences & Connected Paragraph (From Your Saved Words)"
          sub="Automatically generated using your current Difficult & Learning words so you practice them smoothly in real connected speech."
          right={
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => setDrillSeed((s) => s + 1)}>
                Shuffle Words
              </Btn>
              <Btn variant="soft" onClick={() => speakSingle(customDrill.paragraph, 0.86, preferredVoice, practiceLanguage)}>
                ▶ Hear Model
              </Btn>
              <Btn variant="ghost" onClick={stopSpeaking}>
                Stop
              </Btn>
              <Btn onClick={practiceCustomParagraphInRecorder}>Practice &amp; Record →</Btn>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Target Drill Words (with Pronunciation &amp; Speed Audio)
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {customDrill.targetWords.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-display text-[14px] font-bold text-[var(--ink)]">{w.word}</span>
                      <WordPronunciation
                        word={w.word}
                        language={practiceLanguage}
                        phonetic={w.customPronunciation || w.phonetic}
                        ipa={w.ipa}
                      />
                    </div>
                    <WordDrillControls
                      word={w.word}
                      language={practiceLanguage}
                      onRecordWord={(wd) => openQuickWord(wd)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <SectionLabel>Connected Practice Paragraph (With Breath &amp; Pause Cues)</SectionLabel>
              <div className="mt-2">
                <AnnotatedScript text={customDrill.annotatedParagraph} showCues />
              </div>
            </div>

            <div className="grid gap-2">
              <SectionLabel>Individual Sentence Drills</SectionLabel>
              {customDrill.sentences.map((s, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-[13px]"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    className="chip chip-muted cursor-pointer hover:text-[var(--ink)]"
                    onClick={() => speakSingle(s, 0.85, preferredVoice, practiceLanguage)}
                  >
                    ▶ Hear
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Weak Sound Detector & Problematic Sound Combinations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Weak Sound Detector"
          sub="Detects recurring pronunciation patterns (TH, R, L, S/SH, V/W, Clusters) across your saved words & past recordings."
        >
          {weakSounds.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              Add a few difficult words or save a scored recording — your coach will automatically detect your recurring weak sounds and recommend targeted exercises.
            </p>
          ) : (
            <div className="grid gap-3">
              {weakSounds.map((ws) => {
                const topEx = ws.recommendedExerciseIds
                  .map((id) => getCoachedExerciseById(id))
                  .find((x): x is CoachedExercise => Boolean(x));
                return (
                  <div key={ws.sound} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-bold">{ws.label}</span>
                        <span className="font-mono text-[11.5px] text-[var(--muted)]">{ws.phonemes}</span>
                      </div>
                      <Chip tone={ws.severity === "high" ? "bad" : ws.severity === "medium" ? "warn" : "muted"}>
                        {ws.severity === "high" ? "High priority" : ws.severity === "medium" ? "Focus area" : "Watch"}
                        {ws.avgAccuracy != null ? ` · ${ws.avgAccuracy}%` : ""}
                      </Chip>
                    </div>
                    <p className="mt-1.5 text-[12px] text-[var(--muted)]">
                      <strong>Trouble words:</strong> {ws.sampleWords.join(", ")}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink)]">{ws.placementCue}</p>
                    {topEx && (
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2">
                        <span className="truncate text-[11.5px] text-[var(--muted)]">
                          Recommended drill: <strong className="text-[var(--ink)]">{topEx.title}</strong>
                        </span>
                        <Btn variant="soft" onClick={() => launchExerciseInRecorder(topEx)}>
                          Practice →
                        </Btn>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid content-start gap-5">
          {/* Problematic Sound Combinations */}
          <Card
            title="Problematic Sound Combinations"
            sub="Tricky multi-sound transitions detected across your vocabulary."
          >
            {weakCombos.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)]">
                No recurring multi-sound transition bottlenecks detected yet. As you add words with transitions like <em>TH+R</em>, <em>R↔L</em>, or <em>STR</em>, targeted tips appear here.
              </p>
            ) : (
              <div className="grid gap-3">
                {weakCombos.map((c) => (
                  <div key={c.comboKey} className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-[14px] font-semibold">{c.label}</p>
                      <Chip tone="accent">{c.words.length} word{c.words.length === 1 ? "" : "s"}</Chip>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">Detected in: {c.words.join(", ")}</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink)]">{c.tip}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Overall Before vs After Comparison */}
          <Card
            title="Before vs. After Pronunciation Progress"
            sub="Compares your earliest saved recording against your latest take."
          >
            {!overallBeforeAfter ? (
              <p className="text-[13px] text-[var(--muted)]">
                Record at least 2 sessions (or 2 attempts on a word inside your Word Bank) to unlock side-by-side Before vs. After audio &amp; score comparison.
              </p>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <SectionLabel>Original vs. Latest Take</SectionLabel>
                  <Chip tone={overallBeforeAfter.delta > 0 ? "good" : overallBeforeAfter.delta < 0 ? "warn" : "muted"}>
                    {overallBeforeAfter.delta > 0
                      ? `+${overallBeforeAfter.delta} pts gain`
                      : overallBeforeAfter.delta < 0
                      ? `${overallBeforeAfter.delta} pts change`
                      : "Steady"}
                  </Chip>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Before</p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold">{overallBeforeAfter.beforeLabel}</p>
                    <p className="mt-1 font-display text-[20px] font-bold">{overallBeforeAfter.beforeScore}/100</p>
                    {overallBeforeAfter.beforeRecordingId && (
                      <AudioCompareBtn recordingId={overallBeforeAfter.beforeRecordingId} label="Original" />
                    )}
                  </div>
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--good)]">After</p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold">{overallBeforeAfter.afterLabel}</p>
                    <p className="mt-1 font-display text-[20px] font-bold text-[var(--good)]">
                      {overallBeforeAfter.afterScore}/100
                    </p>
                    {overallBeforeAfter.afterRecordingId && (
                      <AudioCompareBtn recordingId={overallBeforeAfter.afterRecordingId} label="Latest" />
                    )}
                  </div>
                </div>
                <div className="grid gap-1.5 text-[12px]">
                  {overallBeforeAfter.improvements.map((line, i) => (
                    <p key={i} className="text-[var(--good)]">✓ {line}</p>
                  ))}
                  {overallBeforeAfter.remainingFocus.map((line, i) => (
                    <p key={i} className="text-[var(--muted)]">→ {line}</p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
