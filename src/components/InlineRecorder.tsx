"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { detectPitchHz } from "@/lib/pitch";
import { buildAnalysis, compareWords, computeDetailedAssessment } from "@/lib/analytics";
import { dayProgressLabel } from "@/lib/program";
import { useStore } from "@/lib/store";
import {
  EMPTY_SCORES,
  PRACTICE_LANGUAGE_META,
  fmtDur,
  uid,
  type DetailedAssessment,
  type PitchSample,
  type PracticeLanguage,
  type Recording,
  type SelfScores,
  type VolumeSample,
} from "@/lib/types";
import { Btn, Chip, DotRating, MicHelperBanner, PitchContour, SectionLabel, Textarea, VoiceWaveBars, VolumeTimeline } from "./ui";
import AssessmentReport from "./AssessmentReport";

type Phase = "idle" | "recording" | "review";

export default function InlineRecorder({
  title,
  mode,
  scriptText,
  exerciseId,
  language,
  targetWpm = 125,
  onSaved,
  saveLabel = "Save & continue",
  compact = false,
}: {
  title: string;
  mode: string;
  scriptText: string | null;
  exerciseId?: string;
  language?: PracticeLanguage;
  targetWpm?: number;
  onSaved?: (rec: Recording, assessment: DetailedAssessment) => void;
  saveLabel?: string;
  compact?: boolean;
}) {
  const { settings, practiceLanguage, saveRecording, addLog, toast } = useStore();
  const recLang: PracticeLanguage = language ?? practiceLanguage;

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState("");
  const [manual, setManual] = useState("");
  const [usingManual, setUsingManual] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [tl, setTl] = useState<VolumeSample[]>([]);
  const [pitches, setPitches] = useState<PitchSample[]>([]);
  const [rec, setRec] = useState<Recording | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [self, setSelf] = useState<SelfScores>(EMPTY_SCORES);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedDone, setSavedDone] = useState(false);

  const srRef = useRef<any>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTs = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const finals = useRef<string[]>([]);
  const recOn = useRef(false);
  const disposed = useRef(false);
  const tlRef = useRef<VolumeSample[]>([]);
  const pitchRef = useRef<PitchSample[]>([]);

  const srSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      recOn.current = false;
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
    const durationSec = Math.max(1, Math.round((Date.now() - startTs.current) / 1000));
    stopTracks();
    const transcript = finals.current.join(" ").replace(/\s+/g, " ").trim();
    const cmp = scriptText?.trim() ? compareWords(scriptText, transcript) : null;
    const samples = [...tlRef.current];
    const pSamples = [...pitchRef.current];
    setTl(samples);
    setPitches(pSamples);
    const analysis = buildAnalysis(transcript, durationSec, samples, cmp, pSamples, recLang);
    const assessment = computeDetailedAssessment({
      analysis,
      self: null,
      script: scriptText,
      transcript,
      comparison: cmp,
      durationSec,
      targetWpm,
    });
    const created: Recording = {
      id: uid(),
      createdAt: Date.now(),
      title,
      mode,
      language: recLang,
      scriptText: scriptText?.trim() || null,
      transcript,
      durationSec,
      analysis,
      self: null,
      assessment,
      exerciseId: exerciseId ?? null,
      targetWpm,
      hasAudio: !!audio && audio.size > 0,
      mimeType: audio?.type ?? "audio/webm",
      dayLabel: dayProgressLabel(settings.currentDay),
    };
    setRec(created);
    setBlob(audio);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    if (audio && audio.size > 0) setBlobUrl(URL.createObjectURL(audio));
    else setBlobUrl(null);
    if (!transcript) setUsingManual(true);
    setSavedDone(false);
    setPhase("review");
  };

  const startRecording = async () => {
    setMicError(null);
    finals.current = [];
    chunks.current = [];
    tlRef.current = [];
    pitchRef.current = [];
    setTl([]);
    setPitches([]);
    setLive("");
    setManual("");
    setElapsed(0);
    setSelf(EMPTY_SCORES);
    setSavedDone(false);
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

      // Volume + Real F0 Pitch sampler
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        if (ctx.state === "suspended") void ctx.resume();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        volIv.current = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          const tNow = Date.now() - startTs.current;
          tlRef.current.push({ t: tNow, r: rms });
          const f0 = detectPitchHz(buf, ctx.sampleRate);
          if (f0) pitchRef.current.push({ t: tNow, hz: f0.hz, clarity: f0.clarity });
          if (tlRef.current.length % 4 === 0) {
            setTl([...tlRef.current]);
            setPitches([...pitchRef.current]);
          }
        }, 100);
      } catch {
        /* volume/pitch sampling unavailable */
      }

      // Speech-to-text
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        setUsingManual(false);
        const r = new SR();
        srRef.current = r;
        r.continuous = true;
        r.interimResults = true;
        r.lang = PRACTICE_LANGUAGE_META[recLang].bcp47;
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
          /* keep recording */
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
        setMicError("Microphone permission was denied. Allow mic access in your browser address bar, or run SpeechCoach locally / on your deployed site.");
        toast("Microphone blocked in this frame — use Manual Check here, or run locally for live mic.", "err");
      } else if (name === "NotFoundError") {
        setMicError("No microphone was detected on this device. You can still type a transcript using Manual Practice Check below.");
        toast("No microphone detected — Manual Practice Check is available below.", "err");
      } else {
        setMicError("Live microphone recording isn't available in this browser context. Use Manual Practice Check below or run locally.");
        toast("Recording unavailable here — use Manual Practice Check below.", "err");
      }
    }
  };

  const stopRecording = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    else finishCapture(null);
  };

  const openManualFallback = () => {
    const durationSec = Math.max(20, Math.round(((scriptText?.split(/\s+/).length ?? 60) / Math.max(80, targetWpm)) * 60));
    const blank: Recording = {
      id: uid(),
      createdAt: Date.now(),
      title,
      mode,
      language: recLang,
      scriptText: scriptText?.trim() || null,
      transcript: "",
      durationSec,
      analysis: buildAnalysis("", durationSec, [], null, undefined, recLang),
      self: null,
      exerciseId: exerciseId ?? null,
      targetWpm,
      hasAudio: false,
      mimeType: "audio/webm",
      dayLabel: dayProgressLabel(settings.currentDay),
    };
    setRec(blank);
    setBlob(null);
    setBlobUrl(null);
    setManual(scriptText ?? "");
    setUsingManual(true);
    setPhase("review");
  };

  const effectiveTranscript = rec ? (usingManual ? manual.trim() : rec.transcript) : "";
  const liveCmp = useMemo(() => {
    if (!rec?.scriptText) return null;
    return compareWords(rec.scriptText, effectiveTranscript);
  }, [rec, effectiveTranscript]);

  const liveAnalysis = useMemo(() => {
    if (!rec) return null;
    return buildAnalysis(effectiveTranscript, rec.durationSec, tl, liveCmp, pitches, recLang);
  }, [rec, effectiveTranscript, tl, liveCmp, pitches, recLang]);

  const hasAnySelf = Object.values(self).some((v) => (v ?? 0) > 0);

  const liveAssessment = useMemo(() => {
    if (!rec || !liveAnalysis) return null;
    return computeDetailedAssessment({
      analysis: liveAnalysis,
      self: hasAnySelf ? self : null,
      script: rec.scriptText,
      transcript: effectiveTranscript,
      comparison: liveCmp,
      durationSec: rec.durationSec,
      targetWpm,
    });
  }, [rec, liveAnalysis, hasAnySelf, self, effectiveTranscript, liveCmp, targetWpm]);

  const retryTake = () => {
    if (liveAssessment) setPreviousScore(liveAssessment.overallScore);
    setPhase("idle");
    void startRecording();
  };

  const handleSave = async () => {
    if (!rec || !liveAnalysis || !liveAssessment) return;
    setSaving(true);
    try {
      const full: Recording = {
        ...rec,
        transcript: effectiveTranscript,
        analysis: liveAnalysis,
        self: hasAnySelf ? self : null,
        assessment: liveAssessment,
      };
      await saveRecording(full, blob);
      if (!savedDone) {
        addLog({
          language: recLang,
          seconds: full.durationSec,
          mode: full.mode,
          completed: 1,
          scores: full.self,
          overallScore: liveAssessment.overallScore,
          note: full.title,
        });
      }
      setSavedDone(true);
      toast(savedDone ? `Updated result — Overall score ${liveAssessment.overallScore}/100` : `Saved recording — Overall score ${liveAssessment.overallScore}/100`);
      onSaved?.(full, liveAssessment);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      {phase === "idle" && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={startRecording}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="4.5" r="3" />
                <path d="M2.5 10.2c1-1.7 6-1.7 7 0" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
              Record My Voice
            </Btn>
            <Btn variant="ghost" onClick={openManualFallback}>
              No mic right now? Manual transcript check
            </Btn>
            <span className="ml-auto text-[11.5px] text-[var(--muted)]">
              {srSupported ? "Live audio + pitch + speech-to-text ready" : "Audio + pitch capture ready (manual transcript supported)"}
            </span>
          </div>
          <MicHelperBanner error={micError} onManual={openManualFallback} />
        </div>
      )}

      {phase === "recording" && (
        <div className="animate-pop grid gap-3 rounded-xl border border-[var(--brand)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rec-dot" />
            <div>
              <p className="font-display text-[17px] font-semibold tabular-nums">{fmtDur(elapsed)}</p>
              <p className="text-[11.5px] text-[var(--muted)]">
                Measuring volume, pauses, vocal pitch (F0), and speech speed locally…
              </p>
            </div>
            <VoiceWaveBars level={tl[tl.length - 1]?.r ?? 0.03} />
            <Btn variant="danger" onClick={stopRecording} className="ml-auto">
              Stop & Analyze
            </Btn>
          </div>
          <VolumeTimeline tl={tl} height={56} />
          <div className="rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">
            {live ? (
              <span className="live-transcript">
                {live} <span className="caret">▍</span>
              </span>
            ) : (
              <span className="text-[var(--muted)]">Listening… speak clearly at a calm pace.</span>
            )}
          </div>
        </div>
      )}

      {phase === "review" && rec && liveAnalysis && liveAssessment && (
        <div className="grid gap-4">
          {/* Audio playback + acoustic waveforms */}
          <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>Your Recording Playback & Transcript</SectionLabel>
              <div className="flex items-center gap-2">
                {savedDone && <Chip tone="good">Saved</Chip>}
                <button
                  type="button"
                  className="chip chip-muted cursor-pointer"
                  onClick={() => {
                    if (!usingManual) setManual(rec.transcript);
                    setUsingManual((v) => !v);
                  }}
                >
                  {usingManual ? "Use auto transcript" : "Edit transcript"}
                </button>
              </div>
            </div>

            {blobUrl && <audio controls src={blobUrl} className="w-full" />}

            {usingManual ? (
              <Textarea
                rows={3}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Type or correct what you spoke so WPM, fillers, and script comparison update accurately…"
              />
            ) : (
              <div className="rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">
                {rec.transcript || "No speech-to-text transcript captured — click Edit transcript above if you want word-level stats."}
              </div>
            )}

            {tl.length >= 10 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">Volume envelope</p>
                  <VolumeTimeline tl={tl} height={54} />
                </div>
                <div>
                  <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">Measured vocal pitch (F0)</p>
                  <PitchContour samples={pitches} height={54} />
                </div>
              </div>
            )}
          </div>

          {/* Listening self-check (honestly feeds Pronunciation + refines Clarity/Expression) */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <SectionLabel>Quick Listening Self-Check (Completes Pronunciation Score)</SectionLabel>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Replay your audio and rate honestly 1–5. Speech-to-text cannot judge tongue/lip pronunciation accuracy on its own.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DotRating label="Pronunciation" value={self.pronunciation} onChange={(v) => setSelf((s) => ({ ...s, pronunciation: v }))} />
              <DotRating label="Clarity" value={self.clarity} onChange={(v) => setSelf((s) => ({ ...s, clarity: v }))} />
              <DotRating label="Fluency" value={self.fluency} onChange={(v) => setSelf((s) => ({ ...s, fluency: v }))} />
              <DotRating label="Expression" value={self.expression ?? 0} onChange={(v) => setSelf((s) => ({ ...s, expression: v, vocalControl: v }))} />
            </div>
          </div>

          <AssessmentReport
            assessment={liveAssessment}
            analysis={liveAnalysis}
            previousScore={previousScore}
            onRetryExercise={retryTake}
            compact={compact}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : savedDone ? "Update Saved Result" : saveLabel}
            </Btn>
            <Btn variant="soft" onClick={retryTake}>
              Record another attempt
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
