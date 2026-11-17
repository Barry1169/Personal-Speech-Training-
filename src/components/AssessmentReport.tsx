"use client";

import { useMemo, useState } from "react";
import type { DetailedAssessment, DimensionScore, RecordingAnalysis } from "@/lib/types";
import { normalizeWord } from "@/lib/pronunciation";
import { speakSingle } from "@/lib/tts";
import { useStore } from "@/lib/store";
import {
  Btn,
  Chip,
  InfoToggleBtn,
  Ring,
  ScoreBar,
  SectionLabel,
  WordDrillControls,
  WordPronunciation,
} from "./ui";

const EVIDENCE_BADGE: Record<
  DimensionScore["evidenceKind"],
  { label: string; tone: "brand" | "accent" | "muted" }
> = {
  measured: { label: "Measured", tone: "brand" },
  hybrid: { label: "Measured + Self", tone: "accent" },
  self: { label: "Self-Check", tone: "muted" },
};

function statusLabelForScore(score: number | null, pending?: boolean): {
  text: string;
  tone: "good" | "brand" | "warn" | "bad" | "muted";
} {
  if (pending || score == null) return { text: "Needs self-check", tone: "muted" };
  if (score >= 85) return { text: "Strong", tone: "good" };
  if (score >= 70) return { text: "On target", tone: "brand" };
  if (score >= 55) return { text: "Developing", tone: "warn" };
  return { text: "Focus area", tone: "bad" };
}

