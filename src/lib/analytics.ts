import type {
  DetailedAssessment,
  DimensionScore,
  PauseStats,
  PitchSample,
  PitchStats,
  PracticeLanguage,
  ProblemSentence,
  ProblemWord,
  RecordingAnalysis,
  SelfScores,
  VolumeSample,
  VolumeStats,
} from "./types";
import { summarizePitch } from "./pitch";

export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/\s+/)
    // Preserve Unicode combining marks (\p{M}) so Devanagari matras, halants, and anusvara stay intact
    .map((w) => w.replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

const FILLER_PATTERNS: [string, RegExp][] = [
  ["um", /\b(um+|umm+)\b/g],
  ["uh", /\b(uh+|uhh+|erm+|er)\b/g],
  ["like (filler)", /\blike\s+(i|you|to|a|the|it|we|this|that|so|really)\b/g],
  ["you know", /\byou know\b/g],
  ["basically", /\bbasically\b/g],
  ["actually", /\bactually\b/g],
  ["literally", /\bliterally\b/g],
  ["sort of", /\bsort of\b/g],
  ["kind of", /\bkind of\b/g],
  ["i mean", /\bi mean\b/g],
];

const HINDI_FILLER_PATTERNS: [string, RegExp][] = [
  ["मतलब (matlab)", /(?:^|[\s।,.!?])मतलब(?=$|[\s।,.!?])|\bmatlab\b/gi],
  ["अं / हम्म (uh/hmm)", /(?:^|[\s।,.!?])(अं+|हम्म+|उम्म+)(?=$|[\s।,.!?])|\bhmm+\b/gi],
  ["बेसिकली (basically)", /(?:^|[\s।,.!?])बेसिकली(?=$|[\s।,.!?])|\bbasically\b/gi],
  ["एक्चुअली (actually)", /(?:^|[\s।,.!?])एक्चुअली(?=$|[\s।,.!?])|\bactually\b/gi],
  ["तो मतलब (so like)", /तो\s+मतलब/gi],
  ["वो क्या है (filler)", /वो\s+क्या\s+है/gi],
  ["अच्छा तो (filler)", /अच्छा\s+तो/gi],
  ["um / uh", /\b(um+|umm+|uh+|uhh+|erm+)\b/gi],
];

export interface TranscriptStats {
  wordCount: number;
  wpm: number | null;
  fillerTotal: number;
  fillers: Record<string, number>;
  repeats: string[];
}

export function analyzeTranscript(
  text: string,
  durationSec: number,
  language?: PracticeLanguage
): TranscriptStats {
  const words = tokenize(text);
  const wpm =
    words.length > 0 && durationSec > 3
      ? Math.round(words.length / (durationSec / 60))
      : null;

  const isHindi = language === "hi" || (!language && hasDevanagari(text));
  const norm = text.toLowerCase();
  const fillers: Record<string, number> = {};
  let fillerTotal = 0;
  const patterns = isHindi ? HINDI_FILLER_PATTERNS : FILLER_PATTERNS;
  for (const [label, re] of patterns) {
    const m = norm.match(re);
    if (m && m.length > 0) {
      fillers[label] = m.length;
      fillerTotal += m.length;
    }
  }

  // Adjacent repeated words (stutter-repeats like "and and") and restarted two-word phrases
  const repeats: string[] = [];
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 1) {
      if (repeats[repeats.length - 1] !== words[i]) repeats.push(words[i]);
    }
  }
  for (let i = 3; i < words.length; i++) {
    if (words[i] === words[i - 2] && words[i - 1] === words[i - 3]) {
      const phrase = `${words[i - 1]} ${words[i]}`;
      if (!repeats.includes(phrase)) repeats.push(phrase);
    }
  }

  return { wordCount: words.length, wpm, fillerTotal, fillers, repeats };
}

// ---- Volume & pause analysis from RMS timeline ----

const SILENCE = 0.018;

function percentileNum(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

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

  const dbs = all
    .map((s) => 20 * Math.log10(Math.max(1e-5, s.r)))
    .sort((a, b) => a - b);
  const avgDb = Number((dbs.reduce((a, b) => a + b, 0) / dbs.length).toFixed(1));
  const dynamicRangeDb = Number(Math.max(0, percentileNum(dbs, 0.9) - percentileNum(dbs, 0.1)).toFixed(1));

  return { avg, min, max, cv, activeRatio, avgDb, dynamicRangeDb };
}

export function detectLongPauses(tl: VolumeSample[], minMs = 1200): number {
  if (tl.length < 10) return 0;
  const step = tl.length > 1 ? Math.max(20, tl[1].t - tl[0].t) : 100;
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
        silentRun = 0;
      }
    }
  }
  return count;
}

