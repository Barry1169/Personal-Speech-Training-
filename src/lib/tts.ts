"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hasDevanagari, splitSentences } from "./analytics";
import type { PracticeLanguage } from "./types";

export interface VoiceOption {
  name: string;
  lang: string;
}

export interface ActiveSpeechSnapshot {
  text: string;
  rate: number;
}

// Lightweight observable for active single-word / snippet TTS so [0.7x] & [1.0x] buttons
// reflect live playback accurately and let users tap again to stop cleanly.
let activeSpeech: ActiveSpeechSnapshot | null = null;
const speechListeners = new Set<() => void>();
let pendingSpeakTimer: ReturnType<typeof setTimeout> | null = null;
let speakGeneration = 0;

function setActiveSpeech(next: ActiveSpeechSnapshot | null) {
  activeSpeech = next;
  speechListeners.forEach((fn) => fn());
}

function subscribeActiveSpeech(cb: () => void) {
  speechListeners.add(cb);
  return () => {
    speechListeners.delete(cb);
  };
}

function getActiveSpeechSnapshot(): ActiveSpeechSnapshot | null {
  return activeSpeech;
}

export function useActiveSpeech(): ActiveSpeechSnapshot | null {
  return useSyncExternalStore(subscribeActiveSpeech, getActiveSpeechSnapshot, () => null);
}

function resolveLang(text: string, language?: PracticeLanguage): PracticeLanguage {
  if (language) return language;
  return hasDevanagari(text) ? "hi" : "en";
}

function pickBestVoice(
  allVoices: SpeechSynthesisVoice[],
  lang: PracticeLanguage,
  preferredName?: string | null
): SpeechSynthesisVoice | undefined {
  if (preferredName) {
    const exact = allVoices.find((v) => v.name === preferredName);
    if (exact && exact.lang.toLowerCase().startsWith(lang)) return exact;
  }
  if (lang === "hi") {
    return (
      allVoices.find((v) => v.lang.toLowerCase() === "hi-in" && v.localService) ??
      allVoices.find((v) => v.lang.toLowerCase() === "hi-in") ??
      allVoices.find((v) => v.lang.toLowerCase().startsWith("hi"))
    );
  }
  // Prefer clear US/GB voices; local voices obey Web Speech rate (e.g. 0.7x vs 1.0x) most reliably
  return (
    allVoices.find((v) => (v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) && v.localService) ??
    allVoices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) ??
    allVoices.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

/** Clamp rate into a clear, natural-sounding range where 0.7x is distinctly slower than 1.0x. */
export function clampSpeechRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1.0;
  return Math.min(1.5, Math.max(0.55, Math.round(rate * 100) / 100));
}

export function speakSingle(
  text: string,
  rate = 1.0,
  voiceName?: string | null,
  language?: PracticeLanguage
) {
  const cleaned = text.trim();
  if (!cleaned || typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
    const clampedRate = clampSpeechRate(rate);

    if (pendingSpeakTimer) {
      clearTimeout(pendingSpeakTimer);
      pendingSpeakTimer = null;
    }

    // If clicking the exact same word + speed while playing, toggle stop cleanly
    if (
      activeSpeech &&
      activeSpeech.text === cleaned &&
      Math.abs(activeSpeech.rate - clampedRate) < 0.02 &&
      synth.speaking
    ) {
      speakGeneration += 1;
      synth.cancel();
      setActiveSpeech(null);
      return true;
    }

    const gen = ++speakGeneration;
    const wasBusy = synth.speaking || synth.pending;
    if (wasBusy) synth.cancel();
    if (synth.paused) synth.resume();

    const startUtterance = () => {
      if (gen !== speakGeneration) return;
      try {
        const lang = resolveLang(cleaned, language);
        const u = new SpeechSynthesisUtterance(cleaned);
        u.lang = lang === "hi" ? "hi-IN" : "en-US";
        u.rate = clampedRate;
        u.pitch = 1.0;
        u.volume = 1.0;
        const match = pickBestVoice(synth.getVoices(), lang, voiceName);
        if (match) u.voice = match;
        setActiveSpeech({ text: cleaned, rate: clampedRate });
        u.onend = () => {
          if (gen === speakGeneration) setActiveSpeech(null);
        };
        u.onerror = () => {
          if (gen === speakGeneration) setActiveSpeech(null);
        };
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch {
        if (gen === speakGeneration) setActiveSpeech(null);
      }
    };

    // In Chromium/Edge, queuing immediately after cancel() on the same tick can drop
    // the utterance or ignore the updated rate; a brief 30ms gap ensures clean slow/normal switching.
    if (wasBusy) {
      pendingSpeakTimer = setTimeout(() => {
        pendingSpeakTimer = null;
        startUtterance();
      }, 30);
    } else {
      startUtterance();
    }
    return true;
  } catch {
    setActiveSpeech(null);
    return false;
  }
}

export function listVoices(language: PracticeLanguage): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    const prefix = language === "hi" ? "hi" : "en";
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith(prefix));
  } catch {
    return [];
  }
}

