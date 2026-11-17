"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  analyzeWordEntry,
  assessSingleWordPronunciation,
  normalizeWord,
  type SingleWordCheckResult,
} from "@/lib/pronunciation";
import { useSingleWordRecorder, type SingleWordCapture } from "@/lib/useSingleWordRecorder";
import { stopSpeaking } from "@/lib/tts";
import { Btn, Chip, Field, Input, Modal, WordDrillControls, WordPronunciation } from "./ui";

function QuickWordDialogBody({
  initialWord,
  onClose,
}: {
  initialWord: string;
  onClose: () => void;
}) {
  const {
    completeQuickWordCheck,
    openFiveRepPractice,
    addWord,
    words,
    practiceLanguage,
  } = useStore();

  const [wordInput, setWordInput] = useState(initialWord);
  const [result, setResult] = useState<SingleWordCheckResult | null>(null);
  const [lastCapture, setLastCapture] = useState<SingleWordCapture | null>(null);
  const [manualHeard, setManualHeard] = useState("");
  const [addedToBank, setAddedToBank] = useState(false);

  const cleanWord = wordInput.trim();
  const savedMatch = useMemo(() => {
    const norm = normalizeWord(cleanWord);
    return norm ? words.find((w) => w.normalized === norm) ?? null : null;
  }, [cleanWord, words]);

  const preview = useMemo(
    () => (cleanWord ? analyzeWordEntry(cleanWord, practiceLanguage) : null),
    [cleanWord, practiceLanguage]
  );

  const handleCapture = useCallback(
    (cap: SingleWordCapture) => {
      setLastCapture(cap);
      setAddedToBank(false);
      if (!wordInput.trim()) return;
      const evaluated = assessSingleWordPronunciation({
        targetWord: wordInput.trim(),
        transcript: cap.transcript,
        language: practiceLanguage,
        customPhonetic: savedMatch?.customPronunciation || savedMatch?.phonetic,
      });
      setResult(evaluated);
    },
    [practiceLanguage, savedMatch, wordInput]
  );

  const recorder = useSingleWordRecorder(practiceLanguage, handleCapture);

  const handleClose = () => {
    stopSpeaking();
    recorder.resetCapture();
    onClose();
  };

  const handleWordChange = (nextVal: string) => {
    setWordInput(nextVal);
    if (result) {
      setResult(null);
      setAddedToBank(false);
    }
  };

  const handlePracticeAgain = () => {
    stopSpeaking();
    recorder.resetCapture();
    setResult(null);
    setLastCapture(null);
    setManualHeard("");
    void recorder.start();
  };

  const handleManualCompare = () => {
    if (!cleanWord || !manualHeard.trim()) return;
    const evaluated = assessSingleWordPronunciation({
      targetWord: cleanWord,
      transcript: manualHeard.trim(),
      language: practiceLanguage,
      customPhonetic: savedMatch?.customPronunciation || savedMatch?.phonetic,
    });
    setResult(evaluated);
  };

  const handleSaveToBank = () => {
    if (!cleanWord) return;
    const detected = result && !result.correct && result.detectedWord ? result.detectedWord : undefined;
    const blobKey = lastCapture
      ? `wordrec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      : undefined;
    addWord(cleanWord, {
      language: practiceLanguage,
      status: "difficult",
      source: "quick-practice",
      detectedPronunciation: detected,
      userRecordingBlob: lastCapture?.blob ?? null,
      userRecordingBlobKey: blobKey,
      userRecordingMimeType: lastCapture?.mimeType,
      userRecordingTranscript: result?.detectedTranscript || undefined,
      notes: detected
        ? `Quick Word Practice: intended "${cleanWord}", spoke "${detected}".`
        : undefined,
    });
    setAddedToBank(true);
  };

  const handleComplete = () => {
    if (!cleanWord) return;
    completeQuickWordCheck(cleanWord, practiceLanguage, lastCapture?.durationSec ?? 12);
    handleClose();
  };

  const effectivePhonetic =
    savedMatch?.customPronunciation || savedMatch?.phonetic || preview?.phonetic || "";
  const effectiveIpa = savedMatch?.ipa || preview?.ipa || "";

  return (
    <Modal
      open
      onClose={handleClose}
      title={practiceLanguage === "hi" ? "Quick Word Practice (हिन्दी)" : "Quick Word Practice"}
    >
      <div className="space-y-4">
        <Field
          label="Word to Practice"
          hint="Type or paste any single word, listen at 0.7x or 1.0x, then record your pronunciation."
        >
          <Input
            autoFocus={!initialWord}
              placeholder={
                practiceLanguage === "hi"
                  ? "e.g., स्पष्ट, अभिव्यक्ति, आत्मविश्वास…"
                  : "e.g., intermediate, calmly, thorough, schedule…"
              }
              value={wordInput}
              onChange={(e) => handleWordChange(e.target.value)}
            />
          </Field>

          {/* Instant pronunciation breakdown + slow/normal audio + record */}
          {preview && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-xl font-bold text-[var(--ink)]">{preview.word}</span>
                    <WordPronunciation
                      word={preview.word}
                      language={practiceLanguage}
                      phonetic={effectivePhonetic}
                      ipa={effectiveIpa}
                    />
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--muted)]">{preview.mouthGuide.tongue}</p>
                </div>
                <WordDrillControls word={preview.word} language={practiceLanguage} />
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
                {recorder.recording ? (
                  <Btn variant="danger" onClick={recorder.stop}>
                    <span className="rec-dot" /> Stop Recording
                  </Btn>
                ) : (
                  <Btn variant="primary" onClick={() => void recorder.start()}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      <circle cx="6" cy="6" r="4.5" />
                    </svg>
                    {result ? "Record Again" : "Record Word"}
                  </Btn>
                )}

                {recorder.recording && (
                  <span className="text-[12px] text-[var(--muted)]">
                    {recorder.liveTranscript ? `Hearing: "${recorder.liveTranscript}"` : `Say "${preview.word}" clearly…`}
                  </span>
                )}
              </div>

              {recorder.recording && (
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
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

          {/* Replay recorded clip */}
          {lastCapture && !recorder.recording && (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11.5px] font-semibold text-[var(--muted)]">Your recorded take</span>
                <audio controls src={lastCapture.audioUrl} className="h-8 w-56 max-w-full" />
              </div>
            </div>
          )}

          {/* Pronunciation comparison result */}
          {result && !result.noSpeech && (
            <div
              className={`rounded-xl border p-4 ${
                result.correct
                  ? "border-[color-mix(in_srgb,var(--good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--good)_10%,var(--panel))]"
                  : "border-[color-mix(in_srgb,var(--warn)_45%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_9%,var(--panel))]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="font-display text-[15px] font-bold text-[var(--ink)]">
                  {result.correct ? "✓ Pronounced Accurately!" : "Pronunciation Difference Detected"}
                </h5>
                <Chip tone={result.correct ? "good" : "warn"}>
                  {result.correct ? "100% Match" : `${result.similarityPct}% Match`}
                </Chip>
              </div>

              {result.correct ? (
                <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
                  You spoke <strong className="text-[var(--ink)]">&ldquo;{result.targetWord}&rdquo;</strong> cleanly (
                  <span className="font-mono text-[11.5px]">{result.phonetic}</span> ·{" "}
                  <span className="font-mono text-[11.5px]">{result.ipa}</span>).
                </p>
              ) : (
                <div className="mt-2.5 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-[12.5px] sm:grid-cols-2">
                  <div>
                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Intended Word
                    </span>
                    <span className="font-semibold text-[var(--good)]">{result.targetWord}</span>
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Detected Spoken Version
                    </span>
                    <span className="font-semibold text-[var(--bad)]">
                      {result.detectedWord || "(unclear)"}
                    </span>
                  </div>
                  <div className="sm:col-span-2 border-t border-[var(--line)] pt-2">
                    <span className="block text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Pronunciation Guidance
                    </span>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                        {result.phonetic} <span className="text-[var(--muted)]">· {result.ipa}</span>
                      </span>
                      <WordDrillControls word={result.targetWord} language={practiceLanguage} />
                    </div>
                    <p className="mt-1 text-[11.5px] text-[var(--muted)]">{result.feedback}</p>
                  </div>
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {result.correct ? (
                  <>
                    <Btn variant="primary" onClick={handleComplete}>
                      ✓ Complete & Close
                    </Btn>
                    <Btn variant="soft" onClick={handlePracticeAgain}>
                      Practice Again
                    </Btn>
                    {!savedMatch && !addedToBank && (
                      <Btn variant="ghost" onClick={handleSaveToBank}>
                        + Add to Word Bank
                      </Btn>
                    )}
                  </>
                ) : (
                  <>
                    <Btn
                      variant={addedToBank ? "soft" : "primary"}
                      disabled={addedToBank}
                      onClick={handleSaveToBank}
                    >
                      {addedToBank ? "✓ Added to Word Bank" : "+ Add to Word Bank"}
                    </Btn>
                    <Btn variant="soft" onClick={handlePracticeAgain}>
                      Practice Again
                    </Btn>
                    <Btn
                      variant="ghost"
                      onClick={() => {
                        const target = result.targetWord;
                        handleClose();
                        openFiveRepPractice({
                          word: target,
                          language: practiceLanguage,
                          correctionTip: result.feedback,
                        });
                      }}
                    >
                      Practice 5 Reps
                    </Btn>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Fallback when browser lacked SpeechRecognition or captured silent audio */}
          {result && result.noSpeech && (
            <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--panel2)] p-4 space-y-3">
              <p className="text-[12.5px] text-[var(--muted)]">
                Live speech-to-text didn&apos;t capture text for that recording. Replay your take beside{" "}
                <strong className="text-[var(--ink)]">0.7x / 1.0x</strong> above, then either mark the result, type what it sounded like, or save it to your Word Bank:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder={`Type what you heard (e.g., intermeda or ${cleanWord})`}
                  value={manualHeard}
                  onChange={(e) => setManualHeard(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualCompare()}
                />
                <Btn variant="soft" onClick={handleManualCompare} disabled={!manualHeard.trim()}>
                  Compare
                </Btn>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Btn variant="primary" onClick={handleComplete}>
                  ✓ Sounded Accurate
                </Btn>
                <Btn variant="soft" disabled={addedToBank} onClick={handleSaveToBank}>
                  {addedToBank ? "✓ Added to Word Bank" : "+ Add to Word Bank"}
                </Btn>
                <Btn variant="ghost" onClick={handlePracticeAgain}>
                  Practice Again
                </Btn>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}

export function QuickWordWidget() {
  const { quickWordModal, openQuickWord, closeQuickWord } = useStore();
  return (
    <>
      <button
        type="button"
        onClick={() => openQuickWord("")}
        className="quick-word-fab"
        aria-label="Quick Word Practice — test and practice any single word"
        title="Practice any word right here without leaving your page"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <rect x="5.2" y="1.8" width="5.6" height="8.2" rx="2.8" />
          <path d="M3.2 7.8a4.8 4.8 0 009.6 0M8 12.6v1.8M5.6 14.4h4.8" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Practice a Word</span>
        <span className="sm:hidden">Word</span>
      </button>

      {quickWordModal.open && (
        <QuickWordDialogBody
          key={quickWordModal.sessionKey}
          initialWord={quickWordModal.initialWord}
          onClose={closeQuickWord}
        />
      )}
    </>
  );
}