export function analyzePauses(tl: VolumeSample[], durationSec: number): PauseStats | null {
  if (tl.length < 10) return null;
  const step = tl.length > 1 ? Math.max(20, tl[1].t - tl[0].t) : 100;

  // Trim leading and trailing silence so we only inspect intra-speech pauses
  const firstActive = tl.findIndex((s) => s.r > SILENCE);
  let lastActive = -1;
  for (let i = tl.length - 1; i >= 0; i--) {
    if (tl[i].r > SILENCE) {
      lastActive = i;
      break;
    }
  }
  if (firstActive === -1 || lastActive <= firstActive) {
    return {
      naturalCount: 0,
      deliberateCount: 0,
      longCount: 0,
      longestPauseMs: 0,
      longestRunMs: 0,
      avgPauseMs: 0,
      pausesPerMin: 0,
    };
  }

  const pauseDurs: number[] = [];
  let silentMs = 0;
  let speechMs = 0;
  let longestRunMs = 0;

  for (let i = firstActive; i <= lastActive; i++) {
    const active = tl[i].r > SILENCE;
    if (active) {
      if (silentMs >= 350) pauseDurs.push(silentMs);
      silentMs = 0;
      speechMs += step;
      if (speechMs > longestRunMs) longestRunMs = speechMs;
    } else {
      silentMs += step;
      if (silentMs >= 350) speechMs = 0;
    }
  }

  const naturalCount = pauseDurs.filter((d) => d >= 350 && d < 1000).length;
  const deliberateCount = pauseDurs.filter((d) => d >= 1000 && d <= 1500).length;
  const longCount = pauseDurs.filter((d) => d > 1500).length;
  const longestPauseMs = pauseDurs.length ? Math.max(...pauseDurs) : 0;
  const avgPauseMs = pauseDurs.length
    ? Math.round(pauseDurs.reduce((a, b) => a + b, 0) / pauseDurs.length)
    : 0;
  const mins = Math.max(0.25, durationSec / 60);
  const pausesPerMin = Number((pauseDurs.length / mins).toFixed(1));

  return {
    naturalCount,
    deliberateCount,
    longCount,
    longestPauseMs,
    longestRunMs,
    avgPauseMs,
    pausesPerMin,
  };
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
    return {
      tokens: b.map((word) => ({ word, status: "extra" })),
      coverage: 0,
      missingCount: 0,
      extraCount: b.length,
    };
  }
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
  comparison: Comparison | null,
  pitchSamples?: PitchSample[],
  language?: PracticeLanguage
): RecordingAnalysis {
  const t = analyzeTranscript(transcript, durationSec, language);
  const volume = analyzeVolume(tl);
  const pauses = analyzePauses(tl, durationSec);
  const pitch = pitchSamples ? summarizePitch(pitchSamples) : null;

  let articulationWpm: number | null = null;
  if (t.wordCount > 0 && durationSec > 3 && volume && volume.activeRatio > 0.25) {
    const activeSec = Math.max(2, durationSec * volume.activeRatio);
    articulationWpm = Math.round(t.wordCount / (activeSec / 60));
  }

  return {
    wordCount: t.wordCount,
    wpm: t.wpm,
    articulationWpm,
    fillerTotal: t.fillerTotal,
    fillers: t.fillers,
    repeats: t.repeats,
    longPauses: pauses ? pauses.longCount : detectLongPauses(tl),
    volume,
    coverage: comparison ? Math.round(comparison.coverage * 100) : null,
    pitch,
    pauses,
  };
}

// ---- Phonetic & Delivery Hints for Specific Problem Words ----

function phoneticCoachingForWord(word: string): { correctionTip: string; phoneticHint?: string } {
  if (hasDevanagari(word)) {
    if (/[\u094D]/.test(word)) {
      return {
        phoneticHint: "Hindi conjunct (Samyuktakshar)",
        correctionTip: `"${word}" contains a half-letter conjunct. Slow down 20% and glide lightly through the joined consonants without locking your tongue.`,
      };
    }
    if (/[खघछझठढथधफभ]/.test(word)) {
      return {
        phoneticHint: "Hindi aspirated (Mahaprana)",
        correctionTip: `Release a gentle, clear puff of breath on the aspirated consonant in "${word}" — don't squeeze your throat or flatten it into an unaspirated sound.`,
      };
    }
    if (/[टठडढणड़ढ़]/.test(word)) {
      return {
        phoneticHint: "Hindi retroflex (Murdhanya)",
        correctionTip: `Curl your tongue tip gently back toward the roof of your mouth for "${word}" instead of touching behind your teeth.`,
      };
    }
    if (/[शष]/.test(word)) {
      return {
        phoneticHint: "Hindi sh / s contrast",
        correctionTip: `Keep "${word}" crisp by separating palatal "श/ष" (mid-tongue raised, soft hush) from plain dental "स".`,
      };
    }
    if (/[ंँ]/.test(word)) {
      return {
        phoneticHint: "Hindi nasalization (Anusvara)",
        correctionTip: `Let a gentle nasal resonance flow through "${word}" without stopping the breath stream.`,
      };
    }
    return {
      phoneticHint: "Hindi syllable clarity",
      correctionTip: `Speak "${word}" with even vowel length (matras) and relaxed jaw — don't swallow the ending syllable.`,
    };
  }
  const w = word.toLowerCase();
  if (/th/.test(w)) {
    return {
      phoneticHint: "TH placement",
      correctionTip: `Place the tongue tip gently between your front teeth on "${word}" and release air cleanly instead of substituting T, D, S, or Z.`,
    };
  }
  if (/(r.*l|l.*r)/.test(w)) {
    return {
      phoneticHint: "R / L contrast",
      correctionTip: `Separate L (tongue tip firmly touching the ridge behind top teeth) from R (tongue curled slightly back, no contact) in "${word}".`,
    };
  }
  if (/(str|spl|spr|scr|sts|sks|cts|pts|nds|nts)/.test(w)) {
    return {
      phoneticHint: "Consonant cluster",
      correctionTip: `"${word}" has a tight consonant cluster. Slow down 20% and release every consonant instead of dropping the final sound.`,
    };
  }
  if (/[vw]/.test(w) && /[bfp]/.test(w)) {
    return {
      phoneticHint: "Lip & teeth contrast",
      correctionTip: `For "${word}", touch top teeth lightly to bottom lip for V/F, round lips cleanly for W, and press both lips for B/P.`,
    };
  }
  if (/(ed|t|d|k|g|p)$/.test(w) && w.length >= 4) {
    return {
      phoneticHint: "Word-ending release",
      correctionTip: `Don't swallow the final consonant of "${word}". Give the ending a crisp, light release before moving to the next word.`,
    };
  }
  if (w.length >= 8) {
    return {
      phoneticHint: "Multi-syllable rhythm",
      correctionTip: `Break "${word}" into slow syllables first, identify the stressed syllable, then blend it back to natural speed.`,
    };
  }
  if (/(s|z|sh|ch)/.test(w)) {
    return {
      phoneticHint: "Sibilant precision",
      correctionTip: `Keep the tongue tip close to (not pressed against) the ridge behind your teeth so "${word}" sounds crisp without blurring.`,
    };
  }
  return {
    phoneticHint: "Clear enunciation",
    correctionTip: `Say "${word}" three times slowly on its own, then read the full phrase at 85% speed so it lands cleanly.`,
  };
}