export default function AssessmentReport({
  assessment,
  analysis,
  previousScore,
  onRetryExercise,
  onPracticeText,
  compact = false,
}: {
  assessment: DetailedAssessment;
  analysis: RecordingAnalysis;
  previousScore?: number | null;
  onRetryExercise?: () => void;
  onPracticeText?: (title: string, text: string) => void;
  compact?: boolean;
}) {
  const {
    settings,
    practiceLanguage,
    words,
    addWord,
    addWordsBatch,
    openAddWord,
    openFiveRepPractice,
    openQuickWord,
    isProblemWordResolved,
    setPracticeWordId,
  } = useStore();

  const preferredVoice =
    practiceLanguage === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;

  const [showFormula, setShowFormula] = useState(false);
  const [openDims, setOpenDims] = useState<Record<string, boolean>>({});
  const [openWords, setOpenWords] = useState<Record<string, boolean>>({});
  const [openSentences, setOpenSentences] = useState<Record<number, boolean>>({});
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillIdx, setDrillIdx] = useState(0);

  const toggleDim = (key: string) =>
    setOpenDims((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleWordInfo = (key: string) =>
    setOpenWords((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleSentenceInfo = (idx: number) =>
    setOpenSentences((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const findSavedWord = (raw: string) => {
    const norm = normalizeWord(raw);
    return words.find((w) => w.normalized === norm && !w.clearedFromActive) ?? null;
  };

  const dims: DimensionScore[] = [
    assessment.dimensions.pronunciation,
    assessment.dimensions.clarity,
    assessment.dimensions.pace,
    assessment.dimensions.fluency,
    assessment.dimensions.pausesBreathing,
    assessment.dimensions.expression,
  ];

  const allDimsOpen = dims.every((d) => Boolean(openDims[d.key]));
  const toggleAllDims = () => {
    if (allDimsOpen) {
      setOpenDims({});
    } else {
      const next: Record<string, boolean> = {};
      dims.forEach((d) => {
        next[d.key] = true;
      });
      setOpenDims(next);
    }
  };

  const delta = previousScore != null ? assessment.overallScore - previousScore : null;

  // Filter out words cleared through the 5-rep mastery system from active practice while tracking count
  const { activeProblemWords, clearedCount } = useMemo(() => {
    const active = assessment.problemWords.filter(
      (pw) => pw.kind === "filler" || !isProblemWordResolved(pw.word, practiceLanguage)
    );
    return {
      activeProblemWords: active,
      clearedCount: assessment.problemWords.length - active.length,
    };
  }, [assessment.problemWords, isProblemWordResolved, practiceLanguage]);

  // Candidate words eligible for "+ Add All" (non-filler words, deduplicated)
  const addableWords = useMemo(
    () => activeProblemWords.filter((pw) => pw.kind !== "filler").map((pw) => pw.word),
    [activeProblemWords]
  );

  const unsavedAddableWords = useMemo(() => {
    const seen = new Set<string>();
    return addableWords.filter((w) => {
      const n = normalizeWord(w);
      if (!n || seen.has(n)) return false;
      seen.add(n);
      return !words.some((saved) => saved.normalized === n && !saved.clearedFromActive);
    });
  }, [addableWords, words]);

  const safeDrillIdx = Math.min(drillIdx, Math.max(0, activeProblemWords.length - 1));
  const activeDrillWord = activeProblemWords[safeDrillIdx] ?? null;

  const handleAddAll = () => {
    if (addableWords.length === 0) return;
    addWordsBatch(addableWords, {
      language: practiceLanguage,
      source: "assessment",
      status: "difficult",
    });
  };

  return (
    <div className="grid gap-4">
      {/* Compact Overall Score Header with i toggle for formula/measurement details */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Ring value={assessment.overallScore / 100} size={80} stroke={7}>
            <div className="text-center">
              <p className="font-display text-[22px] font-bold leading-none tabular-nums">
                {assessment.overallScore}
              </p>
              <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                of 100
              </p>
            </div>
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  tone={
                    assessment.overallScore >= 80
                      ? "good"
                      : assessment.overallScore >= 60
                      ? "warn"
                      : "bad"
                  }
                >
                  {assessment.overallScore >= 85
                    ? "Strong delivery"
                    : assessment.overallScore >= 70
                    ? "Solid foundation"
                    : assessment.overallScore >= 55
                    ? "Building control"
                    : "Focus on fundamentals"}
                </Chip>
                {delta != null && (
                  <Chip tone={delta > 0 ? "good" : delta < 0 ? "warn" : "muted"}>
                    {delta > 0
                      ? `+${delta} vs last`
                      : delta < 0
                      ? `${delta} vs last`
                      : "Same as last"}
                  </Chip>
                )}
              </div>
              <InfoToggleBtn
                open={showFormula}
                onClick={() => setShowFormula((v) => !v)}
                label="How this score was calculated"
              />
            </div>

            {/* Key scannable metrics strip */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px]">
              <span className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums text-[var(--muted)]">
                Speed{" "}
                <strong className="text-[var(--ink)]">
                  {analysis.wpm != null ? `${analysis.wpm} WPM` : "n/a"}
                </strong>
              </span>
              <span className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums text-[var(--muted)]">
                Fillers <strong className="text-[var(--ink)]">{analysis.fillerTotal}</strong>
              </span>
              <span className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums text-[var(--muted)]">
                Long pauses <strong className="text-[var(--ink)]">{analysis.longPauses}</strong>
              </span>
              {analysis.pitch && (
                <span className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums text-[var(--muted)]">
                  Pitch{" "}
                  <strong className="text-[var(--ink)]">
                    {analysis.pitch.semitoneRange.toFixed(1)} st
                  </strong>
                </span>
              )}
              {analysis.coverage != null && (
                <span className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums text-[var(--muted)]">
                  Match <strong className="text-[var(--ink)]">{analysis.coverage}%</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expandable scoring breakdown */}
        {showFormula && (
          <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-3.5 text-[12px] sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--panel2)] p-3">
              <SectionLabel>Measured Evidence</SectionLabel>
              <p className="mt-1.5 text-[var(--muted)]">{assessment.overallBasis}</p>
              {assessment.measurableSummary.length > 0 && (
                <ul className="mt-2 grid gap-1 text-[var(--ink)]">
                  {assessment.measurableSummary.map((line, i) => (
                    <li key={i}>
                      <span className="mr-1.5 text-[var(--brand)]">●</span>
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-[var(--line)] pt-2 text-[11px] text-[var(--muted)]">
                {assessment.formulaSummary}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--panel2)] p-3">
              <SectionLabel>Measurement Notes</SectionLabel>
              <ul className="mt-1.5 grid gap-1 text-[var(--muted)]">
                {assessment.subjectiveNotes.map((line, i) => (
                  <li key={i}>
                    <span className="mr-1.5 text-[var(--accent)]">◆</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Six Compact Expandable Category Cards (Pronunciation, Clarity, Pace, Fluency, Pauses, Expression) */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionLabel>Category Scores</SectionLabel>
          <button
            type="button"
            onClick={toggleAllDims}
            className="text-[11.5px] font-semibold text-[var(--brand)] hover:underline"
          >
            {allDimsOpen ? "Collapse details" : "Expand all details"}
          </button>
        </div>

        <div className={`grid gap-2.5 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {dims.map((d) => {
            const isOpen = Boolean(openDims[d.key]);
            const status = statusLabelForScore(d.score, d.pendingSelfCheck);
            const badge = EVIDENCE_BADGE[d.evidenceKind];
            return (
              <div
                key={d.key}
                onClick={() => toggleDim(d.key)}
                className={`cursor-pointer rounded-xl border bg-[var(--panel)] p-3.5 transition-colors ${
                  isOpen
                    ? "border-[var(--brand)]"
                    : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{d.label}</p>
                    <p className="mt-0.5 truncate text-[11.5px] tabular-nums text-[var(--muted)]">
                      {d.rawDisplay}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="font-display text-[19px] font-bold leading-none tabular-nums text-[var(--ink)]">
                        {d.score != null ? d.score : "–"}
                        <span className="text-[10.5px] font-medium text-[var(--muted)]">/100</span>
                      </p>
                      <Chip tone={status.tone} className="mt-1">
                        {status.text}
                      </Chip>
                    </div>
                    <InfoToggleBtn
                      open={isOpen}
                      onClick={() => toggleDim(d.key)}
                      label={`${d.label} detailed insight`}
                    />
                  </div>
                </div>

                <div className="mt-2.5">
                  <ScoreBar value={d.score ?? 0} tone={d.pendingSelfCheck ? "brand" : undefined} />
                </div>

                {isOpen && (
                  <div
                    className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-2.5 text-[12px] leading-relaxed"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Detailed Insight
                      </span>
                      <Chip tone={badge.tone}>
                        {d.pendingSelfCheck ? "Self-Check Needed" : badge.label}
                      </Chip>
                    </div>
                    <p className="text-[var(--ink)]">
                      <strong className="text-[var(--muted)]">Evidence: </strong>
                      {d.evidence}
                    </p>
                    <p className="text-[var(--muted)]">
                      <strong className="text-[var(--ink)]">Coach note: </strong>
                      {d.interpretation}
                    </p>
                    <p className="font-medium text-[var(--brand)]">→ {d.tip}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Concise Key Takeaways (Strengths & Focus Points) */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--good)_32%,var(--line))] bg-[color-mix(in_srgb,var(--good)_6%,var(--panel))] p-3.5">
          <SectionLabel>Going Well</SectionLabel>
          <ul className="mt-2 grid gap-1.5">
            {assessment.strengths.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-[var(--ink)]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--good)] text-[9.5px] font-bold text-white">
                  ✓
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_6%,var(--panel))] p-3.5">
          <SectionLabel>Next Focus</SectionLabel>
          <ul className="mt-2 grid gap-1.5">
            {assessment.improvements.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-[var(--ink)]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[9.5px] font-bold text-white">
                  !
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Problem Words (with Inline Pronunciation, 0.7x/1.0x/Record Word, 5-Rep Practice & + Add All) */}
      {(activeProblemWords.length > 0 ||
        clearedCount > 0 ||
        assessment.problemSentences.length > 0) && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-[15px] font-semibold text-[var(--ink)]">
                  Words & Sentences to Practice
                </h4>
                {clearedCount > 0 && (
                  <Chip tone="good">
                    ✓ {clearedCount} word{clearedCount === 1 ? "" : "s"} cleared (4/5+)
                  </Chip>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                Listen at 0.7x / 1.0x, record a word check, or pass 4 of 5 reps to clear a word.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {addableWords.length > 0 && (
                <Btn
                  variant={unsavedAddableWords.length > 0 ? "soft" : "ghost"}
                  disabled={unsavedAddableWords.length === 0}
                  onClick={handleAddAll}
                  title="Save all detected unfamiliar/problem words to your Word Bank (skips duplicates)"
                >
                  {unsavedAddableWords.length > 0
                    ? `+ Add All (${unsavedAddableWords.length})`
                    : "✓ All Added"}
                </Btn>
              )}
              {activeProblemWords.length > 0 && (
                <Btn
                  variant="soft"
                  onClick={() => {
                    setDrillOpen((o) => !o);
                    setDrillIdx(0);
                  }}
                >
                  {drillOpen ? "Close Drill" : `Word Drill (${activeProblemWords.length})`}
                </Btn>
              )}
              {onRetryExercise && <Btn onClick={onRetryExercise}>Retry Exercise</Btn>}
            </div>
          </div>

          {/* Interactive Word Drill Stepper with inline pronunciation + [0.7x] [1.0x] [Record Word] + 5-Rep */}
          {drillOpen && activeDrillWord && (
            <div className="mt-4 rounded-xl border border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--panel2))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Chip tone="brand">
                  Word Drill {safeDrillIdx + 1} of {activeProblemWords.length}
                </Chip>
                <Chip
                  tone={
                    activeDrillWord.kind === "filler"
                      ? "warn"
                      : activeDrillWord.kind === "missing"
                      ? "bad"
                      : "accent"
                  }
                >
                  {activeDrillWord.kind}
                </Chip>
              </div>

              <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                <p className="font-display text-[24px] font-bold tracking-tight text-[var(--ink)]">
                  {activeDrillWord.word}
                </p>
                {activeDrillWord.kind !== "filler" && (
                  <WordPronunciation
                    word={activeDrillWord.word}
                    language={practiceLanguage}
                    savedWords={words}
                  />
                )}
              </div>

              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                {activeDrillWord.correctionTip}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <WordDrillControls
                  word={activeDrillWord.word}
                  language={practiceLanguage}
                  onRecordWord={(w) => openQuickWord(w)}
                />
                {activeDrillWord.kind !== "filler" && (
                  <Btn
                    variant="soft"
                    onClick={() =>
                      openFiveRepPractice({
                        word: activeDrillWord.word,
                        language: practiceLanguage,
                        context: activeDrillWord.context,
                        correctionTip: activeDrillWord.correctionTip,
                      })
                    }
                  >
                    Practice This Word (5×)
                  </Btn>
                )}
                <div className="ml-auto flex gap-1.5">
                  <Btn
                    variant="ghost"
                    disabled={safeDrillIdx <= 0}
                    onClick={() => setDrillIdx((i) => Math.max(0, i - 1))}
                  >
                    Prev
                  </Btn>
                  <Btn
                    variant="primary"
                    onClick={() => {
                      if (safeDrillIdx < activeProblemWords.length - 1) {
                        setDrillIdx((i) => i + 1);
                      } else {
                        setDrillOpen(false);
                      }
                    }}
                  >
                    {safeDrillIdx < activeProblemWords.length - 1 ? "Next →" : "Done"}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Compact Problem Word Cards */}
          {activeProblemWords.length > 0 && (
            <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
              {activeProblemWords.map((pw, idx) => {
                const cardKey = `${pw.word}-${idx}`;
                const saved = pw.kind !== "filler" ? findSavedWord(pw.word) : null;
                const infoOpen = Boolean(openWords[cardKey]);

                return (
                  <div
                    key={cardKey}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3"
                  >
                    {/* Top row: word + inline phonetic/IPA + status + i button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="font-display text-[15px] font-bold text-[var(--ink)]">
                            {pw.word}
                          </span>
                          {pw.kind !== "filler" && (
                            <WordPronunciation
                              word={pw.word}
                              language={practiceLanguage}
                              savedWords={words}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Chip
                          tone={
                            pw.kind === "filler"
                              ? "warn"
                              : pw.kind === "missing"
                              ? "bad"
                              : "accent"
                          }
                        >
                          {pw.kind}
                        </Chip>
                        <InfoToggleBtn
                          open={infoOpen}
                          onClick={() => toggleWordInfo(cardKey)}
                          label={`Details for "${pw.word}"`}
                        />
                      </div>
                    </div>

                    {/* Controls row: [0.7x] [1.0x] [Record Word] + Practice This Word + Save */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {pw.kind !== "filler" && (
                        <WordDrillControls
                          word={pw.word}
                          language={practiceLanguage}
                          onRecordWord={(w) => openQuickWord(w)}
                        />
                      )}
                      {pw.kind !== "filler" && (
                        <button
                          type="button"
                          onClick={() =>
                            openFiveRepPractice({
                              word: pw.word,
                              language: practiceLanguage,
                              context: pw.context,
                              correctionTip: pw.correctionTip,
                            })
                          }
                          className="chip chip-brand cursor-pointer hover:brightness-95"
                          title="Practice this word 5 times — 4/5 correct removes it from active problem words"
                        >
                          Practice This Word
                        </button>
                      )}
                      {pw.kind !== "filler" &&
                        (saved ? (
                          <button
                            type="button"
                            onClick={() => setPracticeWordId(saved.id)}
                            className="chip chip-good cursor-pointer hover:brightness-95"
                            title="Open in Personal Word Bank Coach"
                          >
                            ✓ Saved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              addWord(pw.word, {
                                language: practiceLanguage,
                                source: "assessment",
                                status: "difficult",
                              })
                            }
                            className="chip chip-muted cursor-pointer hover:border-[var(--brand)] hover:text-[var(--brand)]"
                            title="Add to your Personal Word Bank"
                          >
                            + Add
                          </button>
                        ))}
                      {pw.kind === "filler" && (
                        <span className="text-[11.5px] text-[var(--muted)]">{pw.context}</span>
                      )}
                    </div>

                    {/* Expandable coaching tip */}
                    {infoOpen && (
                      <div className="mt-2.5 space-y-1 border-t border-[var(--line)] pt-2 text-[11.5px] leading-relaxed">
                        <p className="text-[var(--muted)]">{pw.context}</p>
                        <p className="text-[var(--ink)]">{pw.correctionTip}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Problematic sentences — compact with i toggle */}
          {assessment.problemSentences.length > 0 && (
            <div className="mt-4 grid gap-2">
              <SectionLabel>Sentences to Polish</SectionLabel>
              {assessment.problemSentences.map((ps) => {
                const sOpen = Boolean(openSentences[ps.index]);
                return (
                  <div
                    key={ps.index}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone={ps.matchPct >= 75 ? "warn" : "bad"}>
                        Sentence #{ps.index} · {ps.matchPct}% match
                      </Chip>
                      {ps.fillers.length > 0 && (
                        <Chip tone="warn">fillers: {ps.fillers.join(", ")}</Chip>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        <Btn
                          variant="ghost"
                          onClick={() =>
                            speakSingle(ps.sentence, 0.88, preferredVoice, practiceLanguage)
                          }
                        >
                          Hear
                        </Btn>
                        {onPracticeText && (
                          <Btn
                            variant="soft"
                            onClick={() =>
                              onPracticeText(`Retry Sentence #${ps.index}`, ps.sentence)
                            }
                          >
                            Practice
                          </Btn>
                        )}
                        <InfoToggleBtn
                          open={sOpen}
                          onClick={() => toggleSentenceInfo(ps.index)}
                          label={`Sentence #${ps.index} coaching tip`}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink)]">
                      &ldquo;{ps.sentence}&rdquo;
                    </p>
                    {sOpen && (
                      <p className="mt-2 border-t border-[var(--line)] pt-2 text-[12px] leading-relaxed text-[var(--muted)]">
                        <strong className="text-[var(--ink)]">Tip: </strong>
                        {ps.tip}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <span className="text-[12px] text-[var(--muted)]">
              Noticed another tricky word while speaking?
            </span>
            <Btn variant="soft" onClick={() => openAddWord("", "assessment")}>
              + Add My Word
            </Btn>
          </div>
        </div>
      )}

      {activeProblemWords.length === 0 &&
        clearedCount === 0 &&
        assessment.problemSentences.length > 0 === false && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3">
            <span className="text-[12.5px] text-[var(--muted)]">
              Stumbled on a word while speaking? Save it to practice with slow & normal audio.
            </span>
            <Btn variant="soft" onClick={() => openAddWord("", "assessment")}>
              + Add My Word
            </Btn>
          </div>
        )}
    </div>
  );
}
