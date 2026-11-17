"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  compareWordBeforeAfter,
  evaluateWordAttempt,
  recommendedPracticeSpeed,
} from "@/lib/pronunciation";
import { buildAnalysis, compareWords } from "@/lib/analytics";
import { dayProgressLabel } from "@/lib/program";
import { speakSingle, stopSpeaking } from "@/lib/tts";
import { useStore } from "@/lib/store";
import {
  PRACTICE_LANGUAGE_META,
  SOUND_CATEGORY_LABELS,
  WORD_PROBLEM_TYPE_LABELS,
  fmtDur,
  langOf,
  uid,
  type PersonalWord,
  type Recording,
  type VolumeSample,
  type WordAttempt,
} from "@/lib/types";
import {
  Btn,
  Chip,
  DotRating,
  MicHelperBanner,
  Modal,
  Ring,
  ScoreBar,
  SectionLabel,
  Textarea,
  VoiceWaveBars,
  WordDrillControls,
  WordPronunciation,
} from "./ui";

function SavedBlobPlayer({ recordingId, label }: { recordingId: string; label: string }) {
  const { getBlob } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);

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
        setMissing(false);
      } else {
        setMissing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (url) {
    return (
      <div className="mt-2">
        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
        <audio controls src={url} className="h-9 w-full" />
      </div>
    );
  }
  return (
    <div className="mt-2">
      <Btn variant="ghost" disabled={loading} onClick={() => void load()}>
        {loading ? "Loading audio…" : missing ? "No audio stored for this take" : `Play ${label}`}
      </Btn>
    </div>
  );
}

