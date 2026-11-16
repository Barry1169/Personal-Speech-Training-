"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { splitSentences } from "./analytics";

export interface VoiceOption {
  name: string;
  lang: string;
}

export function speakSingle(text: string, rate = 0.9, voiceName?: string | null) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1;
    if (voiceName) {
      const match = synth.getVoices().find((v) => v.name === voiceName);
      if (match) u.voice = match;
    }
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

export function useModelAudio(preferredVoice?: string | null) {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeSentence, setActiveSentence] = useState<number>(-1);

  const cancelledRef = useRef(false);
  const voiceRef = useRef(preferredVoice);

  useEffect(() => {
    voiceRef.current = preferredVoice;
  }, [preferredVoice]);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith("en"))
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
  }, [supported]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    stopSpeaking();
    setPlaying(false);
    setActiveSentence(-1);
  }, []);

  const playPassage = useCallback(
    (text: string, rate = 0.9, voiceOverride?: string | null) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      cancelledRef.current = false;

      const sentences = splitSentences(text);
      const chunks = sentences.length > 0 ? sentences : [text.trim()];
      const targetVoiceName = voiceOverride ?? voiceRef.current;
      const allVoices = synth.getVoices();
      const chosenVoice = targetVoiceName
        ? allVoices.find((v) => v.name === targetVoiceName)
        : allVoices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) ??
          allVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

      setPlaying(true);

      const speakAt = (idx: number) => {
        if (cancelledRef.current || idx >= chunks.length) {
          setPlaying(false);
          setActiveSentence(-1);
          return;
        }
        setActiveSentence(idx);
        const u = new SpeechSynthesisUtterance(chunks[idx]);
        u.rate = rate;
        u.pitch = 1;
        if (chosenVoice) u.voice = chosenVoice;
        u.onend = () => {
          if (cancelledRef.current) return;
          // Brief natural breathing pause between sentences (320ms)
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
    playing,
    activeSentence,
    playPassage,
    stop,
    speakWord: useCallback(
      (word: string, rate = 0.85, voiceOverride?: string | null) =>
        speakSingle(word, rate, voiceOverride ?? voiceRef.current),
      []
    ),
  };
}
