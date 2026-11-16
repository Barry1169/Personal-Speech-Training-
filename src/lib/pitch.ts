import type { PitchSample, PitchStats } from "./types";

/**
 * Estimates fundamental frequency (F0) from a time-domain PCM audio frame
 * using normalized autocorrelation (McLeod-style NSDF peak picking).
 *
 * Human conversational speech F0 typically lies between 75 Hz and 380 Hz.
 * Returns null for silence, unvoiced consonants (frication), or ambiguous frames.
 */
export function detectPitchHz(
  buf: Float32Array,
  sampleRate: number,
  minHz = 75,
  maxHz = 380
): { hz: number; clarity: number } | null {
  const n = buf.length;
  if (n < 512 || sampleRate < 8000) return null;

  // Remove DC offset & check RMS energy gate
  let mean = 0;
  for (let i = 0; i < n; i++) mean += buf[i];
  mean /= n;

  let energy = 0;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = buf[i] - mean;
    x[i] = v;
    energy += v * v;
  }
  const rms = Math.sqrt(energy / n);
  if (rms < 0.015) return null; // unvoiced / silence

  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / minHz));
  if (maxLag <= minLag) return null;

  // Compute Normalized Square Difference Function (NSDF)
  // nsdf(tau) = 2 * sum(x[i] * x[i+tau]) / (sum(x[i]^2) + sum(x[i+tau]^2))
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0;
    let m = 0;
    const limit = n - lag;
    for (let i = 0; i < limit; i++) {
      const a = x[i];
      const b = x[i + lag];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  // Find key local maxima after a positive-going region
  // Prefer the first strong peak >= 0.85 * globalMax to avoid sub-harmonic (octave-down) errors
  let globalMax = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (nsdf[lag] > globalMax) globalMax = nsdf[lag];
  }
  if (globalMax < 0.55) return null; // too noisy / unvoiced

  const threshold = Math.max(0.55, globalMax * 0.85);
  let bestLag = -1;
  let bestVal = 0;

  let inPositive = false;
  let curPeakLag = -1;
  let curPeakVal = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    const v = nsdf[lag];
    if (v > 0) {
      inPositive = true;
      if (v > curPeakVal) {
        curPeakVal = v;
        curPeakLag = lag;
      }
    } else if (inPositive) {
      if (curPeakVal >= threshold) {
        bestLag = curPeakLag;
        bestVal = curPeakVal;
        break;
      }
      inPositive = false;
      curPeakLag = -1;
      curPeakVal = 0;
    }
  }

  if (bestLag === -1 && curPeakVal >= threshold) {
    bestLag = curPeakLag;
    bestVal = curPeakVal;
  }

  if (bestLag < minLag || bestLag > maxLag) return null;

  // Parabolic interpolation around bestLag for sub-sample precision
  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const y0 = nsdf[bestLag - 1];
    const y1 = nsdf[bestLag];
    const y2 = nsdf[bestLag + 1];
    const denom = 2 * (y0 - 2 * y1 + y2);
    if (Math.abs(denom) > 1e-6) {
      const delta = (y0 - y2) / denom;
      if (Math.abs(delta) < 1) refinedLag = bestLag + delta;
    }
  }

  const hz = sampleRate / refinedLag;
  if (hz < minHz || hz > maxHz || !Number.isFinite(hz)) return null;
  return { hz, clarity: Math.min(1, Math.max(0, bestVal)) };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Summarizes voiced pitch samples into voice-independent semitone metrics.
 * Filters single-frame octave glitches using median-based outlier rejection.
 */
export function summarizePitch(samples: PitchSample[]): PitchStats | null {
  const valid = samples.filter((s) => s.hz >= 75 && s.hz <= 380 && s.clarity >= 0.55);
  if (valid.length < 6) return null;

  const rawHz = valid.map((s) => s.hz).sort((a, b) => a - b);
  const rawMedian = percentile(rawHz, 0.5);

  // Reject impossible > 1.7x or < 0.55x octave tracking artifacts
  const cleaned = rawHz.filter((hz) => hz >= rawMedian * 0.55 && hz <= rawMedian * 1.75);
  if (cleaned.length < 5) return null;

  const medianHz = Math.round(percentile(cleaned, 0.5));
  const p10Hz = Math.round(percentile(cleaned, 0.1));
  const p90Hz = Math.round(percentile(cleaned, 0.9));
  const minHz = Math.round(cleaned[0]);
  const maxHz = Math.round(cleaned[cleaned.length - 1]);

  const semitoneRange = p10Hz > 0 ? Number((12 * Math.log2(p90Hz / p10Hz)).toFixed(2)) : 0;
  const semis = cleaned.map((hz) => 12 * Math.log2(hz / medianHz));
  const meanSemi = semis.reduce((a, b) => a + b, 0) / semis.length;
  const variance = semis.reduce((a, b) => a + (b - meanSemi) ** 2, 0) / semis.length;
  const semitoneStd = Number(Math.sqrt(variance).toFixed(2));

  return {
    medianHz,
    minHz,
    maxHz,
    p10Hz,
    p90Hz,
    semitoneRange,
    semitoneStd,
    voicedFrames: cleaned.length,
  };
}
