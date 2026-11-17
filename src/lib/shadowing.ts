import { compareWords, tokenize } from "./analytics";
import { detectPitchHz } from "./pitch";
import type { ShadowComparison, SpeakerAcousticProfile } from "./types";

const CONTOUR_BINS = 64;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Pure-DSP acoustic extractor for Speaker Shadowing.
 * Turns raw mono PCM float samples into a speaker-normalized acoustic delivery profile:
 * - active speech boundaries (leading/trailing silence trimmed)
 * - speaker-normalized 64-bin pitch melody curve in relative semitones (pitch/gender invariant!)
 * - normalized 64-bin energy/emphasis contour (mic-gain invariant!)
 * - intra-speech pause windows, duty cycle, and estimated WPM
 */
export function analyzePcmProfile(
  samples: Float32Array,
  sampleRate: number,
  scriptText: string = ""
): SpeakerAcousticProfile {
  const totalDurationSec = samples.length > 0 && sampleRate > 0 ? samples.length / sampleRate : 0;
  if (samples.length < Math.max(256, Math.floor(sampleRate * 0.15))) {
    return {
      totalDurationSec: Number(totalDurationSec.toFixed(2)),
      activeDurationSec: Number(totalDurationSec.toFixed(2)),
      startSec: 0,
      endSec: Number(totalDurationSec.toFixed(2)),
      estimatedWpm: null,
      medianPitchHz: null,
      pitchRangeSt: 0,
      voicedRatio: 0,
      speechDutyCycle: 0,
      pauseCount: 0,
      pauses: [],
      energyContour: new Array<number>(CONTOUR_BINS).fill(0),
      pitchContourSt: new Array<number | null>(CONTOUR_BINS).fill(null),
      emphasisPeaks: [],
    };
  }

  // 40 ms window, 20 ms hop (50 frames/sec)
  const winSize = Math.min(2048, Math.max(512, Math.round(sampleRate * 0.04)));
  const hopSize = Math.max(256, Math.round(sampleRate * 0.02));
  const hopSec = hopSize / sampleRate;

  const frameRms: number[] = [];
  const framePitch: (number | null)[] = [];

  for (let offset = 0; offset + winSize <= samples.length; offset += hopSize) {
    const slice = samples.subarray(offset, offset + winSize);
    let sumSq = 0;
    for (let i = 0; i < slice.length; i++) sumSq += slice[i] * slice[i];
    const rms = Math.sqrt(sumSq / slice.length);
    frameRms.push(rms);

    if (rms > 0.012) {
      const p = detectPitchHz(slice, sampleRate);
      framePitch.push(p && p.clarity >= 0.42 ? p.hz : null);
    } else {
      framePitch.push(null);
    }
  }

  if (frameRms.length === 0) {
    return {
      totalDurationSec: Number(totalDurationSec.toFixed(2)),
      activeDurationSec: 0,
      startSec: 0,
      endSec: 0,
      estimatedWpm: null,
      medianPitchHz: null,
      pitchRangeSt: 0,
      voicedRatio: 0,
      speechDutyCycle: 0,
      pauseCount: 0,
      pauses: [],
      energyContour: new Array<number>(CONTOUR_BINS).fill(0),
      pitchContourSt: new Array<number | null>(CONTOUR_BINS).fill(null),
      emphasisPeaks: [],
    };
  }

  // Adaptive speech-activity threshold based on clip's own loud frames (handles quiet/loud mics fairly)
  const sortedRms = [...frameRms].sort((a, b) => a - b);
  const p92 = percentile(sortedRms, 0.92);
  const p15 = percentile(sortedRms, 0.15);
  const threshold = Math.max(0.012, p15 + (p92 - p15) * 0.14);

  let firstActive = frameRms.findIndex((r) => r > threshold);
  let lastActive = -1;
  for (let i = frameRms.length - 1; i >= 0; i--) {
    if (frameRms[i] > threshold) {
      lastActive = i;
      break;
    }
  }
  if (firstActive === -1 || lastActive <= firstActive) {
    firstActive = 0;
    lastActive = frameRms.length - 1;
  }

  const activeRms = frameRms.slice(firstActive, lastActive + 1);
  const activePitchRaw = framePitch.slice(firstActive, lastActive + 1);
  const activeFrames = activeRms.length;
  const startSec = Number((firstActive * hopSec).toFixed(2));
  const endSec = Number(((lastActive + 1) * hopSec).toFixed(2));
  const activeDurationSec = Number(Math.max(0.2, endSec - startSec).toFixed(2));

  // Detect intra-speech pauses (>= 240 ms) and speech duty cycle
  const pauses: { start: number; end: number; durMs: number }[] = [];
  let silentStart = -1;
  let speakingFrames = 0;

  for (let i = 0; i < activeFrames; i++) {
    const isSpeech = activeRms[i] > threshold;
    if (isSpeech) {
      speakingFrames++;
      if (silentStart !== -1) {
        const durMs = Math.round((i - silentStart) * hopSec * 1000);
        if (durMs >= 240) {
          pauses.push({
            start: Number((silentStart / activeFrames).toFixed(3)),
            end: Number((i / activeFrames).toFixed(3)),
            durMs,
          });
        }
        silentStart = -1;
      }
    } else if (silentStart === -1) {
      silentStart = i;
    }
  }

  const speechDutyCycle = Number((speakingFrames / Math.max(1, activeFrames)).toFixed(3));

  // Median F0 & semitone span over voiced frames (excluding octave outliers)
  const rawVoiced = activePitchRaw.filter((hz): hz is number => hz !== null).sort((a, b) => a - b);
  let medianPitchHz: number | null = null;
  let pitchRangeSt = 0;

  if (rawVoiced.length >= 4) {
    const med = percentile(rawVoiced, 0.5);
    const cleaned = rawVoiced.filter((hz) => hz >= med * 0.55 && hz <= med * 1.85);
    if (cleaned.length >= 3) {
      medianPitchHz = Math.round(percentile(cleaned, 0.5));
      const p10 = percentile(cleaned, 0.1);
      const p90 = percentile(cleaned, 0.9);
      pitchRangeSt = Number((12 * Math.log2(Math.max(1.001, p90 / Math.max(1, p10)))).toFixed(1));
    }
  }

  const voicedRatio = Number((rawVoiced.length / Math.max(1, activeFrames)).toFixed(3));

  // Normalize energy contour & speaker-relative pitch contour into 64 bins
  const normScale = Math.max(0.015, percentile([...activeRms].sort((a, b) => a - b), 0.95));
  const energyContour: number[] = [];
  const pitchContourSt: (number | null)[] = [];

  for (let b = 0; b < CONTOUR_BINS; b++) {
    const iStart = Math.floor((b / CONTOUR_BINS) * activeFrames);
    const iEnd = Math.max(iStart + 1, Math.floor(((b + 1) / CONTOUR_BINS) * activeFrames));
    let rmsSum = 0;
    const binPitches: number[] = [];

    for (let i = iStart; i < Math.min(iEnd, activeFrames); i++) {
      rmsSum += activeRms[i];
      const hz = activePitchRaw[i];
      if (hz !== null && medianPitchHz !== null) {
        const st = 12 * Math.log2(hz / medianPitchHz);
        if (st >= -11 && st <= 11) binPitches.push(st);
      }
    }
    const count = Math.max(1, Math.min(iEnd, activeFrames) - iStart);
    const avgRms = rmsSum / count;
    energyContour.push(Number(clamp(avgRms / normScale, 0, 1).toFixed(3)));

    if (binPitches.length > 0) {
      binPitches.sort((a, b2) => a - b2);
      pitchContourSt.push(Number(percentile(binPitches, 0.5).toFixed(2)));
    } else {
      pitchContourSt.push(null);
    }
  }

  // Smooth 3-point moving average on energy to extract clean emphasis peaks
  const smoothEnergy = energyContour.map((v, i, arr) => {
    const prev = arr[Math.max(0, i - 1)];
    const next = arr[Math.min(arr.length - 1, i + 1)];
    return (prev + v * 2 + next) / 4;
  });
  const emphasisPeaks: number[] = [];
  for (let i = 2; i < smoothEnergy.length - 2; i++) {
    if (
      smoothEnergy[i] >= 0.62 &&
      smoothEnergy[i] > smoothEnergy[i - 1] &&
      smoothEnergy[i] >= smoothEnergy[i + 1]
    ) {
      const pos = Number((i / CONTOUR_BINS).toFixed(3));
      if (emphasisPeaks.length === 0 || pos - emphasisPeaks[emphasisPeaks.length - 1] >= 0.08) {
        emphasisPeaks.push(pos);
      }
    }
  }

  const scriptWords = tokenize(scriptText).length;
  const estimatedWpm =
    scriptWords >= 3 && activeDurationSec >= 1.2
      ? Math.round(scriptWords / (activeDurationSec / 60))
      : null;

  return {
    totalDurationSec: Number(totalDurationSec.toFixed(2)),
    activeDurationSec,
    startSec,
    endSec,
    estimatedWpm,
    medianPitchHz,
    pitchRangeSt,
    voicedRatio,
    speechDutyCycle,
    pauseCount: pauses.length,
    pauses,
    energyContour,
    pitchContourSt,
    emphasisPeaks: emphasisPeaks.slice(0, 12),
  };
}