export function extractProblemWords(
  script: string | null,
  transcript: string,
  comparison: Comparison | null,
  fillers: Record<string, number>,
  repeats: string[]
): ProblemWord[] {
  const out: ProblemWord[] = [];
  const seen = new Set<string>();

  // 1. Missing words from scripted comparison (prioritize content words > 2 chars)
  if (script && comparison) {
    const tokens = comparison.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.status !== "missing") continue;
      if (tok.word.length <= 2 && out.length >= 3) continue;
      const key = `missing:${tok.word}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const prev = tokens[i - 1]?.word ?? "";
      const next = tokens[i + 1]?.word ?? "";
      const context = [prev, `[${tok.word}]`, next].filter(Boolean).join(" ");
      const hint = phoneticCoachingForWord(tok.word);
      out.push({
        word: tok.word,
        kind: "missing",
        context,
        correctionTip: `${hint.correctionTip} (Note: if you heard yourself say it clearly on replay, this may be an STT mis-transcription rather than a pronunciation error.)`,
        phoneticHint: hint.phoneticHint,
      });
      if (out.length >= 6) break;
    }
  }

  // 2. Detected filler words
  for (const [filler, count] of Object.entries(fillers)) {
    const key = `filler:${filler}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      word: filler,
      kind: "filler",
      context: `Used ${count}× in this take`,
      correctionTip: `Replace "${filler}" with a calm half-second silent pause and an inhale through your nose. Listeners hear silence as confidence.`,
      phoneticHint: "Silent beat replacement",
    });
  }

  // 3. Repeated / stumbled words
  for (const rep of repeats.slice(0, 3)) {
    const key = `rep:${rep}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      word: rep,
      kind: "repeated",
      context: `Repeated: "${rep} ${rep}"`,
      correctionTip: `When you catch yourself restarting on "${rep}", stop replaying the phrase—take a clean breath and continue forward.`,
      phoneticHint: "No-restart flow",
    });
  }

  return out.slice(0, 10);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?।॥])\s+/)
    .map((s) => s.trim())
    .filter((s) => tokenize(s).length >= 3);
}

export function analyzeSentences(script: string | null, transcript: string): ProblemSentence[] {
  if (!script || !script.trim()) return [];
  const sentences = splitSentences(script);
  if (sentences.length === 0) return [];

  const spokenTokens = tokenize(transcript);
  if (spokenTokens.length === 0) {
    return sentences.slice(0, 3).map((sentence, index) => ({
      index: index + 1,
      sentence,
      matchPct: 0,
      missingWords: tokenize(sentence).slice(0, 5),
      fillers: [],
      tip: "No transcript was detected for this sentence. Replay your audio or switch to manual transcript to verify.",
    }));
  }

  // Use a single global LCS alignment so every sentence owns its exact aligned slice
  const globalCmp = compareWords(sentences.join(" "), transcript);
  const sentenceWordCounts = sentences.map((s) => tokenize(s).length);

  // Partition globalCmp.tokens across sentences using script-word counters (match + missing = script words)
  const buckets: { matched: number; total: number; missingWords: string[]; spokenWords: string[] }[] =
    sentences.map(() => ({ matched: 0, total: 0, missingWords: [], spokenWords: [] }));

  let sentIdx = 0;
  let scriptWordsSeen = 0;

  for (const tok of globalCmp.tokens) {
    while (sentIdx < sentences.length - 1 && scriptWordsSeen >= sentenceWordCounts[sentIdx]) {
      sentIdx++;
      scriptWordsSeen = 0;
    }
    const b = buckets[sentIdx];
    if (tok.status === "match") {
      b.matched++;
      b.total++;
      b.spokenWords.push(tok.word);
      scriptWordsSeen++;
    } else if (tok.status === "missing") {
      b.total++;
      if (tok.word.length > 2) b.missingWords.push(tok.word);
      scriptWordsSeen++;
    } else {
      // Extra spoken word (e.g. filler or stumble) belongs to the current sentence
      b.spokenWords.push(tok.word);
    }
  }

  const problems: ProblemSentence[] = [];
  for (let idx = 0; idx < sentences.length; idx++) {
    const sent = sentences[idx];
    const b = buckets[idx];
    const matchPct = b.total > 0 ? Math.round((b.matched / b.total) * 100) : 100;
    const sliceText = b.spokenWords.join(" ");

    const fillerHits: string[] = [];
    for (const [label, re] of FILLER_PATTERNS) {
      if (new RegExp(re.source, re.flags).test(sliceText)) fillerHits.push(label);
    }

    if (matchPct < 85 || fillerHits.length > 0) {
      let tip = "";
      if (matchPct < 60) {
        tip = `Several words diverged (${matchPct}% STT match). Slow down by 15%, breathe before starting this sentence, and practice the missed words separately.`;
      } else if (b.missingWords.length > 0) {
        tip = `Watch "${[...new Set(b.missingWords)].slice(0, 3).join('", "')}" — slow slightly on those words and land the final consonants cleanly.`;
      } else if (fillerHits.length > 0) {
        tip = `A filler (${fillerHits.join(", ")}) appeared here. Pause silently at the comma or start of the sentence instead.`;
      } else {
        tip = "Re-read this sentence once at 85% speed focusing on smooth phrasing and clear word endings.";
      }
      problems.push({
        index: idx + 1,
        sentence: sent,
        matchPct,
        missingWords: [...new Set(b.missingWords)].slice(0, 5),
        fillers: fillerHits,
        tip,
      });
    }
  }

  return problems.slice(0, 4);
}

// ---- Explainable 100-Point Assessment Engine ----

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeDetailedAssessment(params: {
  analysis: RecordingAnalysis;
  self: SelfScores | null;
  script: string | null;
  transcript: string;
  comparison: Comparison | null;
  durationSec: number;
  targetWpm?: number;
}): DetailedAssessment {
  const { analysis, self, script, transcript, comparison, durationSec } = params;
  const targetWpm = params.targetWpm ?? 130;
  const targetLo = Math.max(95, targetWpm - 18);
  const targetHi = Math.min(165, targetWpm + 20);

  const hasTranscript = analysis.wordCount >= 3;
  const hasAudio = analysis.volume != null;
  const hasScript = !!script && script.trim().length > 0 && analysis.coverage != null;

  // 1. PACE SCORE (Measured from WPM vs target band)
  let paceMeasured: number;
  let paceEvidence: string;
  let paceInterp: string;
  let paceTip: string;
  if (analysis.wpm == null) {
    paceMeasured = self?.pacing ? self.pacing * 20 : 50;
    paceEvidence = "Not enough transcribed words (>3s of speech needed) to measure WPM directly.";
    paceInterp = self?.pacing
      ? `Based on your self-rating (${self.pacing}/5) because no WPM could be computed.`
      : "No speech speed measurement captured; speak for at least 5 seconds or enter a manual transcript.";
    paceTip = "Record at least 15–30 seconds so your true WPM can be measured reliably.";
  } else {
    const wpm = analysis.wpm;
    if (wpm >= targetLo && wpm <= targetHi) {
      // Peak 92-100 inside target band
      const centerDist = Math.abs(wpm - targetWpm);
      paceMeasured = clamp100(100 - centerDist * 0.45);
      paceInterp = "Right inside your target conversational/reading speed band.";
      paceTip = "Maintain this steady tempo while slowing 15% on key emphasis words.";
    } else if (wpm < targetLo) {
      const deficit = targetLo - wpm;
      paceMeasured = clamp100(88 - deficit * 1.15);
      paceInterp = wpm < 85
        ? "Noticeably slow — clear, though phrasing may sound choppy or overly cautious."
        : "Slightly below target pace — clear, with room to connect phrases more smoothly.";
      paceTip = "Link words smoothly within short clauses and pause only at punctuation or breath marks.";
    } else {
      const excess = wpm - targetHi;
      paceMeasured = clamp100(88 - excess * 1.25);
      paceInterp = wpm > 175
        ? "Too fast — rushing compresses consonants and gives listeners no time to absorb key points."
        : "A bit brisk — watch that word endings and punctuation pauses don't get clipped.";
      paceTip = "Add a deliberate 0.5s pause at every period and slow down on the final word of each sentence.";
    }
    paceEvidence = `Measured ${wpm} WPM (${analysis.wordCount} words in ${durationSec}s; target ${targetLo}–${targetHi} WPM)${
      analysis.articulationWpm ? ` · active speaking speed ~${analysis.articulationWpm} WPM` : ""
    }.`;
  }
  const paceScore =
    self?.pacing && self.pacing > 0 && analysis.wpm != null
      ? clamp100(paceMeasured * 0.8 + self.pacing * 20 * 0.2)
      : paceMeasured;

  const paceDim: DimensionScore = {
    key: "pace",
    label: "Pace",
    score: paceScore,
    displayScore: paceScore,
    rawDisplay: analysis.wpm != null ? `${analysis.wpm} WPM` : "No WPM",
    evidenceKind: analysis.wpm != null ? (self?.pacing ? "hybrid" : "measured") : "self",
    evidence: paceEvidence,
    interpretation: paceInterp,
    tip: paceTip,
  };

  // 2. FLUENCY SCORE (Measured from fillers/min + repeats + hesitation pauses)
  const minutes = Math.max(0.25, durationSec / 60);
  const fillersPerMin = analysis.fillerTotal / minutes;
  const repeatCount = analysis.repeats.length;
  const longHesitations = analysis.pauses ? analysis.pauses.longCount : analysis.longPauses;

  let fluencyMeasured = 96;
  if (!hasTranscript) {
    fluencyMeasured = self?.fluency ? self.fluency * 20 : 50;
  } else {
    // Deterministic penalty schedule
    const fillerPenalty = Math.min(48, fillersPerMin * 9.5 + (analysis.fillerTotal > 0 ? 4 : 0));
    const repeatPenalty = Math.min(24, repeatCount * 7);
    const hesitationPenalty = Math.min(20, Math.max(0, longHesitations - 1) * 5);
    fluencyMeasured = clamp100(98 - fillerPenalty - repeatPenalty - hesitationPenalty);
  }
  const fluencyScore =
    self?.fluency && self.fluency > 0 && hasTranscript
      ? clamp100(fluencyMeasured * 0.75 + self.fluency * 20 * 0.25)
      : fluencyMeasured;

  const fillerBreakdown = Object.entries(analysis.fillers)
    .map(([k, v]) => `"${k}" ×${v}`)
    .join(", ");

  const fluencyDim: DimensionScore = {
    key: "fluency",
    label: "Fluency",
    score: fluencyScore,
    displayScore: fluencyScore,
    rawDisplay: hasTranscript ? `${analysis.fillerTotal} filler${analysis.fillerTotal === 1 ? "" : "s"}` : "No transcript",
    evidenceKind: hasTranscript ? (self?.fluency ? "hybrid" : "measured") : "self",
    evidence: hasTranscript
      ? `Measured ${analysis.fillerTotal} filler word(s) (${fillersPerMin.toFixed(1)}/min${
          fillerBreakdown ? `: ${fillerBreakdown}` : ""
        }), ${repeatCount} repeated word/phrase restart(s), and ${longHesitations} hesitation pause(s) >1.5s.`
      : "No transcript was captured, so filler words and restarts could not be counted automatically.",
    interpretation: !hasTranscript
      ? "Provide a transcript or use Chrome/Edge speech-to-text for measured fluency."
      : fluencyScore >= 85
      ? "Clean, continuous delivery with minimal hesitation or filler leakage."
      : fluencyScore >= 65
      ? "Generally smooth flow, with a few fillers or restarts interrupting momentum."
      : "Noticeable hesitation or filler words broke up your phrasing.",
    tip:
      analysis.fillerTotal > 0
        ? "Practice the Silent Beat rule: whenever you reach for a word, close your lips for 0.5–1 second instead of saying um/uh/like."
        : repeatCount > 0
        ? "Apply the No-Restart rule: if you stumble on a word, keep moving forward to the period."
        : "Keep stretching into 60–90s spontaneous talks to test this clean flow under live thinking pressure.",
  };

  // 3. PAUSES & BREATHING SCORE (Measured directly from audio RMS envelope)
  const p = analysis.pauses;
  const vol = analysis.volume;
  let pauseMeasured = 55;
  let pauseEvidence = "No microphone audio envelope was recorded to measure pauses and breath pacing.";
  let pauseInterp = "Record with microphone access to measure actual pause lengths and breath cadence.";
  let pauseTip = "Do 6 cycles of 3-4-6 breathing before recording so your exhales stay steady.";

  if (p && vol) {
    let score = 92;
    const notes: string[] = [];

    // Check breathless runs (>12s continuous speech without a 350ms breath break)
    if (p.longestRunMs > 16000) {
      score -= 22;
      notes.push(`longest unbroken run was ${(p.longestRunMs / 1000).toFixed(1)}s (rushed breathing)`);
    } else if (p.longestRunMs > 12000) {
      score -= 10;
      notes.push(`longest run ${(p.longestRunMs / 1000).toFixed(1)}s — slightly long between breaths`);
    }

    // Check very long awkward hesitation pauses (>1.5s)
    if (p.longCount >= 3) {
      score -= Math.min(26, p.longCount * 6);
      notes.push(`${p.longCount} long pauses (>1.5s)`);
    } else if (p.longCount >= 1 && durationSec < 25) {
      score -= 8;
      notes.push(`${p.longCount} long pause (>1.5s) in a short clip`);
    }

    // Check healthy natural pauses in recordings >= 12s
    if (durationSec >= 12 && p.naturalCount + p.deliberateCount === 0) {
      score -= 18;
      notes.push("zero natural 0.35–1.5s phrasing pauses detected");
    }

    // Active speaking ratio (healthy band 58%–86%)
    if (vol.activeRatio > 0.9) {
      score -= 12;
      notes.push(`speaking ${Math.round(vol.activeRatio * 100)}% of the clip with very little breathing room`);
    } else if (vol.activeRatio < 0.45) {
      score -= 16;
      notes.push(`only ${Math.round(vol.activeRatio * 100)}% active speech (heavy silence)`);
    }

    pauseMeasured = clamp100(score);
    pauseEvidence = `Measured ${p.naturalCount} natural pause(s) (0.35–1.0s), ${p.deliberateCount} deliberate pause(s) (1.0–1.5s), ${p.longCount} long pause(s) (>1.5s); longest continuous run ${(p.longestRunMs / 1000).toFixed(1)}s; active speech ${Math.round(vol.activeRatio * 100)}%.`;
    pauseInterp =
      notes.length === 0
        ? "Balanced phrasing and breath cadence — pauses give your words room to land."
        : `Acoustic timing flags: ${notes.join("; ")}.`;
    pauseTip =
      p.longestRunMs > 12000 || vol.activeRatio > 0.88
        ? "Plan a quiet nasal breath at every period and long comma — never speak until your lungs run empty."
        : p.longCount >= 2
        ? "Shorten mid-sentence hesitations by reading ahead 3–4 words or pausing cleanly at sentence boundaries."
        : "Your pause timing is well-paced. Experiment with a deliberate 1-second pause right before your most important point.";
  }

  const pauseScore =
    self?.breathing && self.breathing > 0 && p
      ? clamp100(pauseMeasured * 0.8 + self.breathing * 20 * 0.2)
      : self?.vocalControl && self.vocalControl > 0 && !p
      ? clamp100(self.vocalControl * 20)
      : pauseMeasured;

  const pausesDim: DimensionScore = {
    key: "pausesBreathing",
    label: "Pauses & Breathing",
    score: pauseScore,
    displayScore: pauseScore,
    rawDisplay: p ? `${p.naturalCount + p.deliberateCount} clean / ${p.longCount} long` : "No audio",
    evidenceKind: p ? (self?.breathing ? "hybrid" : "measured") : "self",
    evidence: pauseEvidence,
    interpretation: pauseInterp,
    tip: pauseTip,
  };

  // 4. VOICE EXPRESSION SCORE (Measured real pitch F0 semitone range + dynamic volume range dB)
  const pitch: PitchStats | null = analysis.pitch ?? null;
  let exprMeasured: number | null = null;
  let exprEvidence = "";
  let exprInterp = "";
  let exprTip = "";

  if (pitch && vol) {
    // Pitch variety score (ideal conversational/reading semitone p10..p90 span: 3.5 – 8.5 semitones)
    let pitchSub: number;
    if (pitch.semitoneRange < 1.8) pitchSub = 42 + pitch.semitoneRange * 10; // monotone
    else if (pitch.semitoneRange < 3.5) pitchSub = 60 + ((pitch.semitoneRange - 1.8) / 1.7) * 24;
    else if (pitch.semitoneRange <= 8.5) pitchSub = 86 + Math.min(12, (pitch.semitoneRange - 3.5) * 2.2);
    else if (pitch.semitoneRange <= 12) pitchSub = 90 - (pitch.semitoneRange - 8.5) * 2.5;
    else pitchSub = 74;

    // Volume dynamic range score (ideal natural emphasis contrast: 5 – 14 dB)
    const dyn = vol.dynamicRangeDb ?? 6;
    let dynSub: number;
    if (dyn < 3) dynSub = 55 + dyn * 6; // very flat
    else if (dyn <= 14) dynSub = 80 + Math.min(18, (dyn - 3) * 1.8);
    else dynSub = Math.max(62, 96 - (dyn - 14) * 2.5); // overly spiky

    exprMeasured = clamp100(pitchSub * 0.65 + dynSub * 0.35);
    exprEvidence = `Measured fundamental pitch median ${pitch.medianHz} Hz with ${pitch.semitoneRange.toFixed(
      1
    )} semitones span (p10–p90: ${pitch.p10Hz}–${pitch.p90Hz} Hz across ${pitch.voicedFrames} voiced frames) and ${dyn.toFixed(
      1
    )} dB volume dynamic range.`;
    exprInterp =
      pitch.semitoneRange < 2.5
        ? "Acoustic pitch variation is narrow (monotone tendency). Stressing 1 key word per sentence will immediately add warmth."
        : pitch.semitoneRange <= 8.5
        ? "Healthy vocal pitch movement and loudness contrast — sounds engaged rather than flat. (Acoustic variation is measured; verify emotional fit by ear.)"
        : "Wide pitch movement — energetic delivery; double-check on replay that sentence endings still settle downward cleanly.";
    exprTip =
      pitch.semitoneRange < 3
        ? "Pick ONE focus word in each sentence and lift your pitch slightly on it, then drop your pitch on the final word."
        : "Replay your take and verify that your tone rises gently on questions and drops firmly on conclusions.";
  } else if (vol) {
    const dyn = vol.dynamicRangeDb ?? 5;
    exprMeasured = clamp100(dyn < 3 ? 62 : dyn <= 13 ? 82 : 70);
    exprEvidence = `Measured ${dyn.toFixed(1)} dB volume dynamic range (volume variation index ${vol.cv.toFixed(
      2
    )}). Too few sustained voiced frames to extract pitch F0 reliably.`;
    exprInterp = "Volume dynamics were measured, but pitch variation needs a longer, slightly louder voiced recording.";
    exprTip = "Speak slightly closer to the microphone with steady breath support so your pitch contour registers cleanly.";
  } else {
    exprEvidence = "No live audio signal captured — acoustic pitch and volume dynamics cannot be measured.";
    exprInterp = "Self-evaluation only until you record with microphone access.";
    exprTip = "Record with your microphone to unlock real pitch-span (semitones) and volume-contrast analysis.";
  }

  const selfExpr = self?.expression && self.expression > 0 ? self.expression * 20 : self?.vocalControl && self.vocalControl > 0 ? self.vocalControl * 20 : null;
  const exprScore =
    exprMeasured != null && selfExpr != null
      ? clamp100(exprMeasured * 0.7 + selfExpr * 0.3)
      : exprMeasured ?? selfExpr ?? 55;

  const exprDim: DimensionScore = {
    key: "expression",
    label: "Voice Expression",
    score: exprMeasured != null || selfExpr != null ? exprScore : null,
    displayScore: exprScore,
    pendingSelfCheck: exprMeasured == null && selfExpr == null,
    rawDisplay: pitch ? `${pitch.semitoneRange.toFixed(1)} st` : vol?.dynamicRangeDb != null ? `${vol.dynamicRangeDb} dB` : "Pending",
    evidenceKind: exprMeasured != null ? (selfExpr != null ? "hybrid" : "measured") : "self",
    evidence: exprEvidence,
    interpretation: exprInterp,
    tip: exprTip,
  };

  // 5. CLARITY SCORE (Hybrid: script word match + steady projection/volume + self-check)
  let clarityMeasured: number | null = null;
  const clarityParts: string[] = [];
  if (hasScript && analysis.coverage != null) {
    clarityParts.push(`STT matched ${analysis.coverage}% of script words in order`);
  }
  if (vol) {
    const steadyLabel = vol.cv < 0.25 ? "steady" : vol.cv < 0.42 ? "fairly steady" : "uneven";
    clarityParts.push(`voice projection ${steadyLabel} (CV ${vol.cv.toFixed(2)}, avg ${vol.avgDb ?? -24} dBFS)`);
  }

  if (hasScript && analysis.coverage != null) {
    const covPart = analysis.coverage;
    const projPart = vol ? (vol.cv < 0.25 ? 92 : vol.cv < 0.4 ? 82 : vol.cv < 0.55 ? 68 : 54) : 78;
    const quietPenalty = vol?.avgDb != null && vol.avgDb < -36 ? 12 : 0;
    clarityMeasured = clamp100(covPart * 0.72 + projPart * 0.28 - quietPenalty);
  } else if (vol) {
    const projPart = vol.cv < 0.25 ? 88 : vol.cv < 0.4 ? 78 : vol.cv < 0.55 ? 65 : 52;
    const quietPenalty = vol.avgDb != null && vol.avgDb < -36 ? 12 : 0;
    clarityMeasured = clamp100(projPart - quietPenalty);
  }

  const selfClarity = self?.clarity && self.clarity > 0 ? self.clarity * 20 : null;
  const clarityScore =
    clarityMeasured != null && selfClarity != null
      ? clamp100(clarityMeasured * 0.65 + selfClarity * 0.35)
      : clarityMeasured ?? selfClarity ?? 60;

  const clarityDim: DimensionScore = {
    key: "clarity",
    label: "Clarity",
    score: clarityMeasured != null || selfClarity != null ? clarityScore : null,
    displayScore: clarityScore,
    pendingSelfCheck: !hasScript && selfClarity == null,
    rawDisplay: hasScript && analysis.coverage != null ? `${analysis.coverage}% match` : vol ? `${volumeLabel(vol.cv)}` : "Self-check",
    evidenceKind: clarityMeasured != null && selfClarity != null ? "hybrid" : clarityMeasured != null ? "measured" : "self",
    evidence:
      clarityParts.length > 0
        ? `${clarityParts.join(" · ")}.${selfClarity != null ? ` Self-check: ${(selfClarity / 20).toFixed(0)}/5.` : ""}`
        : "Free-speaking clip without audio volume stats — rate clarity after listening back.",
    interpretation:
      clarityScore >= 85
        ? "Words landed cleanly with steady projection across the take."
        : clarityScore >= 68
        ? "Generally clear, though a few words or volume dips softened intelligibility."
        : "Noticeable word drops, mumbled endings, or uneven volume reduced clarity.",
    tip:
      vol?.avgDb != null && vol.avgDb < -36
        ? "Project slightly louder from your diaphragm—speak as if reaching someone across a quiet room."
        : "Slow down 15% on consonant-heavy words and finish every final T, D, S, and K sound.",
  };

  // 6. PRONUNCIATION SCORE (Strict Honesty: Browser STT cannot clinically grade phoneme articulation!)
  const selfPron = self?.pronunciation && self.pronunciation > 0 ? self.pronunciation * 20 : null;
  let pronScore: number | null = selfPron;
  let pronDisplay = selfPron ?? (hasScript && analysis.coverage != null ? clamp100(analysis.coverage * 0.9) : 65);
  let pronPending = selfPron == null;

  const pronEvidence =
    selfPron != null
      ? `Your listening self-check: ${self!.pronunciation}/5 (${selfPron}/100).${
          hasScript && analysis.coverage != null
            ? ` Supporting STT word match: ${analysis.coverage}% (recognizability signal only — not phoneme scoring).`
            : ""
        }`
      : hasScript && analysis.coverage != null
      ? `Preliminary STT recognizability: ${analysis.coverage}% of script words matched. Speech-to-text cannot reliably measure tongue placement or accent precision — replay your audio and complete the Pronunciation self-check for an accurate score.`
      : "Browser microphones + speech-to-text cannot perform clinical phoneme grading. Replay your recording, listen closely to consonant/vowel crispness, and rate Pronunciation (1–5) below.";

  if (selfPron != null && hasScript && analysis.coverage != null) {
    // Self-check dominates (80%) while STT intelligibility provides a mild reality check (20%)
    pronScore = clamp100(selfPron * 0.8 + analysis.coverage * 0.2);
    pronDisplay = pronScore;
    pronPending = false;
  }

  const pronDim: DimensionScore = {
    key: "pronunciation",
    label: "Pronunciation",
    score: pronScore,
    displayScore: pronDisplay,
    pendingSelfCheck: pronPending,
    rawDisplay: selfPron != null ? `${self!.pronunciation}/5 self` : hasScript ? "Pending self-check" : "Rate after replay",
    evidenceKind: selfPron != null && hasScript ? "hybrid" : "self",
    evidence: pronEvidence,
    interpretation:
      pronPending
        ? "Waiting for your post-playback self-check so we never invent a fake pronunciation grade."
        : pronDisplay >= 85
        ? "Strong perceived articulation and sound accuracy."
        : pronDisplay >= 68
        ? "Understandable overall, with a few specific sounds worth isolating."
        : "Several target sounds blurred — isolate the problem words slowly before full-speed reading.",
    tip: "Listen back with eyes closed first, then compare against the Model Audio on any word that sounded soft or compressed.",
  };

  // OVERALL SCORE / 100 (Transparent weighted average of available scored dimensions)
  const weights: { dim: DimensionScore; weight: number }[] = [
    { dim: paceDim, weight: 0.2 },
    { dim: fluencyDim, weight: 0.2 },
    { dim: pausesDim, weight: 0.17 },
    { dim: clarityDim, weight: 0.17 },
    { dim: exprDim, weight: 0.14 },
    { dim: pronDim, weight: 0.12 },
  ];

  // If pronunciation is pending self-check, re-normalize weights across measured dimensions so overall score is purely evidence-backed
  const activeWeights = weights.filter((w) => w.dim.score !== null);
  const weightSum = activeWeights.reduce((acc, w) => acc + w.weight, 0);
  const overallScore =
    weightSum > 0
      ? clamp100(activeWeights.reduce((acc, w) => acc + (w.dim.score as number) * w.weight, 0) / weightSum)
      : 50;

  const overallBasis = pronPending
    ? `Computed from ${activeWeights.length} evidence-backed dimensions (Pace, Fluency, Pauses & Breathing, Clarity${
        exprDim.score != null ? ", Voice Expression" : ""
      }). Complete your Pronunciation self-check after playback to include all 6 dimensions.`
    : "Weighted composite of all 6 dimensions: Pace (20%), Fluency (20%), Pauses & Breathing (17%), Clarity (17%), Voice Expression (14%), and Pronunciation (12%).";

  const formulaSummary =
    "Overall = weighted average of Pace (20%), Fluency (20%), Pauses & Breathing (17%), Clarity (17%), Voice Expression (14%), and Pronunciation (12% — included once you complete the listening self-check). No random numbers are ever used.";

  // Strengths & Improvements (strictly derived from the scored dimensions)
  const allDims: DimensionScore[] = [paceDim, fluencyDim, pausesDim, clarityDim, exprDim, pronDim];
  const scoredDims = allDims.filter((d) => d.score !== null).sort((a, b) => (b.score as number) - (a.score as number));

  const strengths: string[] = [];
  for (const d of scoredDims.slice(0, 3)) {
    if ((d.score as number) >= 75) {
      strengths.push(`${d.label} (${d.score}/100): ${d.interpretation}`);
    }
  }
  if (hasTranscript && analysis.fillerTotal === 0) {
    strengths.push("Zero common filler words (um, uh, like, you know) detected in your transcript.");
  }
  if (strengths.length === 0 && scoredDims[0]) {
    strengths.push(`Strongest area this take: ${scoredDims[0].label} (${scoredDims[0].score}/100). Consistent repetition builds quickly from here.`);
  }

  const improvements: string[] = [];
  const weakestFirst = [...scoredDims].reverse();
  for (const d of weakestFirst.slice(0, 3)) {
    if ((d.score as number) < 85) {
      improvements.push(`${d.label} (${d.score}/100): ${d.tip}`);
    }
  }
  if (improvements.length === 0) {
    improvements.push("Solid take across every measured metric — increase difficulty by trying an impromptu or faster-transition passage next.");
  }

  const problemWords = extractProblemWords(script, transcript, comparison, analysis.fillers, analysis.repeats);
  const problemSentences = analyzeSentences(script, transcript);

  const measurableSummary: string[] = [];
  if (analysis.wpm != null) measurableSummary.push(`Speaking speed: ${analysis.wpm} WPM (target ${targetLo}–${targetHi} WPM)`);
  if (hasTranscript) measurableSummary.push(`Fillers: ${analysis.fillerTotal} (${fillersPerMin.toFixed(1)}/min) · Repeated words: ${repeatCount}`);
  if (p) measurableSummary.push(`Pauses: ${p.naturalCount + p.deliberateCount} clean phrasing pause(s), ${p.longCount} long hesitation(s) >1.5s, max run ${(p.longestRunMs / 1000).toFixed(1)}s`);
  if (pitch) measurableSummary.push(`Pitch contour (F0): median ${pitch.medianHz} Hz, ${pitch.semitoneRange.toFixed(1)} semitone span across ${pitch.voicedFrames} voiced frames`);
  if (vol) measurableSummary.push(`Volume: ${volumeLabel(vol.cv)} (CV ${vol.cv.toFixed(2)}), ${vol.dynamicRangeDb ?? 0} dB dynamic contrast, ${Math.round(vol.activeRatio * 100)}% active speech`);
  if (hasScript && analysis.coverage != null) measurableSummary.push(`Script alignment (STT): ${analysis.coverage}% word match in order`);

  const subjectiveNotes: string[] = [
    "Pronunciation quality (tongue/lip accuracy & accent clarity) cannot be reliably scored by browser speech-to-text — always verify by replaying your recording and rating it yourself.",
    "Voice expression metrics measure real acoustic pitch range (semitones) and volume contrast (dB), not whether your emotional tone matched the story's meaning.",
    "Coaching recommendations are deterministic rule-based insights generated locally from your measurements — nothing is uploaded to external servers.",
  ];

  return {
    overallScore,
    overallBasis,
    dimensions: {
      pronunciation: pronDim,
      clarity: clarityDim,
      pace: paceDim,
      fluency: fluencyDim,
      pausesBreathing: pausesDim,
      expression: exprDim,
    },
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    problemWords,
    problemSentences,
    formulaSummary,
    measurableSummary,
    subjectiveNotes,
    targetWpm,
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
