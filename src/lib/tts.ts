"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasDevanagari, splitSentences } from "./analytics";
import type { PracticeLanguage } from "./types";

export interface VoiceOption {
  name: string;
  lang: string;
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
      allVoices.find((v) => v.lang.toLowerCase() === "hi-in") ??
      allVoices.find((v) => v.lang.toLowerCase().startsWith("hi"))
    );
  }
  return (
    allVoices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) ??
    allVoices.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

export function speakSingle(
  text: string,
  rate = 0.9,
  voiceName?: string | null,
  language?: PracticeLanguage
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const lang = resolveLang(text, language);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : "en-US";
    u.rate = rate;
    u.pitch = 1;
    const match = pickBestVoice(synth.getVoices(), lang, voiceName);
    if (match) u.voice = match;
    synth.speak(u);
    return true;
  } catch {
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
      try {
        synth.cancel();
      } catch {
        /* noop */
      }
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
      const synth = window.speechSynthesis;
      synth.cancel();
      cancelledRef.current = false;

      const lang = resolveLang(text, langOverride ?? langRef.current);
      const sentences = splitSentences(text);
      const chunks = sentences.length > 0 ? sentences : [text.trim()];
      const targetVoiceName = voiceOverride ?? voiceRef.current;
      const chosenVoice = pickBestVoice(synth.getVoices(), lang, targetVoiceName);

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
        u.rate = rate;
        u.pitch = 1;
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
      (word: string, rate = 0.85, voiceOverride?: string | null, langOverride?: PracticeLanguage) =>
        speakSingle(word, rate, voiceOverride ?? voiceRef.current, langOverride ?? langRef.current),
      []
    ),
  };
}
