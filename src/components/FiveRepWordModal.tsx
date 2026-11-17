"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  FIVE_REP_PASS_THRESHOLD,
  FIVE_REP_TARGET,
  analyzeWordEntry,
  assessSingleWordPronunciation,
  normalizeWord,
} from "@/lib/pronunciation";
import { useSingleWordRecorder, type SingleWordCapture } from "@/lib/useSingleWordRecorder";
import { stopSpeaking } from "@/lib/tts";
import { Btn, Chip, InfoToggleBtn, Modal, WordDrillControls, WordPronunciation } from "./ui";

interface RepEntry {
  attemptNum: number;
  transcript: string;
  detectedWord: string;
  correct: boolean;
  similarityPct: number;
  feedback: string;
  audioUrl: string;
  ts: number;
}

function FiveRepWordBody({
  target,
  onClose,
}: {
  target: NonNullable<ReturnType<typeof useStore>["fiveRepTarget"]>;
  onClose: () => void;
}) {
  const { completeFiveRepSession, practiceLanguage, words } = useStore();
  const targetLang = target.language ?? practiceLanguage;
  const targetWord = target.word;

  const savedMatch = useMemo(() => {
    const norm = normalizeWord(targetWord);
    return words.find((w) => w.normalized === norm) ?? null;
  }, [targetWord, words]);

  const analyzed = useMemo(
    () => analyzeWordEntry(targetWord, targetLang),
    [targetWord, targetLang]
  );

  const [reps, setReps] = useState<RepEntry[]>([]);
  const [pendingNoSpeech, setPendingNoSpeech] = useState<SingleWordCapture | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [sessionOutcome, setSessionOutcome] = useState<{
    passed: boolean;
    correctCount: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const startedAtRef = useRef<number>(0);
  const repUrlsRef = useRef<string[]>([]);
  const repsRef = useRef<RepEntry[]>([]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    return () => {
      repUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      repUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    repsRef.current = reps;
  }, [reps]);

  const finalizeSession = useCallback(
    async (finalReps: RepEntry[]) => {
      setSaving(true);
      try {
        const durSec = Math.max(15, Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000));
        const res = await completeFiveRepSession({
          word: targetWord,
          language: targetLang,
          reps: finalReps.map((r) => ({
            transcript: r.transcript,
            correct: r.correct,
            similarityPct: r.similarityPct,
            ts: r.ts,
          })),
          durationSec: durSec,
        });
        setSessionOutcome({ passed: res.passed, correctCount: res.correctCount });
      } finally {
        setSaving(false);
      }
    },
    [completeFiveRepSession, targetLang, targetWord]
  );

  const pushRep = useCallback(
    (entry: RepEntry) => {
      const next = [...repsRef.current, entry].slice(0, FIVE_REP_TARGET);
      repsRef.current = next;
      setReps(next);
      setPendingNoSpeech(null);
      if (next.length >= FIVE_REP_TARGET) {
        void finalizeSession(next);
      }
    },
    [finalizeSession]
  );

  const handleCapture = useCallback(
    (cap: SingleWordCapture) => {
      if (!targetWord) return;
      // Preserve a dedicated object URL per rep so prior attempt replays work
      const repUrl = URL.createObjectURL(cap.blob);
      repUrlsRef.current.push(repUrl);

      const check = assessSingleWordPronunciation({
        targetWord,
        transcript: cap.transcript,
        language: targetLang,
        customPhonetic: savedMatch?.customPronunciation || savedMatch?.phonetic,
      });

      if (check.noSpeech) {
        // Give user an honest replay + self-verification prompt when browser STT didn't capture text
        setPendingNoSpeech({ ...cap, audioUrl: repUrl });
        return;
      }

      pushRep({
        attemptNum: repsRef.current.length + 1,
        transcript: check.detectedTranscript,
        detectedWord: check.detectedWord,
        correct: check.correct,
        similarityPct: check.similarityPct,
        feedback: check.feedback,
        audioUrl: repUrl,
        ts: Date.now(),
      });
    },
    [pushRep, savedMatch, targetLang, targetWord]
  );

  const recorder = useSingleWordRecorder(targetLang, handleCapture);

  const handleClose = () => {
    stopSpeaking();
    recorder.resetCapture();
    repUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    repUrlsRef.current = [];
    onClose();
  };

  const handleRestartFive = () => {
    stopSpeaking();
    recorder.resetCapture();
    repUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    repUrlsRef.current = [];
    startedAtRef.current = Date.now();
    setReps([]);
    repsRef.current = [];
    setPendingNoSpeech(null);
    setSessionOutcome(null);
  };

  const confirmEarCheck = (isCorrect: boolean) => {
    if (!pendingNoSpeech) return;
    pushRep({
      attemptNum: repsRef.current.length + 1,
      transcript: isCorrect ? targetWord : "(ear-checked: needs retry)",
      detectedWord: isCorrect ? targetWord : "unclear",
      correct: isCorrect,
      similarityPct: isCorrect ? 100 : 45,
      feedback: isCorrect
        ? `Verified accurate on replay for "${targetWord}".`
        : `Marked for refinement — listen at 0.7x before your next repetition.`,
      audioUrl: pendingNoSpeech.audioUrl,
      ts: Date.now(),
    });
  };

  const currentRepNum = Math.min(FIVE_REP_TARGET, reps.length + 1);
  const correctSoFar = reps.filter((r) => r.correct).length;
  const lastRep = reps[reps.length - 1] ?? null;
  const effectivePhonetic = savedMatch?.customPronunciation || savedMatch?.phonetic || analyzed.phonetic;
  const effectiveIpa = savedMatch?.ipa || analyzed.ipa;
  const mouthGuide = savedMatch?.mouthGuide || analyzed.mouthGuide;

  return (
    <Modal open onClose={handleClose} title={`5-Rep Word Practice — "${analyzed.word}"`} wide>
      <div className="space-y-4">
        {/* Word header + inline pronunciation + 0.7x / 1.0x controls */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
                  {analyzed.word}
                </h4>
                <WordPronunciation
                  word={analyzed.word}
                  language={targetLang}
                  phonetic={effectivePhonetic}
                  ipa={effectiveIpa}
                />
              </div>
              {savedMatch?.difficultPart && (
                <p className="mt-1 text-[12px] text-[var(--warn)]">
                  Focus syllable/sound: <strong>{savedMatch.difficultPart}</strong>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <WordDrillControls word={analyzed.word} language={targetLang} />
              <InfoToggleBtn
                open={showGuide}
                onClick={() => setShowGuide((v) => !v)}
                label="Show articulation guidance"
              />
            </div>
          </div>

          {showGuide && (
            <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-[12px] text-[var(--muted)]">
              {target.correctionTip && (
                <p className="text-[var(--ink)]">
                  <strong className="text-[var(--brand)]">Coach tip:</strong> {target.correctionTip}
                </p>
              )}
              <p>
                <strong className="text-[var(--ink)]">Tongue:</strong> {mouthGuide.tongue}
              </p>
              <p>
                <strong className="text-[var(--ink)]">Airflow:</strong> {mouthGuide.mouthAirflow}
              </p>
            </div>
          )}
        </div>

        {/* 5-Repetition progress tracker */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {sessionOutcome
                ? `Completed ${FIVE_REP_TARGET} of ${FIVE_REP_TARGET} Repetitions`
                : `Repetition ${currentRepNum} of ${FIVE_REP_TARGET}`}
            </span>
            <span className="text-[12px] font-semibold text-[var(--muted)]">
              Score <strong className="text-[var(--ink)]">{correctSoFar}/{reps.length || FIVE_REP_TARGET}</strong> ·{" "}
              {FIVE_REP_PASS_THRESHOLD}/{FIVE_REP_TARGET} clears word
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: FIVE_REP_TARGET }, (_, idx) => {
              const entry = reps[idx];
              const isActive = !sessionOutcome && idx === reps.length;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-all ${
                    entry
                      ? entry.correct
                        ? "border-[color-mix(in_srgb,var(--good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--good)_12%,var(--panel))] text-[var(--good)]"
                        : "border-[color-mix(in_srgb,var(--bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--bad)_10%,var(--panel))] text-[var(--bad)]"
                      : isActive
                      ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_10%,var(--panel))] text-[var(--brand)]"
                      : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)]"
                  }`}
                >
                  <span className="text-[10.5px] font-semibold uppercase">Rep {idx + 1}</span>
                  <span className="mt-0.5 text-[14px] font-bold">
                    {entry ? (entry.correct ? "✓" : "✗") : isActive ? "●" : "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Recording Control OR Ear-Check Fallback OR Final 5-Rep Result */}
        {sessionOutcome ? (
          <div
            className={`rounded-xl border p-4 ${
              sessionOutcome.passed
                ? "border-[color-mix(in_srgb,var(--good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--good)_10%,var(--panel))]"
                : "border-[color-mix(in_srgb,var(--warn)_45%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_10%,var(--panel))]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="font-display text-[16px] font-bold text-[var(--ink)]">
                {sessionOutcome.passed
                  ? `✓ "${analyzed.word}" Cleared (${sessionOutcome.correctCount}/${FIVE_REP_TARGET} Correct)`
                  : `${sessionOutcome.correctCount}/${FIVE_REP_TARGET} Correct — Keep Practicing`}
              </h5>
              <Chip tone={sessionOutcome.passed ? "good" : "warn"}>
                {sessionOutcome.passed ? "Removed from Active List" : `Need ${FIVE_REP_PASS_THRESHOLD}/${FIVE_REP_TARGET} to Clear`}
              </Chip>
            </div>
            <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
              {sessionOutcome.passed
                ? `"${analyzed.word}" has been removed from your active problematic words list. All 5 attempts and past progress statistics remain saved in your history.`
                : `Listen at 0.7x (${effectivePhonetic.replace(/-/g, "·")}) and run another 5-rep round whenever you're ready.`}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {!sessionOutcome.passed && (
                <Btn variant="primary" onClick={handleRestartFive}>
                  Practice 5 Reps Again
                </Btn>
              )}
              <Btn variant={sessionOutcome.passed ? "primary" : "ghost"} onClick={handleClose}>
                Done
              </Btn>
            </div>
          </div>
        ) : pendingNoSpeech ? (
          <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--panel2)] p-4">
            <p className="text-[13px] font-semibold text-[var(--ink)]">
              Compare Rep #{currentRepNum} by ear
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Browser live transcription didn&apos;t catch text on that take. Replay your clip next to 1.0x model audio and mark whether &ldquo;{analyzed.word}&rdquo; came out cleanly:
            </p>
            <audio controls src={pendingNoSpeech.audioUrl} className="mt-2.5 h-9 w-full" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Btn variant="primary" onClick={() => confirmEarCheck(true)}>
                ✓ Pronounced Correctly
              </Btn>
              <Btn variant="soft" onClick={() => confirmEarCheck(false)}>
                ✗ Needs Retry
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setPendingNoSpeech(null);
                  recorder.resetCapture();
                }}
              >
                Re-record Rep #{currentRepNum}
              </Btn>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[var(--ink)]">
                  {recorder.recording
                    ? `Listening… say "${analyzed.word}" clearly, then tap Stop`
                    : `Say "${analyzed.word}" clearly for Rep #${currentRepNum}`}
                </p>
                {recorder.recording && recorder.liveTranscript && (
                  <p className="mt-1 text-[12px] text-[var(--brand)]">
                    Heard: &ldquo;{recorder.liveTranscript}&rdquo;
                  </p>
                )}
              </div>

              {recorder.recording ? (
                <Btn variant="danger" onClick={recorder.stop} disabled={saving}>
                  <span className="rec-dot" /> Stop Rep #{currentRepNum}
                </Btn>
              ) : (
                <Btn variant="primary" onClick={() => void recorder.start()} disabled={saving}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.5" />
                  </svg>
                  Record Rep #{currentRepNum}
                </Btn>
              )}
            </div>

            {recorder.recording && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--brand)] transition-all duration-75"
                  style={{ width: `${Math.max(6, Math.round(recorder.level * 100))}%` }}
                />
              </div>
            )}

            {recorder.error && (
              <p className="mt-2 text-[12px] text-[var(--bad)]">{recorder.error}</p>
            )}
          </div>
        )}

        {/* Latest attempt instant comparison */}
        {lastRep && !pendingNoSpeech && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-[12px]">
            <div>
              <span className={`font-bold ${lastRep.correct ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                Rep #{lastRep.attemptNum} {lastRep.correct ? "✓ Correct" : "✗ Mismatch"}:
              </span>{" "}
              <span className="text-[var(--muted)]">
                {lastRep.correct
                  ? `Matched "${analyzed.word}"`
                  : `Intended "${analyzed.word}" · Heard "${lastRep.detectedWord}" (${lastRep.similarityPct}%)`}
              </span>
            </div>
            <audio controls src={lastRep.audioUrl} className="h-7 w-44 max-w-full" />
          </div>
        )}
      </div>
    </Modal>
  );
}

export function FiveRepWordModal() {
  const { fiveRepTarget, closeFiveRepPractice } = useStore();
  if (!fiveRepTarget) return null;
  return (
    <FiveRepWordBody
      key={`${fiveRepTarget.word}-${fiveRepTarget.language ?? "en"}`}
      target={fiveRepTarget}
      onClose={closeFiveRepPractice}
    />
  );
}
