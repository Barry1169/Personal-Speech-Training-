import type { Recording, SelfScores, SkillKey } from "./types";
import { dateKey } from "./types";

export interface SkillScore {
  key: SkillKey;
  label: string;
  score: number; // 0..5
  note: string;
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  clarity: "Clarity",
  pronunciation: "Pronunciation",
  fluency: "Fluency",
  pacing: "Pacing",
  vocalControl: "Vocal control",
};

const clamp = (v: number, lo = 0.25, hi = 5) => Math.min(hi, Math.max(lo, v));

function selfAvg(s: SelfScores | null, keys: SkillKey[]): number | null {
  if (!s) return null;
  const vals = keys.map((k) => s[k]).filter((v) => v > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function scoreSkills(
  rec: Pick<Recording, "analysis" | "self">
): SkillScore[] {
  const a = rec.analysis;
  const self = rec.self;
  const scores: SkillScore[] = [];

  // Pacing: wpm band 120–150 ideal
  let pace = 0.25;
  let paceNote = "Not enough speech detected to estimate pace.";
  if (a.wpm != null) {
    if (a.wpm < 90) { pace = 1.2; paceNote = `${a.wpm} wpm is below a conversational pace — push slightly faster.`; }
    else if (a.wpm < 120) { pace = 3.2; paceNote = `${a.wpm} wpm: careful and clear, but a little slow for natural talk.`; }
    else if (a.wpm <= 150) { pace = 4.8; paceNote = `${a.wpm} wpm: in the solid 120–150 range.`; }
    else if (a.wpm <= 170) { pace = 3.4; paceNote = `${a.wpm} wpm: quick — make sure the consonants are still landing.`; }
    else { pace = 1.6; paceNote = `${a.wpm} wpm: this is fast. Slow down on the important words.`; }
  }
  const selfPace = selfAvg(self, ["pacing"]);
  scores.push({ key: "pacing", label: SKILL_LABELS.pacing, score: clamp(selfPace != null ? pace * 0.6 + selfPace * 0.4 : pace), note: selfPace != null ? `${paceNote} Self-score: ${selfPace.toFixed(1)}/5.` : paceNote });

  // Fluency: fillers per minute + repeated words
  const min = Math.max(1, rec ? a.wordCount / Math.max(1, a.wpm ?? 130) : 1);
  const perMin = a.wordCount > 0 ? a.fillerTotal / min : a.fillerTotal;
  let flu = 4.8;
  const fluNotes: string[] = [];
  if (a.fillerTotal === 0 && a.wordCount > 0) fluNotes.push("No common filler words detected — clean tape.");
  if (perMin > 1.5) { flu = Math.max(0.5, flu - 2.4); fluNotes.push(`${a.fillerTotal} filler word(s) in this take (~${perMin.toFixed(1)}/min).`); }
  else if (perMin > 0.6) { flu = Math.max(1.5, flu - 1.2); fluNotes.push(`${a.fillerTotal} filler word(s) detected.`); }
  else if (a.fillerTotal > 0) { flu = Math.max(2.5, flu - 0.5); fluNotes.push(`${a.fillerTotal} filler word(s) — small leak, plug it with the silent beat.`); }
  if (a.repeats.length > 0) {
    flu = Math.max(0.75, flu - Math.min(1.5, a.repeats.length * 0.4));
    fluNotes.push(`Repeated word(s): ${a.repeats.slice(0, 4).join(", ")}.`);
  }
  if (a.wordCount === 0) fluNotes.push("No transcript available — score is self-report based.");
  const selfFlu = selfAvg(self, ["fluency"]);
  scores.push({ key: "fluency", label: SKILL_LABELS.fluency, score: clamp(selfFlu != null ? flu * 0.6 + selfFlu * 0.4 : flu), note: fluNotes.join(" ") });

  // Clarity: script coverage + self
  let clar = 3.0;
  let clarNote = "No script set, so clarity is estimated from self-report.";
  if (a.coverage != null) {
    clar = 0.5 + (a.coverage / 100) * 4.5;
    clarNote = `You matched ${a.coverage}% of the script words in order. ${a.coverage >= 90 ? "Strong coverage." : a.coverage >= 70 ? "Good, with a few gaps." : "Significant gaps — check the comparison below."}`;
  }
  const selfClar = selfAvg(self, ["clarity"]);
  scores.push({ key: "clarity", label: SKILL_LABELS.clarity, score: clamp(selfClar != null ? clar * 0.6 + selfClar * 0.4 : clar), note: clarNote });

  // Pronunciation: self only — transcription is NOT pronunciation scoring
  const pron = selfAvg(self, ["pronunciation"]);
  scores.push({
    key: "pronunciation",
    label: SKILL_LABELS.pronunciation,
    score: clamp(pron ?? 0.25),
    note: pron != null
      ? `Your self-score (${pron.toFixed(1)}/5). Note: speech-to-text accuracy is not pronunciation accuracy — a word can be mis-transcribed for reasons unrelated to how you pronounced it.`
      : "Score this yourself after replaying. Transcription cannot reliably judge pronunciation.",
  });

  // Vocal control: volume CV + self
  let vc = 3.0;
  let vcNote = "No volume data captured.";
  if (a.volume) {
    const { cv, activeRatio } = a.volume;
    vc = cv < 0.18 ? 4.8 : cv < 0.3 ? 4.2 : cv < 0.45 ? 3.2 : cv < 0.6 ? 2.2 : 1.2;
    vcNote = `Volume ${cv < 0.18 ? "steady" : cv < 0.3 ? "fairly steady" : cv < 0.45 ? "varied" : "uneven"} (variation index ${cv.toFixed(2)}), speaking ${Math.round(activeRatio * 100)}% of the time.`;
  }
  const selfVc = selfAvg(self, ["vocalControl"]);
  scores.push({ key: "vocalControl", label: SKILL_LABELS.vocalControl, score: clamp(selfVc != null ? vc * 0.6 + selfVc * 0.4 : vc), note: vcNote });

  return scores.sort((x, y) => x.score - y.score);
}

export function topWeaknesses(scores: SkillScore[], n = 3): SkillScore[] {
  return scores.slice(0, n);
}

const WEAKNESS_EXERCISES: Record<SkillKey, { categories: string[]; ids: string[]; tip: string }> = {
  pacing: { categories: ["pacing"], ids: ["bi-speedladder", "bi-slowdown"], tip: "Work the Speed Ladder, then apply the deliberate slow-down on key words." },
  fluency: { categories: ["fluency"], ids: ["bi-silentbeat", "bi-60sec", "bi-norestart"], tip: "Do the Silent Beat drill, then a 60-second nonstop take." },
  clarity: { categories: ["clarity", "pronunciation"], ids: ["bi-sz", "bi-tdn", "bi-bpvw", "bi-minpairs"], tip: "Drill the articulation pairs, then re-read today's passage at 90 wpm." },
  pronunciation: { categories: ["pronunciation"], ids: ["bi-minpairs", "bi-vowels", "bi-lr", "bi-th"], tip: "Do Minimal Pairs Sprint, then Shadowing mode to copy native rhythm." },
  vocalControl: { categories: ["breathing"], ids: ["bi-breath-346", "bi-volume", "bi-breathmarks"], tip: "6–10 breathing cycles, then a Volume Consistency Check recording." },
};

export function recommendExercises(
  weak: SkillScore[],
  available: { id: string; name: string; category: string }[]
): { title: string; reason: string }[] {
  const out: { title: string; reason: string }[] = [];
  for (const w of weak) {
    const rec = WEAKNESS_EXERCISES[w.key];
    for (const id of rec.ids) {
      const ex = available.find((e) => e.id === id);
      if (ex && !out.some((o) => o.title === ex.name)) {
        out.push({ title: ex.name, reason: `Targets ${w.label.toLowerCase()} — ${rec.tip}` });
      }
    }
    // also surface any user exercise in the matching categories
    for (const cat of rec.categories) {
      const userEx = available.find((e) => e.category === cat && !out.some((o) => o.title === e.name));
      if (userEx) out.push({ title: userEx.name, reason: `Your library exercise in "${cat}".` });
    }
  }
  return out.slice(0, 6);
}

// ---- Milestone comparison (Day 1 vs Day 7 vs Day 30 …) ----

export interface Milestone {
  label: string;
  rec: Recording;
}

export function milestoneRecordings(recordings: Recording[]): Milestone[] {
  if (recordings.length === 0) return [];
  const sorted = [...recordings].sort((a, b) => a.createdAt - b.createdAt);
  const first = sorted[0].createdAt;
  const day = 24 * 3600 * 1000;
  const targets = [0, 6, 29, 59, 89];
  const out: Milestone[] = [];
  for (const t of targets) {
    let best: Recording | null = null;
    let bestDist = Infinity;
    for (const r of sorted) {
      const d = Math.abs(r.createdAt - (first + t * day));
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    if (best && bestDist < 2.5 * day && !out.some((m) => m.rec.id === best.id)) {
      out.push({ label: t === 0 ? "Day 1" : `Day ${t + 1}`, rec: best });
    }
  }
  return out;
}

export function compareRecordings(a: Recording, b: Recording): string[] {
  const lines: string[] = [];
  const wpmDelta = a.analysis.wpm != null && b.analysis.wpm != null ? b.analysis.wpm - a.analysis.wpm : null;
  if (wpmDelta != null) lines.push(`Pacing: ${a.analysis.wpm} → ${b.analysis.wpm} wpm (${wpmDelta >= 0 ? "+" : ""}${wpmDelta}).`);
  const fillDelta = b.analysis.fillerTotal - a.analysis.fillerTotal;
  lines.push(`Filler words: ${a.analysis.fillerTotal} → ${b.analysis.fillerTotal} (${fillDelta >= 0 ? "+" : ""}${fillDelta}).`);
  const pauseDelta = b.analysis.longPauses - a.analysis.longPauses;
  lines.push(`Long pauses (>1.2s): ${a.analysis.longPauses} → ${b.analysis.longPauses} (${pauseDelta >= 0 ? "+" : ""}${pauseDelta}).`);
  if (a.self && b.self) {
    const av = Object.values(a.self).filter((v) => v > 0);
    const bv = Object.values(b.self).filter((v) => v > 0);
    if (av.length && bv.length) {
      const aAvg = av.reduce((x, y) => x + y, 0) / av.length;
      const bAvg = bv.reduce((x, y) => x + y, 0) / bv.length;
      lines.push(`Self-assessment average: ${aAvg.toFixed(1)} → ${bAvg.toFixed(1)} / 5.`);
    }
  }
  return lines;
}

export function personalizedRoutine(weak: SkillScore[]): { step: string; minutes: number }[] {
  const steps: { step: string; minutes: number }[] = [
    { step: "3-4-6 breathing: 6 cycles in the Breathing Trainer", minutes: 3 },
  ];
  const focusMap: Record<SkillKey, { step: string; minutes: number }> = {
    pacing: { step: "Pacing: Speed Ladder (80 / 130 / 100 wpm) on a short passage", minutes: 6 },
    fluency: { step: "Fluency: Silent Beat 2-min talk + 60s nonstop on a random object", minutes: 6 },
    clarity: { step: "Clarity: articulation drill (S/Z or T/D/N), then passage at 90 wpm", minutes: 6 },
    pronunciation: { step: "Pronunciation: Minimal Pairs Sprint + 5 shadowing sentences", minutes: 6 },
    vocalControl: { step: "Vocal control: 8 breathing cycles + 60s volume consistency recording", minutes: 5 },
  };
  for (const w of weak) steps.push(focusMap[w.key]);
  steps.push({ step: "Impromptu: 30s prep, 90s talk on today's topic — record it", minutes: 4 });
  return steps;
}

// ---- Badges ----

export interface Badge {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
}

export interface StatsPack {
  totalSec: number;
  sessionCount: number;
  recordingCount: number;
  currentStreak: number;
  bestStreak: number;
  bestAvgScore: number; // best 5-skill average from recordings
  maxWpm: number;
  minFillerRecording: number;
  daysPracticed: number;
}

export function computeBadges(s: StatsPack): Badge[] {
  const b = (id: string, name: string, desc: string, earned: boolean): Badge => ({ id, name, desc, earned });
  return [
    b("first-step", "First Step", "Complete your first practice log.", s.sessionCount > 0),
    b("first-rec", "On Tape", "Save your first recording.", s.recordingCount > 0),
    b("rec-10", "Archivist", "Save 10 recordings.", s.recordingCount >= 10),
    b("streak-3", "Warming Up", "3-day practice streak.", s.currentStreak >= 3 || s.bestStreak >= 3),
    b("streak-7", "One Week Strong", "7-day practice streak.", s.bestStreak >= 7),
    b("streak-30", "Month in Motion", "30-day practice streak.", s.bestStreak >= 30),
    b("min-100", "Century Minute", "100 total practice minutes.", s.totalSec >= 6000),
    b("min-300", "Half-Hour Club ×10", "300 total practice minutes.", s.totalSec >= 18000),
    b("clean-tape", "Clean Tape", "A recording with zero detected filler words (50+ words).", s.minFillerRecording >= 50),
    b("pace-130", "In the Pocket", "Hit 120–150 wpm in a recording.", s.maxWpm >= 120 && s.maxWpm <= 150),
    b("score-4", "Rising Voice", "Average 4.0+/5 self-assessment on one recording.", s.bestAvgScore >= 4),
    b("days-14", "Two-Week Regular", "Practiced on 14 different days.", s.daysPracticed >= 14),
  ];
}

export function streaksFromDates(dates: string[]): { current: number; best: number } {
  const set = new Set(dates);
  let best = 0;
  // best: scan sorted
  const sorted = [...set].sort();
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const p = new Date(prev + "T00:00:00");
      const c = new Date(d + "T00:00:00");
      run = c.getTime() - p.getTime() === 86400000 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  // current: back from today (or yesterday if today not done yet)
  let current = 0;
  const cursor = new Date();
  const keyOf = (d: Date) => dateKey(d.getTime());
  if (!set.has(keyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(keyOf(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, best };
}

export function weeklyReport(
  recordings: Recording[],
  logs: { date: string; seconds: number }[],
  skillAverages: Record<SkillKey, number | null>
): string {
  const day = 86400000;
  const now = Date.now();
  const weekSec = logs.filter((l) => now - new Date(l.date + "T00:00:00").getTime() < 7 * day)
    .reduce((a, l) => a + l.seconds, 0);
  const weekRecs = recordings.filter((r) => now - r.createdAt < 7 * day);
  const lines: string[] = [];
  lines.push(`# Weekly speech report — week of ${new Date(now - 6 * day).toLocaleDateString()}`);
  lines.push("");
  lines.push(`- Practice time: ${(weekSec / 60).toFixed(0)} minutes across ${new Set(logs.filter((l) => now - new Date(l.date + "T00:00:00").getTime() < 7 * day).map((l) => l.date)).size} day(s)`);
  lines.push(`- Recordings: ${weekRecs.length}`);
  if (weekRecs.length > 0) {
    const avgWpm = Math.round(weekRecs.reduce((a, r) => a + (r.analysis.wpm ?? 0), 0) / weekRecs.length);
    const avgFill = (weekRecs.reduce((a, r) => a + r.analysis.fillerTotal, 0) / weekRecs.length).toFixed(1);
    lines.push(`- Average pace: ${avgWpm} wpm · Average filler words: ${avgFill}`);
  }
  const skills = (Object.keys(skillAverages) as SkillKey[])
    .filter((k) => skillAverages[k] != null)
    .map((k) => `${SKILL_LABELS[k]} ${(skillAverages[k] as number).toFixed(1)}/5`)
    .join(" · ");
  if (skills) lines.push(`- Self-assessment (all-time avg): ${skills}`);
  const weak = (Object.keys(skillAverages) as SkillKey[])
    .filter((k) => skillAverages[k] != null)
    .sort((a, b) => (skillAverages[a] as number) - (skillAverages[b] as number))[0];
  if (weak) lines.push(`- Focus next week: ${SKILL_LABELS[weak]}`);
  lines.push("");
  lines.push("_Generated by SpeechCoach — a personal, local-first speech training app._");
  return lines.join("\n");
}