/**
 * Browser helper: decodes any audio Blob (MP3, WAV, M4A, OGG, WebM) into PCM
 * and extracts its speaker acoustic profile locally with zero server upload.
 */
export async function extractAudioProfileFromBlob(
  blob: Blob,
  scriptText: string = ""
): Promise<SpeakerAcousticProfile> {
  if (typeof window === "undefined") {
    throw new Error("Audio decoding requires a browser environment.");
  }
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error("Web Audio API is unavailable in this browser.");

  const arrBuf = await blob.arrayBuffer();
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
    const len = decoded.length;
    const channels = decoded.numberOfChannels;
    const mono = new Float32Array(len);
    for (let c = 0; c < channels; c++) {
      const chData = decoded.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += chData[i] / channels;
    }
    return analyzePcmProfile(mono, decoded.sampleRate, scriptText);
  } finally {
    try {
      await ctx.close();
    } catch {
      /* noop */
    }
  }
}

// ---------- Delivery Matching Math ----------

function pearsonCorr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i++) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 1e-6 ? clamp(num / den, -1, 1) : 0;
}

/**
 * Compares the user's shadowing recording against the reference speaker's acoustic profile.
 * Honest, deterministic, gender/pitch-invariant delivery scoring.
 */
export function compareShadowTake(params: {
  reference: SpeakerAcousticProfile;
  attempt: SpeakerAcousticProfile;
  scriptText?: string;
  attemptTranscript?: string;
}): ShadowComparison {
  const { reference: ref, attempt: att, scriptText = "", attemptTranscript = "" } = params;

  // 1. Pace & Timing Match (25%)
  const refDur = Math.max(0.5, ref.activeDurationSec);
  const attDur = Math.max(0.5, att.activeDurationSec);
  // ratio > 100 means user finished faster than speaker; < 100 means slower
  const paceRatioPct = Math.round((refDur / attDur) * 100);
  const durRelErr = Math.abs(attDur - refDur) / refDur;
  const paceScore = Math.round(clamp(100 - Math.max(0, durRelErr - 0.04) * 135, 18, 100));

  // 2. Pause & Rhythm Sync (25%)
  // Compare binary active-speech masks across 64 bins with small +/-3 bin lag tolerance
  const refActive = ref.energyContour.map((e) => (e >= 0.16 ? 1 : 0));
  const attActive = att.energyContour.map((e) => (e >= 0.16 ? 1 : 0));
  let bestMaskMatch = 0;
  for (let lag = -3; lag <= 3; lag++) {
    let same = 0;
    let total = 0;
    for (let i = 0; i < CONTOUR_BINS; i++) {
      const j = i + lag;
      if (j < 0 || j >= CONTOUR_BINS) continue;
      if (refActive[i] === attActive[j]) same++;
      total++;
    }
    if (total > 0) bestMaskMatch = Math.max(bestMaskMatch, same / total);
  }
  const dutyDiff = Math.abs(ref.speechDutyCycle - att.speechDutyCycle);
  const pauseCountDiff = Math.abs(ref.pauseCount - att.pauseCount);
  const pauseCountScore = clamp(100 - pauseCountDiff * 14, 30, 100);
  const dutyScore = clamp(100 - dutyDiff * 180, 25, 100);
  const maskScore = clamp(bestMaskMatch * 100, 20, 100);
  const rhythmScore = Math.round(maskScore * 0.5 + dutyScore * 0.3 + pauseCountScore * 0.2);

  // 3. Intonation / Pitch Melody Match (25%) — speaker-normalized semitones
  let bestIntonation = -1;
  let bestOverlap = 0;
  for (let lag = -4; lag <= 4; lag++) {
    const refVals: number[] = [];
    const attVals: number[] = [];
    for (let i = 0; i < CONTOUR_BINS; i++) {
      const j = i + lag;
      if (j < 0 || j >= CONTOUR_BINS) continue;
      const rv = ref.pitchContourSt[i];
      const av = att.pitchContourSt[j];
      if (rv !== null && av !== null) {
        refVals.push(rv);
        attVals.push(av);
      }
    }
    if (refVals.length >= 6) {
      const corr = pearsonCorr(refVals, attVals); // -1..1
      const corrScore = clamp(((corr + 1) / 2) * 100, 0, 100);
      let mae = 0;
      for (let k = 0; k < refVals.length; k++) mae += Math.abs(refVals[k] - attVals[k]);
      mae /= refVals.length;
      const maeScore = clamp(100 - mae * 15, 10, 100);
      const spanDiff = Math.abs(ref.pitchRangeSt - att.pitchRangeSt);
      const spanScore = clamp(100 - spanDiff * 11, 25, 100);
      const combined = corrScore * 0.45 + maeScore * 0.35 + spanScore * 0.2;
      if (combined > bestIntonation) {
        bestIntonation = combined;
        bestOverlap = refVals.length;
      }
    }
  }
  const pitchSpanDiffSt = Number((att.pitchRangeSt - ref.pitchRangeSt).toFixed(1));
  const intonationScore =
    bestIntonation >= 0
      ? Math.round(clamp(bestIntonation, 15, 100))
      : Math.round(clamp(72 - Math.abs(pitchSpanDiffSt) * 12, 25, 80));

  // 4. Energy & Emphasis Match (25%)
  let bestEmphasis = 20;
  for (let lag = -3; lag <= 3; lag++) {
    const rArr: number[] = [];
    const aArr: number[] = [];
    for (let i = 0; i < CONTOUR_BINS; i++) {
      const j = i + lag;
      if (j < 0 || j >= CONTOUR_BINS) continue;
      rArr.push(ref.energyContour[i]);
      aArr.push(att.energyContour[j]);
    }
    const corr = pearsonCorr(rArr, aArr);
    const corrScore = clamp(((corr + 1) / 2) * 100, 0, 100);
    let mae = 0;
    for (let k = 0; k < rArr.length; k++) mae += Math.abs(rArr[k] - aArr[k]);
    mae /= Math.max(1, rArr.length);
    const maeScore = clamp(100 - mae * 165, 15, 100);
    bestEmphasis = Math.max(bestEmphasis, corrScore * 0.55 + maeScore * 0.45);
  }
  const emphasisScore = Math.round(clamp(bestEmphasis, 15, 100));

  // Optional transcript accuracy (never fabricated when no transcript captured)
  let wordMatchPct: number | null = null;
  if (scriptText.trim() && attemptTranscript.trim()) {
    const cmp = compareWords(scriptText, attemptTranscript);
    wordMatchPct = Math.round(cmp.coverage * 100);
  }

  const overallMatch = Math.round(
    paceScore * 0.25 + rhythmScore * 0.25 + intonationScore * 0.25 + emphasisScore * 0.25
  );

  // Honest, evidence-backed coaching insights
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (paceScore >= 82) {
    strengths.push(
      `Pace matched the speaker closely (${attDur.toFixed(1)}s vs. speaker's ${refDur.toFixed(1)}s).`
    );
  } else if (paceRatioPct > 110) {
    improvements.push(
      `You spoke ~${paceRatioPct - 100}% faster than the speaker (${attDur.toFixed(1)}s vs. ${refDur.toFixed(1)}s). Stretch stressed vowels slightly and let pauses breathe.`
    );
  } else {
    improvements.push(
      `You spoke ~${100 - paceRatioPct}% slower than the speaker (${attDur.toFixed(1)}s vs. ${refDur.toFixed(1)}s). Practice at 0.85× first, then glide into 1.0×.`
    );
  }

  if (rhythmScore >= 80) {
    strengths.push(
      `Clean phrasing & pause sync (${att.pauseCount} pause${att.pauseCount === 1 ? "" : "s"} vs. speaker's ${ref.pauseCount}).`
    );
  } else if (att.pauseCount < ref.pauseCount) {
    improvements.push(
      `You skipped pauses (${att.pauseCount} vs. speaker's ${ref.pauseCount}). Watch the energy drops on the graph and copy the speaker's silent beats.`
    );
  } else if (att.pauseCount > ref.pauseCount + 1) {
    improvements.push(
      `You paused more often than the speaker (${att.pauseCount} vs. ${ref.pauseCount}). Link short phrases together on one smooth breath.`
    );
  } else {
    improvements.push(
      `Pause timing drifted slightly from the speaker's cadence — replay Reference vs. My Take side by side to lock in the phrasing.`
    );
  }

  if (intonationScore >= 78 && bestOverlap >= 6) {
    strengths.push(
      `Strong pitch melody match (${intonationScore}/100) — your rising and falling tone tracked the speaker's expression.`
    );
  } else if (pitchSpanDiffSt <= -2) {
    improvements.push(
      `Your delivery sounded flatter than the speaker (your pitch span ${att.pitchRangeSt} st vs. speaker's ${ref.pitchRangeSt} st). Lift your tone higher on key emphasis words.`
    );
  } else if (pitchSpanDiffSt >= 3) {
    improvements.push(
      `Your pitch jumped wider than the speaker's (${att.pitchRangeSt} st vs. ${ref.pitchRangeSt} st). Keep your melody slightly calmer and more grounded.`
    );
  } else {
    improvements.push(
      `Compare the Pitch Melody graph below: copy where the speaker's line rises on key words and drops smoothly at sentence endings.`
    );
  }

  if (emphasisScore >= 78) {
    strengths.push(`Good vocal energy & emphasis alignment (${emphasisScore}/100) on stressed syllables.`);
  } else {
    improvements.push(
      `Match the speaker's emphasis peaks: add gentle vocal weight on their loudest words and soften connecting words.`
    );
  }

  if (wordMatchPct !== null && wordMatchPct < 80) {
    improvements.push(
      `Transcript matched ${wordMatchPct}% of script words — practice at 0.85× speed until every word feels effortless.`
    );
  }

  if (strengths.length === 0) {
    strengths.push(
      `Captured a full ${attDur.toFixed(1)}s shadow take — replay Reference vs. My Take back-to-back to hear the exact rhythm differences.`
    );
  }

  const summary =
    overallMatch >= 85
      ? `Excellent speaker match (${overallMatch}/100)! Your timing, pauses, and melody track the reference delivery closely.`
      : overallMatch >= 70
      ? `Solid delivery match (${overallMatch}/100). Focus on the top cue below and run one more take to tighten alignment.`
      : `Good first calibration (${overallMatch}/100). Loop the reference at 0.85× speed, listen for their pauses and stressed words, then record again.`;

  return {
    overallMatch,
    paceScore,
    rhythmScore,
    intonationScore,
    emphasisScore,
    wordMatchPct,
    paceRatioPct,
    pitchSpanDiffSt,
    strengths,
    improvements,
    summary,
  };
}
