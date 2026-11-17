"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRACTICE_LANGUAGE_META, type PracticeLanguage } from "./types";
import { stopSpeaking } from "./tts";

interface SpeechRecEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  lang: string;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecCtor = new () => SpeechRecLike;

function getSpeechRecCtor(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickSupportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export interface SingleWordCapture {
  blob: Blob;
  audioUrl: string;
  mimeType: string;
  transcript: string;
  durationSec: number;
  sttAvailable: boolean;
}

export function useSingleWordRecorder(
  language: PracticeLanguage,
  onFinished?: (capture: SingleWordCapture) => void
) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [capture, setCapture] = useState<SingleWordCapture | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const srRef = useRef<SpeechRecLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  const startedAtRef = useRef(0);
  const sttAvailRef = useRef(false);
  const activeUrlRef = useRef<string | null>(null);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const cleanupActive = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      srRef.current?.stop();
    } catch {
      /* ignore */
    }
    srRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const resetCapture = useCallback(() => {
    cleanupActive();
    if (mrRef.current && mrRef.current.state !== "inactive") {
      mrRef.current.onstop = null;
      try {
        mrRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mrRef.current = null;
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setRecording(false);
    setLiveTranscript("");
    setCapture(null);
    setError(null);
  }, [cleanupActive]);

  useEffect(() => {
    return () => {
      cleanupActive();
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, [cleanupActive]);

  const stop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      srRef.current?.stop();
    } catch {
      /* ignore */
    }
    // Brief grace window so SpeechRecognition delivers final token before MediaRecorder closes
    setTimeout(() => {
      if (mrRef.current && mrRef.current.state !== "inactive") {
        try {
          mrRef.current.stop();
        } catch {
          cleanupActive();
          setRecording(false);
        }
      } else {
        cleanupActive();
        setRecording(false);
      }
    }, 180);
  }, [cleanupActive]);

  const start = useCallback(async () => {
    stopSpeaking();
    setError(null);
    setLiveTranscript("");
    finalTextRef.current = "";
    interimTextRef.current = "";
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Live meter
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 5));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      // SpeechRecognition for pronunciation transcript check
      const SR = getSpeechRecCtor();
      sttAvailRef.current = Boolean(SR);
      if (SR) {
        try {
          const sr = new SR();
          sr.continuous = true;
          sr.interimResults = true;
          sr.lang = PRACTICE_LANGUAGE_META[language]?.bcp47 ?? "en-US";
          sr.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const r = e.results[i];
              if (r.isFinal) {
                finalTextRef.current += `${r[0].transcript} `;
              } else {
                interim += r[0].transcript;
              }
            }
            interimTextRef.current = interim;
            setLiveTranscript(`${finalTextRef.current} ${interim}`.replace(/\s+/g, " ").trim());
          };
          sr.onerror = () => {
            /* handled cleanly on finalize */
          };
          sr.onend = () => {
            /* single word utterance finished */
          };
          sr.start();
          srRef.current = sr;
        } catch {
          sttAvailRef.current = false;
        }
      }

      const mime = pickSupportedMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mrRef.current = mr;
      startedAtRef.current = Date.now();

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const finalMime = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const dur = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const transcript = `${finalTextRef.current} ${interimTextRef.current}`
          .replace(/\s+/g, " ")
          .trim();

        cleanupActive();
        setRecording(false);

        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current);
        }
        const audioUrl = URL.createObjectURL(blob);
        activeUrlRef.current = audioUrl;

        const result: SingleWordCapture = {
          blob,
          audioUrl,
          mimeType: finalMime,
          transcript,
          durationSec: dur,
          sttAvailable: sttAvailRef.current,
        };
        setCapture(result);
        onFinishedRef.current?.(result);
      };

      mr.start(200);
      setRecording(true);

      // Safety cap for single-word recording (10s)
      autoStopRef.current = setTimeout(() => {
        stop();
      }, 10000);
    } catch (e) {
      cleanupActive();
      setRecording(false);
      setError(
        `Microphone access unavailable (${e instanceof Error ? e.message : "permission denied"}). Check browser mic permission.`
      );
    }
  }, [cleanupActive, language, stop]);

  return {
    recording,
    level,
    liveTranscript,
    capture,
    error,
    start,
    stop,
    resetCapture,
    sttSupported: typeof window !== "undefined" && Boolean(getSpeechRecCtor()),
  };
}