export function hasNativeVoice(language: PracticeLanguage): boolean {
  return listVoices(language).length > 0;
}

export function stopSpeaking() {
  if (pendingSpeakTimer) {
    clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
  speakGeneration += 1;
  setActiveSpeech(null);
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

export function useModelAudio(preferredVoice?: string | null, language: PracticeLanguage = "en") {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeSentence, setActiveSentence] = useState<number>(-1);

  const cancelledRef = useRef(false);
  const voiceRef = useRef(preferredVoice);
  const langRef = useRef<PracticeLanguage>(language);

  useEffect(() => {
    voiceRef.current = preferredVoice;
  }, [preferredVoice]);

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const prefix = language === "hi" ? "hi" : "en";
      const list = synth
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith(prefix))
        .map((v) => ({ name: v.name, lang: v.lang }));
      setVoices(list);
    };
    load();
    synth.onvoiceschanged = load;
    return () => {
      cancelledRef.current = true;
      synth.onvoiceschanged = null;
      stopSpeaking();
    };
  }, [supported, language]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    stopSpeaking();
    setPlaying(false);
    setActiveSentence(-1);
  }, []);

  const playPassage = useCallback(
    (text: string, rate = 0.9, voiceOverride?: string | null, langOverride?: PracticeLanguage) => {
      if (!supported || !text.trim()) return;
      stopSpeaking();
      const synth = window.speechSynthesis;
      cancelledRef.current = false;

      const lang = resolveLang(text, langOverride ?? langRef.current);
      const sentences = splitSentences(text);
      const chunks = sentences.length > 0 ? sentences : [text.trim()];
      const targetVoiceName = voiceOverride ?? voiceRef.current;
      const chosenVoice = pickBestVoice(synth.getVoices(), lang, targetVoiceName);
      const clampedRate = clampSpeechRate(rate);

      setPlaying(true);

      const speakAt = (idx: number) => {
        if (cancelledRef.current || idx >= chunks.length) {
          setPlaying(false);
          setActiveSentence(-1);
          return;
        }
        setActiveSentence(idx);
        const u = new SpeechSynthesisUtterance(chunks[idx]);
        u.lang = lang === "hi" ? "hi-IN" : "en-US";
        u.rate = clampedRate;
        u.pitch = 1.0;
        u.volume = 1.0;
        if (chosenVoice) u.voice = chosenVoice;
        u.onend = () => {
          if (cancelledRef.current) return;
          setTimeout(() => {
            if (!cancelledRef.current) speakAt(idx + 1);
          }, 320);
        };
        u.onerror = () => {
          setPlaying(false);
          setActiveSentence(-1);
        };
        if (synth.paused) synth.resume();
        synth.speak(u);
      };

      speakAt(0);
    },
    [supported]
  );

  return {
    supported,
    voices,
    hasNativeVoice: voices.length > 0,
    playing,
    activeSentence,
    playPassage,
    stop,
    speakWord: useCallback(
      (word: string, rate = 0.7, voiceOverride?: string | null, langOverride?: PracticeLanguage) =>
        speakSingle(word, rate, voiceOverride ?? voiceRef.current, langOverride ?? langRef.current),
      []
    ),
  };
}
