"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  PRACTICE_LANGUAGE_META,
  dateKey,
  fmtDur,
  uid,
  type PracticeLanguage,
  type ShadowAttempt,
  type ShadowItem,
  type SpeakerAcousticProfile,
} from "@/lib/types";
import { compareShadowTake, extractAudioProfileFromBlob } from "@/lib/shadowing";
import { Btn, Card, Chip, MicHelperBanner, SectionLabel, VoiceWaveBars } from "./ui";

function toneForScore(s: number): "good" | "warn" | "bad" {
  if (s >= 78) return "good";
  if (s >= 60) return "warn";
  return "bad";
}

function PitchOverlayGraph({
  refProfile,
  attProfile,
}: {
  refProfile: SpeakerAcousticProfile;
  attProfile: SpeakerAcousticProfile;
}) {
  const W = 560;
  const H = 132;
  const padX = 12;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const toPath = (arr: (number | null)[]) => {
    let d = "";
    let penDown = false;
    arr.forEach((st, i) => {
      if (st === null) {
        penDown = false;
        return;
      }
      const x = padX + (i / Math.max(1, arr.length - 1)) * innerW;
      const clamped = Math.max(-9, Math.min(9, st));
      const y = padY + ((9 - clamped) / 18) * innerH;
      d += `${penDown ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
      penDown = true;
    });
    return d.trim();
  };

  const refPath = toPath(refProfile.pitchContourSt);
  const attPath = toPath(attProfile.pitchContourSt);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Pitch Melody Overlay (Speaker-Normalized Semitones)
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--brand)]">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--brand)]" />
            Reference ({refProfile.pitchRangeSt} st)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--good)]">
            <span className="inline-block h-0.5 w-4 rounded border-b-2 border-dashed border-[var(--good)]" />
            Your Take ({attProfile.pitchRangeSt} st)
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[132px] w-full">
        {/* Baseline 0 semitone (each speaker's natural median pitch) */}
        <line
          x1={padX}
          y1={H / 2}
          x2={W - padX}
          y2={H / 2}
          stroke="var(--line)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text x={padX + 2} y={padY + 9} fontSize="9" fill="var(--muted)">
          Higher pitch (+9 st)
        </text>
        <text x={padX + 2} y={H - 5} fontSize="9" fill="var(--muted)">
          Lower pitch (-9 st)
        </text>
        {refPath && (
          <path d={refPath} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {attPath && (
          <path
            d={attPath}
            fill="none"
            stroke="var(--good)"
            strokeWidth="2.2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function EnergyOverlayGraph({
  refProfile,
  attProfile,
}: {
  refProfile: SpeakerAcousticProfile;
  attProfile: SpeakerAcousticProfile;
}) {
  const W = 560;
  const H = 112;
  const padX = 12;
  const padY = 12;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const toLine = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = padX + (i / Math.max(1, arr.length - 1)) * innerW;
        const y = padY + (1 - Math.max(0, Math.min(1, v))) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const refLine = toLine(refProfile.energyContour);
  const refArea = `${refLine} L${(W - padX).toFixed(1)},${(H - padY).toFixed(1)} L${padX.toFixed(1)},${(H - padY).toFixed(1)} Z`;
  const attLine = toLine(attProfile.energyContour);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Emphasis & Pause Rhythm Overlay
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--brand)]">
            <span className="inline-block h-2 w-4 rounded-sm bg-[color-mix(in_srgb,var(--brand)_28%,transparent)] border border-[var(--brand)]" />
            Reference ({refProfile.pauseCount} pauses)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--good)]">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--good)]" />
            Your Take ({attProfile.pauseCount} pauses)
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[112px] w-full">
        <path d={refArea} fill="color-mix(in srgb, var(--brand) 16%, transparent)" />
        <path d={refLine} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
        <path d={attLine} fill="none" stroke="var(--good)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ShadowView() {
  const {
    practiceLanguage,
    settings,
    shadowItems,
    addShadowItem,
    deleteShadowItem,
    recordShadowAttempt,
    getBlob,
    openAddWord,
    toast,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [langFilter, setLangFilter] = useState<"all" | PracticeLanguage>("all");

  // Add-clip form state
  const [title, setTitle] = useState("");
  const [clipLang, setClipLang] = useState<PracticeLanguage>(practiceLanguage);
  const [script, setScript] = useState("");
  const [romanized, setRomanized] = useState("");
  const [speakerNotes, setSpeakerNotes] = useState("");
  const [refFile, setRefFile] = useState<Blob | null>(null);
  const [refFileName, setRefFileName] = useState("");
  const [refMime, setRefMime] = useState("audio/webm");
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const [analyzingRef, setAnalyzingRef] = useState(false);
  const [recordingRef, setRecordingRef] = useState(false);
  const [refRecSec, setRefRecSec] = useState(0);
  const refMrRef = useRef<MediaRecorder | null>(null);
  const refChunks = useRef<Blob[]>([]);
  const refRecTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active workspace playback & A-B loop state
  const [refAudioUrl, setRefAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [showRoman, setShowRoman] = useState(settings.showHindiRomanized ?? true);
  const refAudioEl = useRef<HTMLAudioElement | null>(null);

  // Shadowing recording state
  const [practiceMode, setPracticeMode] = useState<"echo" | "simultaneous">("echo");
  const [isRecording, setIsRecording] = useState(false);
  const [scoringAttempt, setScoringAttempt] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [attemptAudioUrl, setAttemptAudioUrl] = useState<string | null>(null);
  const attemptAudioEl = useRef<HTMLAudioElement | null>(null);

  const mrRef = useRef<MediaRecorder | null>(null);
  const srRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const elIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalsRef = useRef<string[]>([]);

  const visibleItems = useMemo(
    () =>
      langFilter === "all"
        ? shadowItems
        : shadowItems.filter((item) => item.language === langFilter),
    [shadowItems, langFilter]
  );

  const activeItem: ShadowItem | null = useMemo(() => {
    if (selectedId) {
      const found = shadowItems.find((s) => s.id === selectedId);
      if (found) return found;
    }
    return visibleItems[0] ?? shadowItems[0] ?? null;
  }, [selectedId, shadowItems, visibleItems]);

  const activeAttempt: ShadowAttempt | null = useMemo(() => {
    if (!activeItem || activeItem.attempts.length === 0) return null;
    if (activeAttemptId) {
      const match = activeItem.attempts.find((a) => a.id === activeAttemptId);
      if (match) return match;
    }
    return activeItem.attempts[activeItem.attempts.length - 1];
  }, [activeItem, activeAttemptId]);

  const selectItem = (id: string) => {
    setSelectedId(id);
    setLoopA(null);
    setLoopB(null);
    setLoopEnabled(false);
    setActiveAttemptId(null);
    setMicError(null);
  };

  // Load reference audio blob URL whenever activeItem changes
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const key = activeItem?.audioBlobKey ?? null;
    (async () => {
      if (!key) {
        if (!cancelled) setRefAudioUrl(null);
        return;
      }
      const blob = await getBlob(key);
      if (cancelled) return;
      if (blob) {
        url = URL.createObjectURL(blob);
        setRefAudioUrl(url);
      } else {
        setRefAudioUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeItem?.audioBlobKey, getBlob]);

  // Load attempt audio blob URL whenever activeAttempt changes
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const key = activeAttempt?.audioBlobKey ?? null;
    (async () => {
      if (!key) {
        if (!cancelled) setAttemptAudioUrl(null);
        return;
      }
      const blob = await getBlob(key);
      if (cancelled) return;
      if (blob) {
        url = URL.createObjectURL(blob);
        setAttemptAudioUrl(url);
      } else {
        setAttemptAudioUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeAttempt?.audioBlobKey, getBlob]);

  // Sync playbackRate onto reference audio element
  useEffect(() => {
    if (refAudioEl.current) refAudioEl.current.playbackRate = playbackRate;
  }, [playbackRate, refAudioUrl]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
    };
  }, [refPreviewUrl]);

  const refFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleRefFileUpload = (file: File | null) => {
    if (!file) return;
    if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
    setRefFile(file);
    setRefFileName(file.name);
    setRefMime(file.type || "audio/mpeg");
    setRefPreviewUrl(URL.createObjectURL(file));
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
  };

  const handleOpenFilePicker = () => {
    if (refFileInputRef.current) {
      refFileInputRef.current.value = "";
      refFileInputRef.current.click();
    }
  };

  const handleRemoveRefAudio = () => {
    if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
    if (refFileInputRef.current) refFileInputRef.current.value = "";
    setRefFile(null);
    setRefFileName("");
    setRefPreviewUrl(null);
  };

  const toggleRecordReference = async () => {
    if (recordingRef) {
      if (refRecTimer.current) clearInterval(refRecTimer.current);
      try {
        refMrRef.current?.stop();
      } catch {
        /* noop */
      }
      setRecordingRef(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast("Microphone unavailable in this view — upload an MP3/WAV/M4A file instead.", "err");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      refMrRef.current = mr;
      refChunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) refChunks.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(refChunks.current, { type: mr.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
        setRefFile(blob);
        setRefFileName(`reference-${dateKey()}.webm`);
        setRefMime(blob.type || "audio/webm");
        setRefPreviewUrl(URL.createObjectURL(blob));
      };
      mr.start(250);
      setRecordingRef(true);
      setRefRecSec(0);
      refRecTimer.current = setInterval(() => setRefRecSec((s) => s + 1), 1000);
    } catch {
      toast("Microphone blocked here — upload an audio file (.mp3, .wav, .m4a) instead.", "err");
    }
  };

  const saveReferenceClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refFile) {
      toast("Please upload or record the speaker's reference audio first.", "err");
      return;
    }
    if (!title.trim()) {
      toast("Add a short title for this speaker clip.", "err");
      return;
    }
    setAnalyzingRef(true);
    try {
      const profile = await extractAudioProfileFromBlob(refFile, script);
      const id = `shadow-${uid()}`;
      const blobKey = `shadow-ref-${id}`;
      const item: ShadowItem = {
        id,
        title: title.trim(),
        language: clipLang,
        script: script.trim(),
        romanizedText: romanized.trim() || undefined,
        speakerNotes: speakerNotes.trim() || undefined,
        audioBlobKey: blobKey,
        mimeType: refMime || "audio/webm",
        fileName: refFileName || "reference-audio",
        profile,
        attempts: [],
        bestScore: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await addShadowItem(item, refFile);
      setSelectedId(item.id);
      setShowAddForm(false);
      // Reset form
      setTitle("");
      setScript("");
      setRomanized("");
      setSpeakerNotes("");
      setRefFile(null);
      setRefFileName("");
      if (refPreviewUrl) URL.revokeObjectURL(refPreviewUrl);
      setRefPreviewUrl(null);
    } catch (err) {
      console.error(err);
      toast(
        `Could not decode audio file (${err instanceof Error ? err.message : "unsupported codec"}). Try MP3, WAV, M4A, or WebM.`,
        "err"
      );
    } finally {
      setAnalyzingRef(false);
    }
  };

  const handleRefTimeUpdate = () => {
    const el = refAudioEl.current;
    if (!el || !loopEnabled || loopA === null || loopB === null || loopB <= loopA + 0.2) return;
    if (el.currentTime >= loopB || el.currentTime < loopA - 0.15) {
      el.currentTime = loopA;
    }
  };

  const playReferenceClean = () => {
    if (attemptAudioEl.current) attemptAudioEl.current.pause();
    const el = refAudioEl.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    if (loopEnabled && loopA !== null) el.currentTime = loopA;
    else el.currentTime = 0;
    void el.play();
  };

  const playMyTakeClean = () => {
    if (refAudioEl.current) refAudioEl.current.pause();
    const el = attemptAudioEl.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
  };

  const stopRecording = () => {
    if (volIv.current) clearInterval(volIv.current);
    if (elIv.current) clearInterval(elIv.current);
    try {
      srRef.current?.stop();
    } catch {
      /* noop */
    }
    try {
      mrRef.current?.stop();
    } catch {
      /* noop */
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* noop */
    }
    if (practiceMode === "simultaneous" && refAudioEl.current) {
      refAudioEl.current.pause();
    }
    setIsRecording(false);
    setRmsLevel(0);
  };

  const startShadowRecording = async () => {
    if (!activeItem) return;
    setMicError(null);
    setLiveTranscript("");
    finalsRef.current = [];
    chunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError("Live microphone access is not available in this browser view.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mrRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const transcript = finalsRef.current.join(" ").trim();
        setScoringAttempt(true);
        try {
          const attProfile = await extractAudioProfileFromBlob(blob, activeItem.script);
          const comparison = compareShadowTake({
            reference: activeItem.profile,
            attempt: attProfile,
            scriptText: activeItem.script,
            attemptTranscript: transcript,
          });
          const attId = `shatt-${uid()}`;
          const attempt: ShadowAttempt = {
            id: attId,
            ts: Date.now(),
            date: dateKey(),
            playbackRateUsed: playbackRate,
            mode: practiceMode,
            transcript,
            audioBlobKey: `shadow-att-${attId}`,
            mimeType: blob.type || "audio/webm",
            profile: attProfile,
            comparison,
          };
          await recordShadowAttempt(activeItem.id, attempt, blob);
          setActiveAttemptId(attId);
        } catch (err) {
          console.error(err);
          toast("Could not analyze your recording — try speaking for at least 1–2 seconds.", "err");
        } finally {
          setScoringAttempt(false);
        }
      };

      mr.start(250);

      // Live RMS meter
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
          setRmsLevel(Math.sqrt(sum / buf.length));
        }, 90);
      } catch {
        /* meter optional */
      }

      // Live Speech Recognition in clip's language (en-US or hi-IN)
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        try {
          const r = new SR();
          srRef.current = r;
          r.continuous = true;
          r.interimResults = true;
          r.lang = PRACTICE_LANGUAGE_META[activeItem.language].bcp47;
          r.onresult = (ev: any) => {
            let interim = "";
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              const res = ev.results[i];
              if (res.isFinal) finalsRef.current.push(res[0].transcript);
              else interim += res[0].transcript;
            }
            setLiveTranscript([...finalsRef.current, interim].join(" ").trim());
          };
          r.start();
        } catch {
          /* STT optional — acoustic matching always runs on real PCM audio */
        }
      }

      // If Simultaneous Shadow mode, start playing the reference clip immediately!
      if (practiceMode === "simultaneous" && refAudioEl.current) {
        refAudioEl.current.playbackRate = playbackRate;
        refAudioEl.current.currentTime = loopEnabled && loopA !== null ? loopA : 0;
        void refAudioEl.current.play();
      } else if (refAudioEl.current) {
        refAudioEl.current.pause();
      }

      setElapsed(0);
      setIsRecording(true);
      elIv.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setMicError("Microphone access was blocked or unavailable.");
    }
  };

  return (
    <div className="grid gap-5">
      {/* Hero Banner */}
      <div className="hero-banner p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">Speaker Shadowing Studio</Chip>
              <Chip tone="muted">English & Hindi · Real Web Audio Analysis</Chip>
            </div>
            <h1 className="mt-2.5 font-display text-[24px] font-bold tracking-tight">
              Upload any script + speaker audio & match their delivery
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted)]">
              Add any reference audio clip (YouTube speaker, mentor, narrator, or your own slow take) alongside its script.
              SpeechCoach extracts their <strong>pace, pauses, emphasis peaks, and pitch melody</strong> locally — normalized to
              each speaker&apos;s own voice pitch so comparisons stay fair and honest.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              onClick={() => {
                setClipLang(practiceLanguage);
                setShowAddForm((v) => !v);
              }}
            >
              {showAddForm ? "Close Form" : "+ Add Speaker Clip"}
            </Btn>
          </div>
        </div>
      </div>

      {/* Add Speaker Reference Clip Form */}
      {showAddForm && (
        <Card
          title="Add Speaker Reference Clip"
          sub="Upload an MP3, WAV, M4A, OGG, or WebM recording (or record one directly) and paste its script."
        >
          <form onSubmit={saveReferenceClip} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <SectionLabel>Clip Title</SectionLabel>
                <input
                  className="input mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Calm Hindi YouTube Intro — Speaker Reference"
                  required
                />
              </div>
              <div>
                <SectionLabel>Clip Language</SectionLabel>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {(["en", "hi"] as PracticeLanguage[]).map((lg) => (
                    <button
                      key={lg}
                      type="button"
                      onClick={() => setClipLang(lg)}
                      className={`rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition ${
                        clipLang === lg
                          ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_12%,var(--panel))] text-[var(--brand)]"
                          : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)]"
                      }`}
                    >
                      {lg === "en" ? "English" : "Hindi · हिन्दी"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Upload Button OR Live Reference Record */}
            <div className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--panel2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionLabel>Reference Speaker Audio (Required)</SectionLabel>
                <span className="text-[11px] font-medium text-[var(--muted)]">
                  MP3 · WAV · M4A · OGG · WebM
                </span>
              </div>

              {/* Hidden native file input triggered by styled button */}
              <input
                ref={refFileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
                className="sr-only"
                aria-label="Upload Audio File"
                onChange={(e) => handleRefFileUpload(e.target.files?.[0] ?? null)}
              />

              {!refFile ? (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <Btn type="button" variant="primary" onClick={handleOpenFilePicker}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M8 10.5V2.5M4.5 6L8 2.5 11.5 6" />
                      <path d="M2.5 11v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
                    </svg>
                    Upload Audio File
                  </Btn>
                  <span className="text-[12px] text-[var(--muted)]">or</span>
                  <Btn
                    type="button"
                    variant={recordingRef ? "danger" : "soft"}
                    onClick={() => void toggleRecordReference()}
                  >
                    {recordingRef ? `Stop Reference (${fmtDur(refRecSec)})` : "Record Reference Clip"}
                  </Btn>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-[var(--brand)]">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2z" />
                          <path d="M9 2v4h4" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
                          {refFileName || "Selected audio clip"}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {refFile.size >= 1024 * 1024
                            ? `${(refFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : `${Math.max(1, Math.round(refFile.size / 1024))} KB`}{" "}
                          · Ready for delivery analysis
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Btn type="button" variant="soft" onClick={handleOpenFilePicker}>
                        Replace
                      </Btn>
                      <Btn type="button" variant="ghost" onClick={handleRemoveRefAudio}>
                        Remove
                      </Btn>
                    </div>
                  </div>
                  {refPreviewUrl && (
                    <audio controls src={refPreviewUrl} className="mt-2.5 h-9 w-full" />
                  )}
                </div>
              )}

              <p className="mt-2.5 text-[11.5px] text-[var(--muted)]">
                Best with 5–60 second clean speaker clips (1–5 sentences). Stored 100% locally in your browser.
              </p>
            </div>

            <div>
              <SectionLabel>
                Script Text {clipLang === "hi" ? "(Devanagari or Hinglish)" : "(English)"}
              </SectionLabel>
              <textarea
                className="textarea mt-1"
                rows={3}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder={
                  clipLang === "hi"
                    ? "Paste the Hindi script here (Devanagari or Hinglish) so you can read along while matching the speaker…"
                    : "Paste the speaker's script here so you can follow along and check word accuracy…"
                }
              />
            </div>

            {clipLang === "hi" && (
              <div>
                <SectionLabel>Optional Romanized Hinglish Helper (for easy fast reading)</SectionLabel>
                <textarea
                  className="textarea mt-1"
                  rows={2}
                  value={romanized}
                  onChange={(e) => setRomanized(e.target.value)}
                  placeholder="Optional: e.g. Namaste dosto, aaj ke is video mein hum baat karenge…"
                />
              </div>
            )}

            <div>
              <SectionLabel>Delivery Notes (Optional)</SectionLabel>
              <input
                className="input mt-1"
                value={speakerNotes}
                onChange={(e) => setSpeakerNotes(e.target.value)}
                placeholder="e.g. Notice the 1-second pause after the hook question and soft smile tone"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Btn type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Btn>
              <Btn type="submit" disabled={analyzingRef || !refFile}>
                {analyzingRef ? "Extracting speaker melody & pauses…" : "Analyze & Save Reference Clip"}
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Main Split Workspace */}
      {shadowItems.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <h3 className="font-display text-[17px] font-bold text-[var(--ink)]">No speaker reference clips yet</h3>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
              Upload any short speaker audio clip (.mp3, .wav, .m4a, .webm) or record a live reference with its script in English or Hindi. SpeechCoach maps their pace, pauses, pitch melody, and emphasis so you can shadow and match their delivery take by take.
            </p>
            <div className="mt-5">
              <Btn
                onClick={() => {
                  setClipLang(practiceLanguage);
                  setShowAddForm(true);
                }}
              >
                + Add Your First Speaker Clip
              </Btn>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[310px_1fr]">
          {/* Clip Library Sidebar */}
          <Card
            title="Saved Speaker Clips"
            sub={`${shadowItems.length} clip${shadowItems.length === 1 ? "" : "s"} stored locally`}
          >
            <div className="mb-3 flex gap-1.5">
              {(["all", "en", "hi"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLangFilter(f)}
                  className={`flex-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition ${
                    langFilter === f
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {f === "all" ? "All" : f === "en" ? "English" : "Hindi"}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {visibleItems.map((item) => {
                const isSelected = activeItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,var(--panel))]"
                        : "border-[var(--line)] bg-[var(--panel2)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold leading-snug">{item.title}</span>
                      <Chip tone={item.language === "hi" ? "brand" : "muted"}>
                        {item.language === "hi" ? "HI" : "EN"}
                      </Chip>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                      <span>{item.profile.activeDurationSec.toFixed(1)}s</span>
                      {item.profile.estimatedWpm && <span>· ~{item.profile.estimatedWpm} WPM</span>}
                      <span>· {item.attempts.length} take{item.attempts.length === 1 ? "" : "s"}</span>
                      {item.bestScore != null && (
                        <span className="font-semibold text-[var(--good)]">· Best {item.bestScore}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Active Clip Shadowing Studio */}
          {activeItem && (
            <div className="grid content-start gap-5">
              {/* 1. Reference Speaker Card */}
              <Card
                title={activeItem.title}
                sub={`${activeItem.language === "hi" ? "Hindi (हिन्दी)" : "English"} · ${activeItem.fileName}`}
                right={
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn variant="soft" onClick={() => openAddWord("", "exercise")}>
                      + Add My Word
                    </Btn>
                    <Btn
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Delete speaker clip "${activeItem.title}" and its shadow takes?`)) {
                          void deleteShadowItem(activeItem.id);
                        }
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                }
              >
                {/* Extracted Speaker Acoustic Profile */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Active Speech</p>
                    <p className="mt-0.5 font-display text-[17px] font-bold">
                      {activeItem.profile.activeDurationSec.toFixed(1)}s
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Speaker Pace</p>
                    <p className="mt-0.5 font-display text-[17px] font-bold">
                      {activeItem.profile.estimatedWpm ? `${activeItem.profile.estimatedWpm} WPM` : "Audio only"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Pitch Span</p>
                    <p className="mt-0.5 font-display text-[17px] font-bold">
                      {activeItem.profile.pitchRangeSt} st
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--panel2)] p-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Pauses / Peaks</p>
                    <p className="mt-0.5 font-display text-[17px] font-bold">
                      {activeItem.profile.pauseCount} / {activeItem.profile.emphasisPeaks.length}
                    </p>
                  </div>
                </div>

                {/* Reference Audio Player + Speed + A-B Loop */}
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <SectionLabel>1. Study the Speaker&apos;s Delivery</SectionLabel>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[11px] text-[var(--muted)]">Speed:</span>
                      {[0.75, 0.85, 1.0, 1.15].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setPlaybackRate(r)}
                          className={`rounded-lg px-2 py-1 text-[11.5px] font-semibold transition ${
                            playbackRate === r
                              ? "bg-[var(--brand)] text-white"
                              : "bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {r}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {refAudioUrl ? (
                    <audio
                      ref={refAudioEl}
                      controls
                      src={refAudioUrl}
                      onTimeUpdate={handleRefTimeUpdate}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-[12.5px] text-[var(--muted)]">Reference audio blob not found in local storage.</p>
                  )}

                  {/* A-B Segment Loop Controls */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                    <Btn
                      variant="soft"
                      onClick={() => {
                        const t = refAudioEl.current?.currentTime ?? 0;
                        setLoopA(Number(t.toFixed(1)));
                      }}
                    >
                      Set Loop Start (A{loopA != null ? `: ${loopA}s` : ""})
                    </Btn>
                    <Btn
                      variant="soft"
                      onClick={() => {
                        const t = refAudioEl.current?.currentTime ?? activeItem.profile.totalDurationSec;
                        setLoopB(Number(t.toFixed(1)));
                        if (loopA === null) setLoopA(0);
                        setLoopEnabled(true);
                      }}
                    >
                      Set Loop End (B{loopB != null ? `: ${loopB}s` : ""})
                    </Btn>
                    {loopA != null && loopB != null && (
                      <>
                        <Btn
                          variant={loopEnabled ? "primary" : "ghost"}
                          onClick={() => setLoopEnabled((v) => !v)}
                        >
                          {loopEnabled ? `Looping ${loopA}s–${loopB}s ✓` : "Loop Paused"}
                        </Btn>
                        <Btn
                          variant="ghost"
                          onClick={() => {
                            setLoopA(null);
                            setLoopB(null);
                            setLoopEnabled(false);
                          }}
                        >
                          Clear Loop
                        </Btn>
                      </>
                    )}
                  </div>
                </div>

                {/* Script Card */}
                {activeItem.script && (
                  <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <SectionLabel>Script to Shadow</SectionLabel>
                      {activeItem.romanizedText && (
                        <button
                          type="button"
                          onClick={() => setShowRoman((v) => !v)}
                          className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                        >
                          {showRoman ? "Hide Romanized Guide" : "Show Romanized Guide"}
                        </button>
                      )}
                    </div>
                    <p className="text-[16px] leading-relaxed font-medium text-[var(--ink)]">{activeItem.script}</p>
                    {activeItem.romanizedText && showRoman && (
                      <p className="mt-2.5 rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed text-[var(--muted)]">
                        <strong className="text-[var(--ink)]">Reading guide:</strong> {activeItem.romanizedText}
                      </p>
                    )}
                    {activeItem.speakerNotes && (
                      <p className="mt-2.5 text-[12px] text-[var(--muted)]">
                        <strong>Notes:</strong> {activeItem.speakerNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Record Your Shadow Take */}
                <div className="mt-4 rounded-xl border border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_5%,var(--panel))] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <SectionLabel>2. Match the Speaker&apos;s Delivery</SectionLabel>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">
                        {practiceMode === "echo"
                          ? "Echo mode: listen first, then record your clean take at your best match."
                          : "Simultaneous shadow (use headphones!): reference audio plays at your selected speed while you speak right alongside them."}
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-1">
                      <button
                        type="button"
                        onClick={() => setPracticeMode("echo")}
                        disabled={isRecording}
                        className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                          practiceMode === "echo" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                        }`}
                      >
                        Listen & Echo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPracticeMode("simultaneous")}
                        disabled={isRecording}
                        className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                          practiceMode === "simultaneous" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                        }`}
                      >
                        Shadow Along
                      </button>
                    </div>
                  </div>

                  {micError && (
                    <div className="mt-3">
                      <MicHelperBanner error={micError} />
                    </div>
                  )}

                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <Btn onClick={() => void startShadowRecording()} disabled={scoringAttempt}>
                        {scoringAttempt ? "Comparing your delivery…" : "Record My Shadow Take"}
                      </Btn>
                    ) : (
                      <>
                        <Btn variant="danger" onClick={stopRecording}>
                          Stop & Compare Delivery ({fmtDur(elapsed)})
                        </Btn>
                        <VoiceWaveBars level={rmsLevel} />
                      </>
                    )}
                    {!isRecording && refAudioUrl && (
                      <Btn variant="soft" onClick={playReferenceClean}>
                        ▶ Hear Speaker ({playbackRate}×)
                      </Btn>
                    )}
                  </div>

                  {isRecording && liveTranscript && (
                    <p className="mt-3 rounded-lg bg-[var(--panel2)] p-2.5 text-[12.5px] text-[var(--muted)]">
                      {liveTranscript}
                    </p>
                  )}
                </div>
              </Card>

              {/* 3. Delivery Match Results + A/B Audio + Visual Overlays */}
              {activeAttempt && (
                <Card
                  title={`Delivery Match Report — ${activeAttempt.comparison.overallMatch} / 100`}
                  sub={`${activeAttempt.mode === "simultaneous" ? "Shadow Along" : "Listen & Echo"} at ${activeAttempt.playbackRateUsed}× · ${new Date(activeAttempt.ts).toLocaleString()}`}
                  right={
                    <Chip tone={toneForScore(activeAttempt.comparison.overallMatch)}>
                      {activeAttempt.comparison.overallMatch >= 85
                        ? "Strong Match"
                        : activeAttempt.comparison.overallMatch >= 70
                        ? "Good Alignment"
                        : "Keep Dialing In"}
                    </Chip>
                  }
                >
                  {/* Instant A / B Comparison Audio */}
                  <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--brand)]">
                          A · Reference Speaker
                        </span>
                        <Btn variant="soft" onClick={playReferenceClean}>
                          ▶ Play A
                        </Btn>
                      </div>
                      <p className="text-[11.5px] text-[var(--muted)]">
                        {activeItem.profile.activeDurationSec.toFixed(1)}s · {activeItem.profile.pauseCount} pauses ·{" "}
                        {activeItem.profile.pitchRangeSt} st pitch range
                      </p>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--good)]">
                          B · Your Shadow Take
                        </span>
                        <Btn variant="soft" onClick={playMyTakeClean} disabled={!attemptAudioUrl}>
                          ▶ Play B
                        </Btn>
                      </div>
                      {attemptAudioUrl && <audio ref={attemptAudioEl} controls src={attemptAudioUrl} className="mt-1 h-8 w-full" />}
                    </div>
                  </div>

                  {/* 4 Honest Dimension Match Cards */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Pace & Timing", score: activeAttempt.comparison.paceScore, sub: `${activeAttempt.comparison.paceRatioPct}% of speaker speed` },
                      { label: "Pause & Rhythm", score: activeAttempt.comparison.rhythmScore, sub: `${activeAttempt.profile.pauseCount} vs ${activeItem.profile.pauseCount} pauses` },
                      { label: "Intonation Melody", score: activeAttempt.comparison.intonationScore, sub: "Pitch-normalized" },
                      { label: "Energy & Emphasis", score: activeAttempt.comparison.emphasisScore, sub: "Stressed words" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.label}</p>
                        <p className="mt-1 font-display text-[22px] font-bold tabular-nums">{m.score}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--panel2)]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${m.score}%`,
                              background:
                                m.score >= 78 ? "var(--good)" : m.score >= 60 ? "var(--warn)" : "var(--bad)",
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  {activeAttempt.comparison.wordMatchPct !== null && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--panel2)] px-3.5 py-2 text-[12.5px]">
                      <span>Script Word Accuracy (Speech-to-Text)</span>
                      <Chip tone={toneForScore(activeAttempt.comparison.wordMatchPct)}>
                        {activeAttempt.comparison.wordMatchPct}% matched
                      </Chip>
                    </div>
                  )}

                  {/* Real SVG Acoustic Overlay Graphs */}
                  <div className="mt-4 grid gap-3">
                    <PitchOverlayGraph refProfile={activeItem.profile} attProfile={activeAttempt.profile} />
                    <EnergyOverlayGraph refProfile={activeItem.profile} attProfile={activeAttempt.profile} />
                  </div>

                  {/* Actionable Coaching Summary */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[var(--panel2)] p-3.5">
                      <SectionLabel>What Matched Well</SectionLabel>
                      <ul className="mt-2 grid gap-1.5 text-[12.5px] text-[var(--ink)]">
                        {activeAttempt.comparison.strengths.map((s, i) => (
                          <li key={i} className="text-[var(--good)]">✓ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-[var(--panel2)] p-3.5">
                      <SectionLabel>Adjust on Next Take</SectionLabel>
                      <ul className="mt-2 grid gap-1.5 text-[12.5px] text-[var(--ink)]">
                        {activeAttempt.comparison.improvements.length > 0 ? (
                          activeAttempt.comparison.improvements.map((s, i) => (
                            <li key={i}>→ {s}</li>
                          ))
                        ) : (
                          <li className="text-[var(--good)]">✓ Ready to record at full natural speed!</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Attempt History Switcher */}
                  {activeItem.attempts.length > 1 && (
                    <div className="mt-4 border-t border-[var(--line)] pt-3.5">
                      <SectionLabel>Your Takes on This Clip ({activeItem.attempts.length})</SectionLabel>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeItem.attempts.map((a, idx) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setActiveAttemptId(a.id)}
                            className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition ${
                              activeAttempt.id === a.id
                                ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_12%,var(--panel))] text-[var(--brand)]"
                                : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)] hover:text-[var(--ink)]"
                            }`}
                          >
                            Take #{idx + 1} · {a.comparison.overallMatch}/100
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