function HighlightWord({ sentence, target }: { sentence: string; target: string }) {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = sentence.split(new RegExp(`(\\b${escaped}[a-z']*\\b)`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase().startsWith(target.toLowerCase()) ? (
          <span key={i} className="cue-emphasis">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function WordPracticeWorkspace({
  word,
  onClose,
}: {
  word: PersonalWord;
  onClose: () => void;
}) {
  const {
    settings,
    words,
    dueWords,
    recordWordAttempt,
    openEditWord,
    openFiveRepPractice,
    openQuickWord,
    setPracticeWordId,
    toast,
  } = useStore();

  const wordLang = langOf(word);
  const preferredVoice = wordLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;
  const recSpeed = useMemo(() => recommendedPracticeSpeed(word), [word]);
  const [speedMode, setSpeedMode] = useState<"slow" | "natural">(recSpeed.mode);
  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState("");
  const [manual, setManual] = useState("");
  const [usingManual, setUsingManual] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [rmsLevel, setRmsLevel] = useState(0.03);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [capturedTranscript, setCapturedTranscript] = useState("");
  const [capturedDur, setCapturedDur] = useState(4);
  const [selfScore, setSelfScore] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<WordAttempt | null>(null);

  const srRef = useRef<any>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTs = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const finals = useRef<string[]>([]);
  const tlRef = useRef<VolumeSample[]>([]);
  const recOn = useRef(false);
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      recOn.current = false;
      stopSpeaking();
      try {
        srRef.current?.stop();
      } catch {
        /* noop */
      }
      try {
        const mr = mrRef.current;
        if (mr) {
          mr.onstop = null;
          if (mr.state !== "inactive") mr.stop();
        }
      } catch {
        /* noop */
      }
      if (volIv.current) clearInterval(volIv.current);
      if (elapsedIv.current) clearInterval(elapsedIv.current);
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const stopTracks = () => {
    recOn.current = false;
    try {
      srRef.current?.stop();
    } catch {
      /* noop */
    }
    if (volIv.current) {
      clearInterval(volIv.current);
      volIv.current = null;
    }
    if (elapsedIv.current) {
      clearInterval(elapsedIv.current);
      elapsedIv.current = null;
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* noop */
    }
    audioCtxRef.current = null;
  };

  const finishCapture = (audio: Blob | null) => {
    if (disposed.current) return;
    const durationSec = Math.max(2, Math.round((Date.now() - startTs.current) / 1000));
    stopTracks();
    const transcript = finals.current.join(" ").replace(/\s+/g, " ").trim();
    setCapturedTranscript(transcript);
    setCapturedDur(durationSec);
    setBlob(audio);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    if (audio && audio.size > 0) setBlobUrl(URL.createObjectURL(audio));
    else setBlobUrl(null);
    if (!transcript) {
      setManual(speedMode === "slow" ? word.word : word.exampleSentence);
      setUsingManual(true);
    } else {
      setUsingManual(false);
    }
    setSavedAttempt(null);
    setPhase("review");
  };

  const startRecording = async () => {
    stopSpeaking();
    setMicError(null);
    finals.current = [];
    chunks.current = [];
    tlRef.current = [];
    setLive("");
    setElapsed(0);
    setSelfScore(0);
    setSavedAttempt(null);
    setPhase("recording");

    try {
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Unsupported", "NotSupportedError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mrRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        finishCapture(b);
      };
      mr.start(250);

      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        if (ctx.state === "suspended") void ctx.resume();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        volIv.current = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          setRmsLevel(rms);
          tlRef.current.push({ t: Date.now() - startTs.current, r: rms });
        }, 100);
      } catch {
        /* audio level unavailable */
      }

      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        const r = new SR();
        srRef.current = r;
        r.continuous = true;
        r.interimResults = true;
        r.lang = PRACTICE_LANGUAGE_META[wordLang].bcp47;
        r.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) finals.current.push(res[0].transcript);
            else interim += res[0].transcript;
          }
          setLive([...finals.current].join(" ") + " " + interim);
        };
        r.onend = () => {
          if (recOn.current) {
            try {
              r.start();
            } catch {
              /* noop */
            }
          }
        };
        r.onerror = () => {
          /* continue recording */
        };
        try {
          r.start();
        } catch {
          /* noop */
        }
      }

      startTs.current = Date.now();
      recOn.current = true;
      elapsedIv.current = setInterval(() => setElapsed(Math.round((Date.now() - startTs.current) / 1000)), 500);
    } catch (e) {
      setPhase("idle");
      stopTracks();
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone permission was denied here. Use Manual Practice Check below or run SpeechCoach locally on localhost:3000.");
        toast("Microphone blocked — use Manual Practice Check below.", "err");
      } else {
        setMicError("Live microphone capture isn't available in this browser frame. You can still practice with Manual Practice Check below.");
        toast("Recording unavailable — Manual Practice Check is ready below.", "err");
      }
    }
  };

  const stopRecording = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    else finishCapture(null);
  };

  const openManualCheck = () => {
    setBlob(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setCapturedTranscript("");
    setCapturedDur(speedMode === "slow" ? 5 : 10);
    setManual(speedMode === "slow" ? word.word : word.exampleSentence);
    setUsingManual(true);
    setSelfScore(0);
    setSavedAttempt(null);
    setPhase("review");
  };

  const effectiveTranscript = usingManual ? manual.trim() : capturedTranscript;

  const previewAttempt = useMemo(() => {
    if (phase !== "review") return null;
    return evaluateWordAttempt({
      word,
      transcript: effectiveTranscript,
      speedMode,
      selfScore: selfScore > 0 ? selfScore : null,
      nowMs: 1,
    });
  }, [phase, word, effectiveTranscript, speedMode, selfScore]);

  const handleSaveAttempt = async () => {
    setSaving(true);
    try {
      const now = Date.now();
      const recId = blob && blob.size > 0 ? uid() : null;
      const attempt = evaluateWordAttempt({
        word,
        transcript: effectiveTranscript,
        speedMode,
        selfScore: selfScore > 0 ? selfScore : null,
        recordingId: recId,
        nowMs: now,
      });

      let fullRec: Recording | null = null;
      if (recId && blob && blob.size > 0) {
        const expectedScript = speedMode === "slow" ? word.word : word.exampleSentence;
        const cmp = compareWords(expectedScript, effectiveTranscript);
        const analysis = buildAnalysis(effectiveTranscript, capturedDur, tlRef.current, cmp, undefined, wordLang);
        fullRec = {
          id: recId,
          createdAt: now,
          title: `Word Drill: ${word.word} (${speedMode})`,
          mode: "word-bank",
          language: wordLang,
          scriptText: expectedScript,
          transcript: effectiveTranscript,
          durationSec: capturedDur,
          analysis,
          self:
            selfScore > 0
              ? {
                  clarity: selfScore,
                  pronunciation: selfScore,
                  fluency: 0,
                  pacing: 0,
                  vocalControl: 0,
                }
              : null,
          hasAudio: true,
          mimeType: blob.type || "audio/webm",
          dayLabel: dayProgressLabel(settings.currentDay),
        };
      }

      await recordWordAttempt(word.id, attempt, fullRec, blob);
      setSavedAttempt(attempt);
    } finally {
      setSaving(false);
    }
  };

  const retryNow = () => {
    setSavedAttempt(null);
    setSelfScore(0);
    setPhase("idle");
  };

  const beforeAfter = useMemo(() => compareWordBeforeAfter(word), [word]);
  const strongDays = new Set(word.attempts.filter((a) => a.score >= 80).map((a) => a.date)).size;
  const hasNaturalSuccess = word.attempts.some((a) => a.speedMode === "natural" && a.score >= 80);

  // Next due word shortcut
  const nextDue = useMemo(
    () => dueWords.find((w) => w.id !== word.id) ?? words.find((w) => w.id !== word.id && w.status !== "mastered") ?? null,
    [dueWords, words, word.id]
  );

  return (
    <div className="grid gap-5">
      {/* Header Summary Card */}
      <div className="coach-hero p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Ring value={word.masteryScore / 100} size={82} stroke={7}>
            <div className="text-center">
              <p className="font-display text-[20px] font-bold leading-none tabular-nums">{word.masteryScore}</p>
              <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">Mastery</p>
            </div>
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight">{word.word}</h2>
              <WordPronunciation
                word={word.word}
                language={wordLang}
                phonetic={word.customPronunciation || word.phonetic}
                ipa={word.ipa}
              />
              {word.clearedFromActive ? (
                <Chip tone="good">✓ Cleared (4/5+)</Chip>
              ) : (
                <Chip
                  tone={word.status === "mastered" ? "good" : word.status === "learning" ? "warn" : "bad"}
                  className="capitalize"
                >
                  {word.status}
                </Chip>
              )}
              {word.problemType && (
                <Chip tone="accent">
                  {word.problemType === "other" && word.problemTypeOther
                    ? word.problemTypeOther
                    : WORD_PROBLEM_TYPE_LABELS[word.problemType]}
                </Chip>
              )}
              {word.difficultPart && <Chip tone="warn">Focus: {word.difficultPart}</Chip>}
            </div>

            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]">{word.meaning}</p>
            {word.notes && (
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                <strong className="text-[var(--ink)]">My note:</strong> {word.notes}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {word.soundTags.map((s) => (
                <Chip key={s} tone="brand">
                  {SOUND_CATEGORY_LABELS[s].short} · {SOUND_CATEGORY_LABELS[s].phonemes}
                </Chip>
              ))}
              <button
                type="button"
                className="chip chip-muted ml-auto cursor-pointer hover:text-[var(--ink)]"
                onClick={() => openEditWord(word)}
              >
                Edit word details
              </button>
            </div>
          </div>
        </div>

        {/* Example sentence + Model Audio Buttons */}
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <SectionLabel>Example Sentence & Model Pronunciation Audio</SectionLabel>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink)]">
            &ldquo;<HighlightWord sentence={word.exampleSentence} target={word.word} />&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <WordDrillControls
              word={word.word}
              language={wordLang}
              onRecordWord={(wd) => {
                onClose();
                openQuickWord(wd);
              }}
            />
            <Btn
              variant="soft"
              onClick={() => {
                onClose();
                openFiveRepPractice({
                  word: word.word,
                  language: wordLang,
                  correctionTip: word.mouthGuide.tongue,
                });
              }}
            >
              Practice 5 Reps
            </Btn>
            <Btn variant="ghost" onClick={() => speakSingle(word.exampleSentence, 0.75, preferredVoice, wordLang)}>
              ▶ Sentence 0.7x
            </Btn>
            <Btn variant="ghost" onClick={() => speakSingle(word.exampleSentence, 1.0, preferredVoice, wordLang)}>
              ▶ Sentence 1.0x
            </Btn>
          </div>
        </div>
      </div>

      {/* Tongue, Lips, and Mouth Positioning Guide */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
          <SectionLabel>1. Tongue Placement</SectionLabel>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink)]">{word.mouthGuide.tongue}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
          <SectionLabel>2. Lip Shape</SectionLabel>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink)]">{word.mouthGuide.lips}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
          <SectionLabel>3. Mouth & Airflow</SectionLabel>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink)]">{word.mouthGuide.mouthAirflow}</p>
        </div>
      </div>

      {/* Interactive Practice Mode + Recorder */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
          <div>
            <SectionLabel>Practice Mode & Recording Check</SectionLabel>
            <p className="mt-1 text-[12px] text-[var(--muted)]">{recSpeed.reason}</p>
          </div>
          <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-1">
            <button
              type="button"
              onClick={() => {
                setSpeedMode("slow");
                if (phase !== "recording") setPhase("idle");
              }}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                speedMode === "slow" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Slow Practice (Word ×3)
            </button>
            <button
              type="button"
              onClick={() => {
                setSpeedMode("natural");
                if (phase !== "recording") setPhase("idle");
              }}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                speedMode === "natural"
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              Natural Speed (Sentence)
            </button>
          </div>
        </div>

        {/* Prompt box */}
        <div className="mt-4 rounded-xl bg-[var(--panel2)] p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
            {speedMode === "slow" ? "Say this word slowly 3 times (exaggerate clean placement):" : "Say the full sentence at natural speed:"}
          </p>
          <p className="mt-1 font-display text-[17px] font-semibold leading-snug">
            {speedMode === "slow" ? `${word.word}   ·   ${word.phonetic}   ·   ${word.word}` : word.exampleSentence}
          </p>
        </div>

        {/* IDLE */}
        {phase === "idle" && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Btn onClick={() => void startRecording()}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="4.5" r="3" />
                  <path d="M2.5 10.2c1-1.7 6-1.7 7 0" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                Record Attempt
              </Btn>
              <Btn variant="ghost" onClick={openManualCheck}>
                Manual Transcript / Ear Check
              </Btn>
            </div>
            <MicHelperBanner error={micError} onManual={openManualCheck} />
          </div>
        )}

        {/* RECORDING */}
        {phase === "recording" && (
          <div className="animate-pop mt-4 grid gap-3 rounded-xl border border-[var(--brand)] bg-[var(--panel2)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rec-dot" />
              <span className="font-display text-[17px] font-bold tabular-nums">{fmtDur(elapsed)}</span>
              <VoiceWaveBars level={rmsLevel} />
              <Btn variant="danger" onClick={stopRecording} className="ml-auto">
                Stop & Evaluate
              </Btn>
            </div>
            <p className="text-[13px] text-[var(--muted)]">
              {live ? (
                <span className="text-[var(--ink)]">
                  {live} <span className="caret">▍</span>
                </span>
              ) : (
                "Listening… speak clearly on a relaxed breath."
              )}
            </p>
          </div>
        )}

        {/* REVIEW & HONEST SCORING */}
        {phase === "review" && previewAttempt && (
          <div className="animate-pop mt-4 grid gap-4">
            {blobUrl && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>Replay Your Take vs. Model Audio</SectionLabel>
                  <Btn
                    variant="ghost"
                    onClick={() =>
                      speakSingle(
                        speedMode === "slow" ? word.word : word.exampleSentence,
                        speedMode === "slow" ? 0.75 : 1.0,
                        settings.preferredVoice
                      )
                    }
                  >
                    Compare with Model
                  </Btn>
                </div>
                <audio controls src={blobUrl} className="w-full" />
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Recognized Speech (Objective STT Check)</SectionLabel>
                <button
                  type="button"
                  className="chip chip-muted cursor-pointer"
                  onClick={() => {
                    if (!usingManual) setManual(capturedTranscript);
                    setUsingManual((v) => !v);
                  }}
                >
                  {usingManual ? "Use auto transcript" : "Edit transcript"}
                </button>
              </div>
              {usingManual ? (
                <Textarea
                  rows={2}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Type what you spoke or heard on playback…"
                />
              ) : (
                <div className="rounded-lg bg-[var(--panel2)] p-3 text-[13px]">
                  {capturedTranscript || "No browser speech-to-text captured — replay your audio and rate honestly below."}
                </div>
              )}
            </div>

            {/* Listening Self-Check (Crucial for honest pronunciation scoring!) */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
              <SectionLabel>Your Listening Self-Check (Required for True Mastery)</SectionLabel>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                Compare your playback against the model audio. Speech-to-text alone can guess a word from context—your ear confirms real tongue &amp; lip precision.
              </p>
              <div className="mt-2.5">
                <DotRating label="Pronunciation" value={selfScore} onChange={setSelfScore} />
              </div>
            </div>

            {/* Instant Explainable Score & Feedback */}
            <div className="rounded-xl border border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_5%,var(--panel))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[22px] font-bold tabular-nums">
                    {(savedAttempt ?? previewAttempt).score}/100
                  </span>
                  <Chip tone={(savedAttempt ?? previewAttempt).evidenceKind === "hybrid" ? "accent" : "brand"}>
                    {(savedAttempt ?? previewAttempt).evidenceKind === "hybrid"
                      ? "STT Match + Self-Check"
                      : (savedAttempt ?? previewAttempt).evidenceKind === "measured"
                      ? "STT Match Only (Capped 85)"
                      : "Self-Check"}
                  </Chip>
                </div>
                {savedAttempt && <Chip tone="good">✓ Attempt Saved</Chip>}
              </div>
              <div className="mt-2">
                <ScoreBar value={(savedAttempt ?? previewAttempt).score} />
              </div>
              <p className="mt-2.5 text-[12.5px] text-[var(--ink)]">
                <strong>Evidence: </strong>
                {(savedAttempt ?? previewAttempt).evidence}
              </p>
              <p className="mt-1.5 text-[12.5px] font-medium text-[var(--brand)]">
                Coach feedback: {(savedAttempt ?? previewAttempt).feedback}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!savedAttempt ? (
                <Btn disabled={saving} onClick={() => void handleSaveAttempt()}>
                  {saving ? "Saving…" : "Save Score & Update Mastery"}
                </Btn>
              ) : (
                nextDue && (
                  <Btn onClick={() => setPracticeWordId(nextDue.id)}>
                    Next Word: {nextDue.word} →
                  </Btn>
                )
              )}
              <Btn variant="soft" onClick={retryNow}>
                Retry Attempt
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Mastery & Spaced Repetition Tracker */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>Word Mastery & Spaced Repetition Progress</SectionLabel>
          <span className="text-[12px] font-semibold text-[var(--muted)]">
            {word.attempts.length} attempt{word.attempts.length === 1 ? "" : "s"} · Review interval: {word.intervalDays}d
          </span>
        </div>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-3 text-[12px]">
          <div className="rounded-lg bg-[var(--panel)] p-2.5">
            <span className="text-[var(--muted)]">Strong days (80+): </span>
            <strong className={strongDays >= 2 ? "text-[var(--good)]" : "text-[var(--ink)]"}>{strongDays} / 2</strong>
          </div>
          <div className="rounded-lg bg-[var(--panel)] p-2.5">
            <span className="text-[var(--muted)]">Natural-speed pass: </span>
            <strong className={hasNaturalSuccess ? "text-[var(--good)]" : "text-[var(--ink)]"}>
              {hasNaturalSuccess ? "✓ Verified" : "Pending"}
            </strong>
          </div>
          <div className="rounded-lg bg-[var(--panel)] p-2.5">
            <span className="text-[var(--muted)]">Consistent 3-take avg: </span>
            <strong className={word.masteryScore >= 82 && word.attempts.length >= 3 ? "text-[var(--good)]" : "text-[var(--ink)]"}>
              {word.attempts.length >= 3 ? `${word.masteryScore}/100` : `${word.attempts.length}/3 takes`}
            </strong>
          </div>
        </div>
        {word.notes && (
          <p className="mt-2.5 text-[12px] text-[var(--muted)]">
            <strong>Your note:</strong> {word.notes}
          </p>
        )}
      </div>

      {/* Before vs After Comparison (Original vs Latest Attempt for THIS Word) */}
      {beforeAfter && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--good)_30%,var(--line))] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Before vs. After Progress — &ldquo;{word.word}&rdquo;</SectionLabel>
            <Chip tone={beforeAfter.delta > 0 ? "good" : beforeAfter.delta < 0 ? "warn" : "muted"}>
              {beforeAfter.delta > 0
                ? `+${beforeAfter.delta} pts improvement`
                : beforeAfter.delta < 0
                ? `${beforeAfter.delta} pts change`
                : "Steady score"}
            </Chip>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--panel2)] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Before · {beforeAfter.beforeLabel}</p>
              <p className="mt-1 font-display text-[22px] font-bold tabular-nums">{beforeAfter.beforeScore}/100</p>
              {beforeAfter.beforeTranscript && (
                <p className="mt-1 text-[12px] text-[var(--muted)]">Heard: &ldquo;{beforeAfter.beforeTranscript}&rdquo;</p>
              )}
              {beforeAfter.beforeRecordingId && (
                <SavedBlobPlayer recordingId={beforeAfter.beforeRecordingId} label="Before Audio" />
              )}
            </div>
            <div className="rounded-xl bg-[var(--panel2)] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--good)]">After · {beforeAfter.afterLabel}</p>
              <p className="mt-1 font-display text-[22px] font-bold tabular-nums text-[var(--good)]">
                {beforeAfter.afterScore}/100
              </p>
              {beforeAfter.afterTranscript && (
                <p className="mt-1 text-[12px] text-[var(--muted)]">Heard: &ldquo;{beforeAfter.afterTranscript}&rdquo;</p>
              )}
              {beforeAfter.afterRecordingId && (
                <SavedBlobPlayer recordingId={beforeAfter.afterRecordingId} label="After Audio" />
              )}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[12px]">
            <div>
              <p className="font-semibold text-[var(--good)]">What improved</p>
              <ul className="mt-1 grid gap-1 text-[var(--ink)]">
                {beforeAfter.improvements.map((x, i) => (
                  <li key={i}>✓ {x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[var(--accent)]">Remaining focus</p>
              <ul className="mt-1 grid gap-1 text-[var(--muted)]">
                {beforeAfter.remainingFocus.map((x, i) => (
                  <li key={i}>→ {x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t border-[var(--line)] pt-3">
        <Btn variant="ghost" onClick={onClose}>
          Close Studio
        </Btn>
      </div>
    </div>
  );
}

export default function WordPracticeModal() {
  const { words, practiceWordId, setPracticeWordId } = useStore();
  const activeWord = useMemo(
    () => words.find((w) => w.id === practiceWordId) ?? null,
    [words, practiceWordId]
  );

  return (
    <Modal
      open={Boolean(activeWord)}
      onClose={() => {
        stopSpeaking();
        setPracticeWordId(null);
      }}
      title={activeWord ? `Pronunciation Coach — "${activeWord.word}"` : "Pronunciation Coach"}
      wide
    >
      {activeWord && (
        <WordPracticeWorkspace
          key={activeWord.id}
          word={activeWord}
          onClose={() => {
            stopSpeaking();
            setPracticeWordId(null);
          }}
        />
      )}
    </Modal>
  );
}
