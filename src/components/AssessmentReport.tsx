"use client";

import { useState } from "react";
import type { DetailedAssessment, DimensionScore, RecordingAnalysis } from "@/lib/types";
import { speakSingle } from "@/lib/tts";
import { useStore } from "@/lib/store";
import { Btn, Chip, Ring, ScoreBar, SectionLabel } from "./ui";

const EVIDENCE_BADGE: Record<DimensionScore["evidenceKind"], { label: string; tone: "brand" | "accent" | "muted" }> = {
  measured: { label: "Measured", tone: "brand" },
  hybrid: { label: "Measured + Self", tone: "accent" },
  self: { label: "Self-Check", tone: "muted" },
};

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
  const { settings } = useStore();
  const [showFormula, setShowFormula] = useState(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillIdx, setDrillIdx] = useState(0);

  const dims: DimensionScore[] = [
    assessment.dimensions.pronunciation,
    assessment.dimensions.clarity,
    assessment.dimensions.pace,
    assessment.dimensions.fluency,
    assessment.dimensions.pausesBreathing,
    assessment.dimensions.expression,
  ];

  const delta = previousScore != null ? assessment.overallScore - previousScore : null;
  const problemWords = assessment.problemWords;
  const activeDrillWord = problemWords[drillIdx] ?? problemWords[0];

  return (
    <div className="grid gap-5">
      {/* Overall score header */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Ring value={assessment.overallScore / 100} size={92} stroke={8}>
            <div className="text-center">
              <p className="font-display text-[24px] font-bold leading-none">{assessment.overallScore}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">of 100</p>
            </div>
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={assessment.overallScore >= 80 ? "good" : assessment.overallScore >= 60 ? "warn" : "bad"}>
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
                  {delta > 0 ? `+${delta} vs previous attempt` : delta < 0 ? `${delta} vs previous attempt` : "Same as previous attempt"}
                </Chip>
              )}
              <button
                type="button"
                onClick={() => setShowFormula((v) => !v)}
                className="chip chip-muted cursor-pointer hover:brightness-95"
              >
                {showFormula ? "Hide scoring math" : "How this score was calculated"}
              </button>
            </div>

            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{assessment.overallBasis}</p>

            {/* Key raw measurable strip */}
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-lg bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums">
                Speed: <strong className="text-[var(--ink)]">{analysis.wpm != null ? `${analysis.wpm} WPM` : "n/a"}</strong>
              </span>
              <span className="rounded-lg bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums">
                Fillers: <strong className="text-[var(--ink)]">{analysis.fillerTotal}</strong>
              </span>
              <span className="rounded-lg bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums">
                Long pauses: <strong className="text-[var(--ink)]">{analysis.longPauses}</strong>
              </span>
              {analysis.pitch && (
                <span className="rounded-lg bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums">
                  Pitch span: <strong className="text-[var(--ink)]">{analysis.pitch.semitoneRange.toFixed(1)} semitones</strong>
                </span>
              )}
              {analysis.coverage != null && (
                <span className="rounded-lg bg-[var(--panel2)] px-2.5 py-1 font-medium tabular-nums">
                  Script match (STT): <strong className="text-[var(--ink)]">{analysis.coverage}%</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expandable transparency drawer */}
        {showFormula && (
          <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--panel2)] p-3.5">
              <SectionLabel>Directly Measured Evidence</SectionLabel>
              <ul className="mt-2 grid gap-1.5 text-[12px] leading-relaxed text-[var(--ink)]">
                {assessment.measurableSummary.length > 0 ? (
                  assessment.measurableSummary.map((line, i) => (
                    <li key={i}>
                      <span className="mr-1.5 text-[var(--brand)]">●</span>
                      {line}
                    </li>
                  ))
                ) : (
                  <li className="text-[var(--muted)]">No live audio or transcript measurements captured yet.</li>
                )}
              </ul>
              <p className="mt-2.5 border-t border-[var(--line)] pt-2 text-[11.5px] text-[var(--muted)]">
                {assessment.formulaSummary}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--panel2)] p-3.5">
              <SectionLabel>Subjective & Technology Boundaries</SectionLabel>
              <ul className="mt-2 grid gap-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
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

      {/* Six Dimension Breakdown */}
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {dims.map((d) => {
          const badge = EVIDENCE_BADGE[d.evidenceKind];
          return (
            <div key={d.key} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13.5px] font-semibold">{d.label}</p>
                  <p className="mt-0.5 text-[11.5px] tabular-nums text-[var(--muted)]">{d.rawDisplay}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[20px] font-bold leading-none tabular-nums">
                    {d.score != null ? d.score : "–"}
                    <span className="text-[11px] font-medium text-[var(--muted)]">/100</span>
                  </p>
                  <Chip tone={badge.tone} className="mt-1">
                    {d.pendingSelfCheck ? "Self-Check Needed" : badge.label}
                  </Chip>
                </div>
              </div>
              <div className="mt-2.5">
                <ScoreBar value={d.score ?? 0} tone={d.pendingSelfCheck ? "brand" : undefined} />
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--ink)]">
                <strong className="text-[var(--muted)]">Evidence: </strong>
                {d.evidence}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--ink)]">Coach note: </strong>
                {d.interpretation}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--brand)]">
                → {d.tip}
              </p>
            </div>
          );
        })}
      </div>

      {/* Strengths vs Improvements */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--good)_30%,var(--line))] bg-[color-mix(in_srgb,var(--good)_5%,var(--panel))] p-4">
          <SectionLabel>What you did well</SectionLabel>
          <ul className="mt-2.5 grid gap-2">
            {assessment.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--good)] text-[10px] font-bold text-white">
                  ✓
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_5%,var(--panel))] p-4">
          <SectionLabel>What needs improvement</SectionLabel>
          <ul className="mt-2.5 grid gap-2">
            {assessment.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  !
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Specific Problematic Words & Sentences + Re-practice Loop */}
      {(problemWords.length > 0 || assessment.problemSentences.length > 0) && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-display text-[15px] font-semibold">Specific Problem Words & Sentences</h4>
              <p className="text-[12px] text-[var(--muted)]">
                Listen to the model pronunciation, drill the tricky spots slowly, then retry cleanly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {problemWords.length > 0 && (
                <Btn variant="soft" onClick={() => { setDrillOpen((o) => !o); setDrillIdx(0); }}>
                  {drillOpen ? "Close Word Drill" : `Practice ${problemWords.length} Problem Word${problemWords.length > 1 ? "s" : ""}`}
                </Btn>
              )}
              {onRetryExercise && (
                <Btn onClick={onRetryExercise}>Retry Full Exercise</Btn>
              )}
            </div>
          </div>

          {/* Interactive Micro-Drill for Problem Words */}
          {drillOpen && activeDrillWord && (
            <div className="mt-4 rounded-xl border border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,var(--panel2))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Chip tone="brand">Word Drill {drillIdx + 1} of {problemWords.length}</Chip>
                <span className="text-[11.5px] text-[var(--muted)]">{activeDrillWord.phoneticHint ?? activeDrillWord.kind}</span>
              </div>
              <p className="mt-2 font-display text-[26px] font-bold tracking-tight">{activeDrillWord.word}</p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">Context: {activeDrillWord.context}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink)]">{activeDrillWord.correctionTip}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Btn variant="soft" onClick={() => speakSingle(activeDrillWord.word, 0.78, settings.preferredVoice)}>
                  Hear slow (0.78×)
                </Btn>
                <Btn variant="ghost" onClick={() => speakSingle(activeDrillWord.word, 1.0, settings.preferredVoice)}>
                  Hear natural (1.0×)
                </Btn>
                <span className="text-[11.5px] text-[var(--muted)]">Say it 3× slowly, then 2× at natural pace.</span>
                <div className="ml-auto flex gap-1.5">
                  <Btn
                    variant="ghost"
                    disabled={drillIdx <= 0}
                    onClick={() => setDrillIdx((i) => Math.max(0, i - 1))}
                  >
                    Prev
                  </Btn>
                  <Btn
                    variant="primary"
                    onClick={() => {
                      if (drillIdx < problemWords.length - 1) setDrillIdx((i) => i + 1);
                      else {
                        setDrillOpen(false);
                        onRetryExercise?.();
                      }
                    }}
                  >
                    {drillIdx < problemWords.length - 1 ? "Next word →" : "Done — Retry take"}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Problem word list */}
          {problemWords.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {problemWords.map((pw, idx) => (
                <div key={`${pw.word}-${idx}`} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[14px] font-semibold">{pw.word}</span>
                    <Chip tone={pw.kind === "filler" ? "warn" : pw.kind === "missing" ? "bad" : "accent"}>
                      {pw.kind}
                    </Chip>
                    {pw.phoneticHint && <span className="text-[11px] text-[var(--muted)]">{pw.phoneticHint}</span>}
                    <button
                      type="button"
                      title={`Listen to "${pw.word}"`}
                      onClick={() => speakSingle(pw.word, 0.82, settings.preferredVoice)}
                      className="icon-btn ml-auto"
                    >
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
                    </button>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--muted)]">{pw.context}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink)]">{pw.correctionTip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Problematic sentences */}
          {assessment.problemSentences.length > 0 && (
            <div className="mt-4 grid gap-2">
              <SectionLabel>Sentences to polish</SectionLabel>
              {assessment.problemSentences.map((ps) => (
                <div key={ps.index} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={ps.matchPct >= 75 ? "warn" : "bad"}>Sentence #{ps.index} · {ps.matchPct}% match</Chip>
                    {ps.fillers.length > 0 && <Chip tone="warn">fillers: {ps.fillers.join(", ")}</Chip>}
                    <div className="ml-auto flex gap-1.5">
                      <Btn variant="ghost" onClick={() => speakSingle(ps.sentence, 0.88, settings.preferredVoice)}>
                        Hear model
                      </Btn>
                      {onPracticeText && (
                        <Btn variant="soft" onClick={() => onPracticeText(`Retry Sentence #${ps.index}`, ps.sentence)}>
                          Practice this sentence
                        </Btn>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]">“{ps.sentence}”</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
                    <strong className="text-[var(--ink)]">Correction: </strong>
                    {ps.tip}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
