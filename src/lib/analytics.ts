import type { RecordingAnalysis, VolumeSample, VolumeStats } from "./types";

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

const FILLER_PATTERNS: [string, RegExp][] = [
  ["um", /\bum+|umm+/g],
  ["uh", /\buh+\b|\buhh+\b|\bermm?\b/g],
  ["like (filler)", /\blike\s+(I|you|to|a|the|it|we|this|that)\b/g],
  ["you know", /\byou know\b/g],
  ["basically", /\bbasically\b/g],
  ["actually", /\bactually\b/g],
  ["sort of", /\bsort of\b/g],
  ["kind of", /\bkind of\b/g],
];

export interface TranscriptStats {
  wordCount: number;
  wpm: number | null;
  fillerTotal: number;
  fillers: Record<string, number>;
  repeats: string[];
}

export function analyzeTranscript(text: string, durationSec: number): TranscriptStats {
  const words = tokenize(text);
  const wpm =
    words.length > 0 && durationSec > 3
      ? Math.round(words.length / (durationSec / 60))
      : null;

  const norm = text.toLowerCase();
  const fillers: Record<string, number> = {};
  let fillerTotal = 0;
  for (const [label, re] of FILLER_PATTERNS) {
    const m = norm.match(re);
    if (m && m.length > 0) {
      fillers[label] = m.length;
      fillerTotal += m.length;
    }
  }

  // adjacent repeated words (stutter-repeats like "and and")
  const repeats: string[] = [];
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 1) {
      if (repeats[repeats.length - 1] !== words[i]) repeats.push(words[i]);
    }
  }
  return { wordCount: words.length, wpm, fillerTotal, fillers, repeats };
}

// ---- Volume & pause analysis from RMS timeline ----

const SILENCE = 0.018;

export function analyzeVolume(tl: VolumeSample[]): VolumeStats | null {
  if (tl.length < 10) return null;
  const active = tl.filter((s) => s.r > SILENCE);
  const activeRatio = active.length / tl.length;
  const all = active.length > 0 ? active : tl;
  const avg = all.reduce((a, s) => a + s.r, 0) / all.length;
  const min = Math.min(...all.map((s) => s.r));
  const max = Math.max(...all.map((s) => s.r));
  const variance = all.reduce((a, s) => a + (s.r - avg) ** 2, 0) / all.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
  return { avg, min, max, cv, activeRatio };
}

export function detectLongPauses(tl: VolumeSample[], minMs = 1200): number {
  if (tl.length < 10) return 0;
  const step = tl.length > 1 ? tl[1].t - tl[0].t : 100;
  let count = 0;
  let silentRun = 0;
  let started = false;
  for (const s of tl) {
    if (s.r > SILENCE) {
      started = true;
      silentRun = 0;
    } else if (started) {
      silentRun += step;
      if (silentRun >= minMs) {
        count++;
        silentRun = 0; // count once per pause
      }
    }
  }
  return count;
}

// ---- Script vs transcript word comparison (LCS diff) ----

export interface DiffToken {
  word: string;
  status: "match" | "missing" | "extra";
}

export interface Comparison {
  tokens: DiffToken[];
  coverage: number; // 0..1 of script words matched in order
  missingCount: number;
  extraCount: number;
}

export function compareWords(script: string, spoken: string): Comparison {
  const a = tokenize(script);
  const b = tokenize(spoken);
  const n = a.length;
  const m = b.length;
  if (n === 0) {
    return { tokens: b.map((word) => ({ word, status: "extra" })), coverage: 0, missingCount: 0, extraCount: b.length };
  }
  // LCS DP (bounded — practice scripts are short)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  let missingCount = 0;
  let extraCount = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tokens.push({ word: a[i], status: "match" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ word: a[i], status: "missing" });
      i++;
      missingCount++;
    } else {
      tokens.push({ word: b[j], status: "extra" });
      j++;
      extraCount++;
    }
  }
  while (i < n) {
    tokens.push({ word: a[i], status: "missing" });
    i++;
    missingCount++;
  }
  while (j < m) {
    tokens.push({ word: b[j], status: "extra" });
    j++;
    extraCount++;
  }
  const coverage = n > 0 ? (n - missingCount) / n : 0;
  return { tokens, coverage, missingCount, extraCount };
}

export function buildAnalysis(
  transcript: string,
  durationSec: number,
  tl: VolumeSample[],
  comparison: Comparison | null
): RecordingAnalysis {
  const t = analyzeTranscript(transcript, durationSec);
  return {
    wordCount: t.wordCount,
    wpm: t.wpm,
    fillerTotal: t.fillerTotal,
    fillers: t.fillers,
    repeats: t.repeats,
    longPauses: detectLongPauses(tl),
    volume: analyzeVolume(tl),
    coverage: comparison ? Math.round(comparison.coverage * 100) : null,
  };
}

// ---- Helpers ----

export function paceLabel(wpm: number | null): { label: string; tone: "good" | "warn" | "bad" | "muted" } {
  if (wpm == null) return { label: "n/a", tone: "muted" };
  if (wpm < 90) return { label: `${wpm} wpm — quite slow`, tone: "warn" };
  if (wpm < 120) return { label: `${wpm} wpm — slow, careful`, tone: "good" };
  if (wpm <= 150) return { label: `${wpm} wpm — solid range`, tone: "good" };
  if (wpm <= 170) return { label: `${wpm} wpm — quick, watch clarity`, tone: "warn" };
  return { label: `${wpm} wpm — fast, slow down`, tone: "bad" };
}

export function volumeLabel(cv: number | null): string {
  if (cv == null) return "no data";
  if (cv < 0.2) return "steady";
  if (cv < 0.35) return "fairly steady";
  if (cv < 0.5) return "varied";
  return "uneven";
}
