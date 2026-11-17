import {
  COACH_SKILL_LABELS,
  GOAL_OPTIONS,
  dateKey,
  type CoachPlan,
  type CoachSkillKey,
  type CoachedExercise,
  type DetailedAssessment,
  type Difficulty,
  type PlanPriority,
  type PracticeLog,
  type PracticeMaterialType,
  type Recording,
  type SessionDebrief,
  type SkillKey,
  type UserProfile,
} from "./types";
import { COACHED_MATERIALS, getCoachedExerciseById } from "./materials";
import { compareWords, computeDetailedAssessment } from "./analytics";
import { SKILL_LABELS } from "./coach";

export interface DailySessionPlan {
  date: string;
  totalMinutes: number;
  difficulty: Difficulty;
  adaptiveLevel: number;
  coachRationale: string;
  focusLabel: string;
  breathingWarmup: {
    title: string;
    minutes: number;
    cycles: number;
    patternLabel: string;
    instructions: string;
  };
  exercises: CoachedExercise[];
}

export interface SkillStanding {
  skill: CoachSkillKey;
  label: string;
  score: number | null; // 0..100
  samples: number;
  evidence: string;
}

export interface CommonMistakesReport {
  topFillers: { word: string; count: number }[];
  topRepeats: { word: string; count: number }[];
  topMissedWords: { word: string; count: number }[];
  paceTendency: { label: string; detail: string; avgWpm: number | null };
  pauseTendency: { label: string; detail: string };
}

export interface ImprovementSummary {
  currentAvg: number | null;
  baselineAvg: number | null;
  delta: number | null; // positive = improvement
  recordingCount: number;
}

export function difficultyFromLevel(level: number): Difficulty {
  if (level <= 2) return "beginner";
  if (level <= 4) return "intermediate";
  return "advanced";
}

export function levelFromDifficulty(diff: Difficulty): number {
  if (diff === "beginner") return 1;
  if (diff === "intermediate") return 3;
  return 5;
}

export function targetBandForLevel(level: number, stammerFocus = false): { min: number; max: number } {
  if (stammerFocus) {
    // Calm, pressure-free speech rhythm ideal for smooth fluency and preventing blocks
    if (level <= 2) return { min: 98, max: 125 };
    return { min: 105, max: 132 };
  }
  if (level <= 1) return { min: 105, max: 135 };
  if (level === 2) return { min: 112, max: 142 };
  if (level === 3) return { min: 118, max: 148 };
  if (level === 4) return { min: 122, max: 152 };
  return { min: 125, max: 155 };
}

/**
 * Ensures any Recording (including legacy v1/v2 recordings) has a deterministic
 * 100-point DetailedAssessment we can trend and reason over.
 */
export function getRecordingAssessment(rec: Recording): DetailedAssessment {
  if (rec.assessment) return rec.assessment;
  const cmp = rec.scriptText ? compareWords(rec.scriptText, rec.transcript) : null;
  return computeDetailedAssessment({
    analysis: rec.analysis,
    self: rec.self,
    script: rec.scriptText,
    transcript: rec.transcript,
    comparison: cmp,
    durationSec: rec.durationSec,
    targetWpm: rec.targetWpm ?? 130,
  });
}

function buildDailyBlueprint(dailyMinutes: number, topPriority: CoachSkillKey): { slot: string; minutes: number; focus: string }[] {
  const focusName = COACH_SKILL_LABELS[topPriority];
  if (dailyMinutes <= 10) {
    return [
      { slot: "Breath Warm-up", minutes: 2, focus: "4 quick 3-4-6 cycles to steady your breath" },
      { slot: "Priority Drill", minutes: 4, focus: `Focused ${focusName.toLowerCase()} practice` },
      { slot: "Coached Speak & Record", minutes: 4, focus: "1 short coached material with instant assessment" },
    ];
  }
  if (dailyMinutes <= 15) {
    return [
      { slot: "Breath Warm-up", minutes: 2, focus: "5 cycles of 3-4-6 diaphragmatic breathing" },
      { slot: "Articulation / Precision", minutes: 4, focus: `Targeted ${focusName.toLowerCase()} drill` },
      { slot: "Coached Reading / Story", minutes: 5, focus: "Emphasis, pause marks, and model audio comparison" },
      { slot: "Spontaneous Check-in", minutes: 4, focus: "Short real-world or impromptu recording" },
    ];
  }
  if (dailyMinutes <= 22) {
    return [
      { slot: "Breath & Resonance", minutes: 3, focus: "6 cycles of 3-4-6 breathing + relaxed vocal launch" },
      { slot: "Priority Skill Drill", minutes: 5, focus: `Precision work for ${focusName.toLowerCase()}` },
      { slot: "Coached Passage / Story", minutes: 7, focus: "Full phrasing, emphasis cues, and retry loop" },
      { slot: "Spontaneous Transfer", minutes: 5, focus: "Conversation or impromptu speaking recorded & scored" },
    ];
  }
  return [
    { slot: "Breath & Warm-up", minutes: 4, focus: "8 breathing cycles + lip/tongue looseners" },
    { slot: "Articulation & Control", minutes: 6, focus: `Deep precision reps for ${focusName.toLowerCase()}` },
    { slot: "Extended Reading / Story", minutes: 10, focus: "Long passage or storytelling with model shadowing & retry" },
    { slot: "Spontaneous Mastery", minutes: 8, focus: "Timed impromptu or challenging conversation with debrief" },
  ];
}

const DEFAULT_REASONS: Record<CoachSkillKey, string> = {
  pronunciation: "Clear consonant releases and vowel distinction make every sentence effortless to follow.",
  clarity: "Crisp word endings and steady projection prevent words from trailing off.",
  pacing: "A steady 115–145 WPM cadence stops rushing and gives key points weight.",
  fluency: "Replacing filler words with calm silent beats builds instant poise.",
  pausesBreathing: "Planned breaths at punctuation keep your voice supported and unhurried.",
  expression: "Pitch variety and deliberate stress turn flat reading into engaging speech.",
  projection: "Supported diaphragmatic volume keeps your voice even across full sentences.",
  confidence: "Structured spontaneous frameworks (PREP / STAR) keep you calm without notes.",
};

/**
 * Generates an explainable initial CoachPlan from onboarding answers + optional baseline assessment.
 */
export function buildInitialPlan(profile: UserProfile, baseline?: DetailedAssessment | null): CoachPlan {
  let adaptiveLevel = levelFromDifficulty(profile.experienceLevel);
  if (baseline) {
    if (baseline.overallScore >= 84 && adaptiveLevel < 4) adaptiveLevel += 1;
    else if (baseline.overallScore < 58 && adaptiveLevel > 1) adaptiveLevel -= 1;
  }
  const difficulty = difficultyFromLevel(adaptiveLevel);
  const stammerFocus = profile.goals.includes("stammer_fluency");
  const band = targetBandForLevel(adaptiveLevel, stammerFocus);

  // Score candidate priority skills by combining baseline evidence, self-reported weaknesses, and goals
  const weightMap = new Map<CoachSkillKey, { weight: number; reason: string }>();
  const addWeight = (skill: CoachSkillKey, w: number, reason?: string) => {
    const cur = weightMap.get(skill) ?? { weight: 0, reason: DEFAULT_REASONS[skill] };
    weightMap.set(skill, { weight: cur.weight + w, reason: reason ?? cur.reason });
  };

  for (const w of profile.selfWeaknesses) {
    addWeight(w, 3, `You flagged ${COACH_SKILL_LABELS[w].toLowerCase()} as a key area you want to strengthen.`);
  }
  for (const gId of profile.goals) {
    const g = GOAL_OPTIONS.find((x) => x.id === gId);
    if (g) {
      for (const s of g.skills) addWeight(s, 1.5);
    }
  }

  if (baseline) {
    const dimMap: [CoachSkillKey, number | null, string][] = [
      ["pacing", baseline.dimensions.pace.score, `Initial baseline pace: ${baseline.dimensions.pace.rawDisplay} (${baseline.dimensions.pace.score ?? 0}/100).`],
      ["fluency", baseline.dimensions.fluency.score, `Initial baseline fluency: ${baseline.dimensions.fluency.rawDisplay} (${baseline.dimensions.fluency.score ?? 0}/100).`],
      ["pausesBreathing", baseline.dimensions.pausesBreathing.score, `Initial baseline pauses & breath: ${baseline.dimensions.pausesBreathing.score ?? 0}/100.`],
      ["clarity", baseline.dimensions.clarity.score, `Initial baseline clarity: ${baseline.dimensions.clarity.score ?? 0}/100.`],
      ["expression", baseline.dimensions.expression.score, `Initial baseline voice expression: ${baseline.dimensions.expression.rawDisplay} (${baseline.dimensions.expression.score ?? 0}/100).`],
      ["pronunciation", baseline.dimensions.pronunciation.score, `Initial baseline pronunciation self-check: ${baseline.dimensions.pronunciation.score ?? 0}/100.`],
    ];
    for (const [skill, score, reason] of dimMap) {
      if (score != null && score < 78) {
        addWeight(skill, (85 - score) / 8, reason);
      }
    }
  }

  const ranked = [...weightMap.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3);

  const fallbackSkills: CoachSkillKey[] = ["clarity", "pacing", "fluency"];
  while (ranked.length < 3) {
    const next = fallbackSkills.find((s) => !ranked.some(([k]) => k === s)) ?? "pausesBreathing";
    ranked.push([next, { weight: 1, reason: DEFAULT_REASONS[next] }]);
  }

  const priorityAreas: PlanPriority[] = ranked.map(([skill, info], idx) => ({
    skill,
    reason: info.reason,
    priority: (idx + 1) as 1 | 2 | 3,
  }));

  const adjustmentNote = baseline
    ? `Personalized from your ${profile.experienceLevel} profile and baseline check (${baseline.overallScore}/100). Top focus: ${COACH_SKILL_LABELS[priorityAreas[0].skill]}.`
    : `Personalized from your ${profile.experienceLevel} profile, goals, and ${profile.dailyMinutes}-min daily schedule. Complete a baseline recording anytime to sharpen these targets.`;

  return {
    adaptiveLevel,
    difficulty,
    targetWpmMin: band.min,
    targetWpmMax: band.max,
    priorityAreas,
    dailyBlueprint: buildDailyBlueprint(profile.dailyMinutes, priorityAreas[0].skill),
    lastUpdatedAt: Date.now(),
    adjustmentNote,
  };
}

/**
 * Computes running standings across core speaking domains from real recordings.
 */
export function deriveSkillStandings(recordings: Recording[]): SkillStanding[] {
  const buckets: Record<CoachSkillKey, number[]> = {
    pronunciation: [],
    clarity: [],
    pacing: [],
    fluency: [],
    pausesBreathing: [],
    expression: [],
    projection: [],
    confidence: [],
  };

  for (const r of recordings.slice(0, 20)) {
    const a = getRecordingAssessment(r);
    if (a.dimensions.pronunciation.score != null) buckets.pronunciation.push(a.dimensions.pronunciation.score);
    if (a.dimensions.clarity.score != null) buckets.clarity.push(a.dimensions.clarity.score);
    if (a.dimensions.pace.score != null) buckets.pacing.push(a.dimensions.pace.score);
    if (a.dimensions.fluency.score != null) buckets.fluency.push(a.dimensions.fluency.score);
    if (a.dimensions.pausesBreathing.score != null) buckets.pausesBreathing.push(a.dimensions.pausesBreathing.score);
    if (a.dimensions.expression.score != null) buckets.expression.push(a.dimensions.expression.score);

    // Volume steadiness feeds projection
    if (r.analysis.volume) {
      const cv = r.analysis.volume.cv;
      const proj = Math.round(cv < 0.22 ? 92 : cv < 0.35 ? 82 : cv < 0.48 ? 68 : 54);
      buckets.projection.push(proj);
    }
    // Impromptu / conversation / storytelling fluency & pace feed spontaneous confidence
    if (["impromptu", "fluency", "conversation", "interview", "storytelling"].includes(r.mode) || !r.scriptText) {
      const conf = Math.round((a.dimensions.fluency.displayScore + a.dimensions.pace.displayScore) / 2);
      buckets.confidence.push(conf);
    }
  }

  return (Object.keys(buckets) as CoachSkillKey[]).map((skill) => {
    const vals = buckets[skill];
    const score = vals.length > 0 ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null;
    return {
      skill,
      label: COACH_SKILL_LABELS[skill],
      score,
      samples: vals.length,
      evidence:
        vals.length > 0
          ? `Averaged across ${vals.length} recording${vals.length === 1 ? "" : "s"}`
          : "No recordings scored in this domain yet",
    };
  });
}

function hashDay(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return h;
}

function pickBestMaterial(
  allowedTypes: PracticeMaterialType[],
  difficulty: Difficulty,
  targetSkills: CoachSkillKey[],
  avoidIds: Set<string>,
  seed: number,
  desiredFocusTags: ("stammering" | "youtube")[] = []
): CoachedExercise {
  const candidates = COACHED_MATERIALS.filter((m) => allowedTypes.includes(m.materialType));
  // Rank by difficulty match, specialty focus tags (stammering / YouTube), skill overlap, and freshness
  const scored = candidates.map((m, idx) => {
    let score = 0;
    if (m.difficulty === difficulty) score += 20;
    else if (
      (difficulty === "beginner" && m.difficulty === "intermediate") ||
      (difficulty === "advanced" && m.difficulty === "intermediate") ||
      difficulty === "intermediate"
    ) {
      score += 8;
    }
    if (desiredFocusTags.length > 0 && m.focusTags) {
      for (const tag of desiredFocusTags) {
        if (m.focusTags.includes(tag)) score += 16;
      }
    }
    for (const s of targetSkills) {
      if (m.skills.includes(s)) score += 6;
    }
    if (!avoidIds.has(m.id)) score += 10;
    // Deterministic daily rotation tie-breaker
    const rot = ((seed + idx * 7) % 5) * 0.5;
    return { m, score: score + rot };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].m;
}

/**
 * Selects a calm, structured, time-budgeted Daily Training Session tailored to
 * the user's current weaknesses, difficulty level, and available minutes.
 */
export function selectDailySession(
  profile: UserProfile,
  plan: CoachPlan,
  recordings: Recording[],
  debriefs: SessionDebrief[],
  dateStr: string = dateKey(),
  customWordExercise?: CoachedExercise | null
): DailySessionPlan {
  const seed = hashDay(dateStr);
  const lastDebrief = debriefs[0];
  const recentIds = new Set<string>(lastDebrief?.exerciseIds ?? []);
  const desiredFocusTags: ("stammering" | "youtube")[] = [];
  if (profile.goals.includes("stammer_fluency")) desiredFocusTags.push("stammering");
  if (profile.goals.includes("youtube_creator")) desiredFocusTags.push("youtube");

  // If yesterday's debrief explicitly recommended exercises for today (and it's a new day), honor them!
  const prioritySkills = plan.priorityAreas.map((p) => p.skill);
  const topSkill = prioritySkills[0] ?? "clarity";

  let chosen: CoachedExercise[] = [];
  if (
    lastDebrief &&
    lastDebrief.date !== dateStr &&
    lastDebrief.tomorrowExerciseIds.length >= 2
  ) {
    const resolved = lastDebrief.tomorrowExerciseIds
      .map((id) => getCoachedExerciseById(id))
      .filter((x): x is CoachedExercise => Boolean(x));
    if (resolved.length >= 2) chosen = resolved;
  }

  if (chosen.length === 0) {
    // Slot 1: Precision Foundation (Short Sentence or Tongue Twister / Gentle Onset / Light Contact)
    const precisionTypes: PracticeMaterialType[] =
      topSkill === "pronunciation" || seed % 2 === 1
        ? ["tongue_twister", "short_sentence"]
        : ["short_sentence", "tongue_twister"];
    const ex1 = pickBestMaterial(precisionTypes, plan.difficulty, prioritySkills, recentIds, seed, desiredFocusTags);
    recentIds.add(ex1.id);

    // Slot 2: Practical Reading / Narrative Material (Paragraph, Long Passage, Storytelling, or Conversation)
    const rotatingPools: PracticeMaterialType[][] = [
      ["paragraph", "storytelling"],
      ["conversation", "paragraph"],
      ["long_passage", "storytelling"],
      ["storytelling", "conversation"],
    ];
    const pool = rotatingPools[seed % rotatingPools.length];
    const ex2 = pickBestMaterial(pool, plan.difficulty, prioritySkills, recentIds, seed + 3, desiredFocusTags);
    recentIds.add(ex2.id);

    chosen = [ex1, ex2];

    // Slot 3 (for >= 15 min schedules): Spontaneous Speaking or Applied Conversation Transfer
    if (profile.dailyMinutes >= 15) {
      const transferTypes: PracticeMaterialType[] =
        ex2.materialType === "conversation" ? ["impromptu", "storytelling"] : ["impromptu", "conversation"];
      const ex3 = pickBestMaterial(transferTypes, plan.difficulty, prioritySkills, recentIds, seed + 11, desiredFocusTags);
      chosen.push(ex3);
    }

    // Slot 4 (for >= 25 min schedules): Endurance Reading Passage
    if (profile.dailyMinutes >= 25 && !chosen.some((c) => c.materialType === "long_passage")) {
      const ex4 = pickBestMaterial(["long_passage"], plan.difficulty, prioritySkills, recentIds, seed + 17, desiredFocusTags);
      chosen.push(ex4);
    }
  }

  // Include user's Personal Word Bank custom drill right in today's session without overloading their budget
  if (customWordExercise) {
    if (profile.dailyMinutes <= 10 && chosen.length >= 2) {
      chosen = [chosen[0], customWordExercise];
    } else if (chosen.length >= 3) {
      chosen = [chosen[0], customWordExercise, ...chosen.slice(2)];
    } else {
      chosen = [...chosen, customWordExercise];
    }
  }

  const breathCycles = profile.dailyMinutes <= 10 ? 4 : profile.dailyMinutes <= 20 ? 6 : 8;
  const breathMin = Math.max(2, Math.round((breathCycles * 13) / 60));
  const totalMinutes =
    breathMin + Math.round(chosen.reduce((acc, e) => acc + e.durationSec, 0) / 60);

  const standings = deriveSkillStandings(recordings).filter((s) => s.score != null);
  const measuredWeakest = standings.sort((a, b) => (a.score as number) - (b.score as number))[0];

  const focusSkill = measuredWeakest && (measuredWeakest.score as number) < 76 ? measuredWeakest.skill : topSkill;
  const focusLabel = COACH_SKILL_LABELS[focusSkill];

  const coachRationale = measuredWeakest
    ? `Chosen at Level ${plan.adaptiveLevel} (${plan.difficulty}) for your ${profile.dailyMinutes}-min window. Your recent recordings show ${measuredWeakest.label} (${measuredWeakest.score}/100) has the highest upside right now, so today balances crisp mechanics with real-world speaking.`
    : `Tailored to Level ${plan.adaptiveLevel} (${plan.difficulty}) and your ${profile.dailyMinutes}-min daily budget, focusing on ${focusLabel} without overloading you.`;

  return {
    date: dateStr,
    totalMinutes,
    difficulty: plan.difficulty,
    adaptiveLevel: plan.adaptiveLevel,
    coachRationale,
    focusLabel,
    breathingWarmup: {
      title: "3-4-6 Diaphragmatic Warm-up",
      minutes: breathMin,
      cycles: breathCycles,
      patternLabel: "Inhale 3s · Hold 4s · Exhale 6s",
      instructions:
        "Complete calm nasal inhales and steady soft 'ffff' exhales before your first spoken word. This drops shoulder tension and steadies vocal projection.",
    },
    exercises: chosen,
  };
}

/**
 * Adapts difficulty transparently based on recent scored recordings.
 */
export function evaluateDifficultyAdjustment(
  plan: CoachPlan,
  recentRecordings: Recording[]
): { nextLevel: number; nextDifficulty: Difficulty; note: string } {
  const scored = recentRecordings.slice(0, 3).map((r) => ({
    r,
    a: getRecordingAssessment(r),
  }));

  if (scored.length < 2) {
    return {
      nextLevel: plan.adaptiveLevel,
      nextDifficulty: plan.difficulty,
      note: `Holding at Level ${plan.adaptiveLevel} (${plan.difficulty}) while collecting at least 2 scored recordings to evaluate progression.`,
    };
  }

  const avgScore = Math.round(scored.reduce((acc, x) => acc + x.a.overallScore, 0) / scored.length);
  const avgFillersPerMin =
    scored.reduce((acc, x) => acc + x.r.analysis.fillerTotal / Math.max(0.25, x.r.durationSec / 60), 0) /
    scored.length;

  if (avgScore >= 82 && avgFillersPerMin <= 1.5 && plan.adaptiveLevel < 5) {
    const nextLevel = plan.adaptiveLevel + 1;
    const nextDifficulty = difficultyFromLevel(nextLevel);
    return {
      nextLevel,
      nextDifficulty,
      note: `Level up! Your last ${scored.length} recordings averaged ${avgScore}/100 with low fillers (${avgFillersPerMin.toFixed(
        1
      )}/min). Advancing from Level ${plan.adaptiveLevel} to Level ${nextLevel} (${nextDifficulty}).`,
    };
  }

  if (avgScore < 58 && plan.adaptiveLevel > 1) {
    const nextLevel = plan.adaptiveLevel - 1;
    const nextDifficulty = difficultyFromLevel(nextLevel);
    return {
      nextLevel,
      nextDifficulty,
      note: `Easing back to Level ${nextLevel} (${nextDifficulty}) after a ${avgScore}/100 recent average — shorter, cleaner drills will lock in clarity before stepping up again.`,
    };
  }

  const needed = Math.max(0, 82 - avgScore);
  return {
    nextLevel: plan.adaptiveLevel,
    nextDifficulty: plan.difficulty,
    note:
      needed > 0
        ? `Staying at Level ${plan.adaptiveLevel} (${plan.difficulty}) — recent average is ${avgScore}/100. Reach 82+/100 across 2–3 takes to advance.`
        : `Holding at top mastery Level ${plan.adaptiveLevel} (${plan.difficulty}) with a strong ${avgScore}/100 recent average.`,
  };
}

/**
 * Generates an End-of-Session Smart Daily Coach Debrief and returns the evolved CoachPlan.
 */
export function generateSessionDebrief(params: {
  durationSec: number;
  exercisesCompleted: CoachedExercise[];
  sessionRecordings: Recording[];
  allRecordings: Recording[];
  profile: UserProfile;
  plan: CoachPlan;
}): { debrief: SessionDebrief; updatedPlan: CoachPlan } {
  const { durationSec, exercisesCompleted, sessionRecordings, allRecordings, profile, plan } = params;
  const combined = [...sessionRecordings, ...allRecordings.filter((r) => !sessionRecordings.some((s) => s.id === r.id))];
  const evaluations = (sessionRecordings.length > 0 ? sessionRecordings : combined.slice(0, 3)).map((r) => ({
    r,
    a: getRecordingAssessment(r),
  }));

  const avgOverallScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((acc, x) => acc + x.a.overallScore, 0) / evaluations.length)
      : null;

  const wpms = evaluations.map((x) => x.r.analysis.wpm).filter((v): v is number => v != null);
  const avgWpm = wpms.length > 0 ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null;
  const totalFillers = evaluations.reduce((acc, x) => acc + x.r.analysis.fillerTotal, 0);

  // Identify biggest weakness from session evaluations (or fallback to plan #1)
  const dimScores: { skill: CoachSkillKey; score: number; evidence: string; tip: string }[] = [];
  if (evaluations.length > 0) {
    const collect = (
      skill: CoachSkillKey,
      pick: (a: DetailedAssessment) => { score: number | null; displayScore: number; evidence: string; tip: string }
    ) => {
      const items = evaluations.map((e) => pick(e.a)).filter((d) => d.score !== null);
      if (items.length === 0) return;
      const avg = Math.round(items.reduce((acc, d) => acc + (d.score as number), 0) / items.length);
      dimScores.push({ skill, score: avg, evidence: items[0].evidence, tip: items[0].tip });
    };
    collect("pacing", (a) => a.dimensions.pace);
    collect("fluency", (a) => a.dimensions.fluency);
    collect("pausesBreathing", (a) => a.dimensions.pausesBreathing);
    collect("clarity", (a) => a.dimensions.clarity);
    collect("expression", (a) => a.dimensions.expression);
    collect("pronunciation", (a) => a.dimensions.pronunciation);
  }
  dimScores.sort((a, b) => a.score - b.score);

  const weakest = dimScores[0]
    ? {
        skill: dimScores[0].skill,
        label: COACH_SKILL_LABELS[dimScores[0].skill],
        evidence: `${dimScores[0].score}/100 — ${dimScores[0].evidence}`,
      }
    : {
        skill: plan.priorityAreas[0]?.skill ?? ("clarity" as CoachSkillKey),
        label: COACH_SKILL_LABELS[plan.priorityAreas[0]?.skill ?? "clarity"],
        evidence: "No scored recordings were made in this session yet — keeping your current top priority active.",
      };

  // Craft 3 specific, non-generic improvement suggestions grounded in real data
  const suggestions: string[] = [];
  if (dimScores[0]) suggestions.push(`${COACH_SKILL_LABELS[dimScores[0].skill]}: ${dimScores[0].tip}`);
  if (avgWpm != null && (avgWpm > plan.targetWpmMax || avgWpm < plan.targetWpmMin)) {
    suggestions.push(
      avgWpm > plan.targetWpmMax
        ? `Pace calibration: you averaged ${avgWpm} WPM (above your ${plan.targetWpmMin}–${plan.targetWpmMax} WPM target). Add a crisp 0.5-second pause at every period and slow down on the final word of each sentence.`
        : `Pace calibration: you averaged ${avgWpm} WPM (below your ${plan.targetWpmMin}–${plan.targetWpmMax} WPM target). Connect words within short phrases and save pauses strictly for punctuation.`
    );
  }
  if (totalFillers > 0) {
    const fillerNames = Object.keys(evaluations[0]?.r.analysis.fillers ?? {}).slice(0, 3);
    suggestions.push(
      `Filler replacement: you logged ${totalFillers} filler word(s)${
        fillerNames.length ? ` (${fillerNames.join(", ")})` : ""
      }. Tomorrow, pause silently with closed lips for one beat whenever a thought needs a moment.`
    );
  }
  if (dimScores[1] && suggestions.length < 3) {
    suggestions.push(`${COACH_SKILL_LABELS[dimScores[1].skill]}: ${dimScores[1].tip}`);
  }
  if (suggestions.length < 3) {
    suggestions.push(
      "Always replay your recording once with eyes closed before scoring — your own ear is the fastest coach for crisp word endings and natural warmth."
    );
  }
  if (suggestions.length < 3) {
    suggestions.push(
      "Keep tomorrow's session compact and consistent: 6 breathing cycles first, then one clean recorded take."
    );
  }

  // Evaluate difficulty progression & evolve the CoachPlan
  const diffEval = evaluateDifficultyAdjustment(plan, combined);
  const band = targetBandForLevel(diffEval.nextLevel, profile.goals.includes("stammer_fluency"));

  const nextPriorities: PlanPriority[] = [
    { skill: weakest.skill, reason: weakest.evidence, priority: 1 },
  ];
  for (const d of dimScores.slice(1)) {
    if (nextPriorities.length >= 3) break;
    if (!nextPriorities.some((p) => p.skill === d.skill)) {
      nextPriorities.push({
        skill: d.skill,
        reason: `${d.score}/100 recent average — ${d.tip}`,
        priority: (nextPriorities.length + 1) as 1 | 2 | 3,
      });
    }
  }
  for (const old of plan.priorityAreas) {
    if (nextPriorities.length >= 3) break;
    if (!nextPriorities.some((p) => p.skill === old.skill)) {
      nextPriorities.push({ ...old, priority: (nextPriorities.length + 1) as 1 | 2 | 3 });
    }
  }

  const updatedPlan: CoachPlan = {
    adaptiveLevel: diffEval.nextLevel,
    difficulty: diffEval.nextDifficulty,
    targetWpmMin: band.min,
    targetWpmMax: band.max,
    priorityAreas: nextPriorities,
    dailyBlueprint: buildDailyBlueprint(profile.dailyMinutes, nextPriorities[0].skill),
    lastUpdatedAt: Date.now(),
    adjustmentNote: diffEval.note,
  };

  // Pick tomorrow's tailored exercises (using tomorrow's date seed & updated plan)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow.getTime());
  const avoidToday: SessionDebrief[] = [
    {
      id: "tmp",
      createdAt: Date.now(),
      date: dateKey(),
      durationSec,
      exercisesCompleted: exercisesCompleted.map((e) => e.title),
      exerciseIds: exercisesCompleted.map((e) => e.id),
      recordingIds: [],
      avgOverallScore,
      avgWpm,
      totalFillers,
      biggestWeakness: weakest,
      suggestions: [],
      tomorrowExerciseIds: [],
      planChangeNote: "",
      summary: "",
    },
  ];
  const tomorrowPlan = selectDailySession(profile, updatedPlan, combined, avoidToday, tomorrowKey);

  const summary =
    sessionRecordings.length > 0
      ? `You completed ${exercisesCompleted.length} coached exercise${exercisesCompleted.length === 1 ? "" : "s"} (${Math.max(
          1,
          Math.round(durationSec / 60)
        )} min) and recorded ${sessionRecordings.length} assessed take${sessionRecordings.length === 1 ? "" : "s"} averaging ${avgOverallScore}/100${
          avgWpm != null ? ` at ${avgWpm} WPM` : ""
        }.`
      : `You completed ${exercisesCompleted.length} guided exercise${exercisesCompleted.length === 1 ? "" : "s"} (${Math.max(
          1,
          Math.round(durationSec / 60)
        )} min). Recording at least one take next session will unlock fresh acoustic metrics.`;

  const debrief: SessionDebrief = {
    id: `debrief-${Date.now().toString(36)}`,
    createdAt: Date.now(),
    date: dateKey(),
    durationSec,
    exercisesCompleted: exercisesCompleted.map((e) => e.title),
    exerciseIds: exercisesCompleted.map((e) => e.id),
    recordingIds: sessionRecordings.map((r) => r.id),
    avgOverallScore,
    avgWpm,
    totalFillers,
    biggestWeakness: weakest,
    suggestions: suggestions.slice(0, 3),
    tomorrowExerciseIds: tomorrowPlan.exercises.map((e) => e.id),
    planChangeNote: diffEval.note,
    summary,
  };

  return { debrief, updatedPlan };
}

/**
 * Aggregates recurring mistakes across a speaker's recording history.
 */
export function analyzeCommonMistakes(recordings: Recording[]): CommonMistakesReport {
  const fillerCounts = new Map<string, number>();
  const repeatCounts = new Map<string, number>();
  const missedCounts = new Map<string, number>();
  const wpms: number[] = [];
  let longPauseTotal = 0;
  let breathlessClips = 0;

  for (const r of recordings) {
    for (const [k, v] of Object.entries(r.analysis.fillers)) {
      fillerCounts.set(k, (fillerCounts.get(k) ?? 0) + v);
    }
    for (const rep of r.analysis.repeats) {
      repeatCounts.set(rep, (repeatCounts.get(rep) ?? 0) + 1);
    }
    if (r.analysis.wpm != null) wpms.push(r.analysis.wpm);
    longPauseTotal += r.analysis.longPauses;
    if (r.analysis.pauses && r.analysis.pauses.longestRunMs > 13000) breathlessClips++;

    if (r.scriptText && r.transcript) {
      const cmp = compareWords(r.scriptText, r.transcript);
      for (const tok of cmp.tokens) {
        if (tok.status === "missing" && tok.word.length > 3) {
          missedCounts.set(tok.word, (missedCounts.get(tok.word) ?? 0) + 1);
        }
      }
    }
  }

  const topFillers = [...fillerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  const topRepeats = [...repeatCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  const topMissedWords = [...missedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const avgWpm = wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null;
  const paceTendency =
    avgWpm == null
      ? { label: "Not enough pace data", detail: "Record a few 20–60s exercises to reveal your pace pattern.", avgWpm: null }
      : avgWpm > 155
      ? { label: "Tends to rush", detail: `Your average speed is ${avgWpm} WPM. Intentionally pausing at periods will improve clarity immediately.`, avgWpm }
      : avgWpm < 110
      ? { label: "Slow / cautious", detail: `Your average speed is ${avgWpm} WPM — very clear, ready to connect short phrases a bit more smoothly.`, avgWpm }
      : { label: "Well-paced band", detail: `Your average speed is ${avgWpm} WPM, sitting comfortably in the ideal 115–150 WPM conversational range.`, avgWpm };

  const avgLong = recordings.length ? longPauseTotal / recordings.length : 0;
  const pauseTendency =
    recordings.length === 0
      ? { label: "No pause history yet", detail: "Recordings with microphone audio automatically analyze your pause cadence." }
      : breathlessClips >= Math.max(2, Math.ceil(recordings.length * 0.4))
      ? { label: "Long breathless runs", detail: `${breathlessClips} of ${recordings.length} recordings had >13s unbroken speech runs. Plan nasal inhales at punctuation.` }
      : avgLong >= 2.2
      ? { label: "Frequent hesitation pauses", detail: `Averaging ${avgLong.toFixed(1)} pauses >1.5s per take. Shorten mid-sentence stalls with PREP/STAR outlines.` }
      : { label: "Healthy breathing rhythm", detail: `Averaging ${avgLong.toFixed(1)} long hesitations per recording with balanced pause spacing.` };

  return { topFillers, topRepeats, topMissedWords, paceTendency, pauseTendency };
}

/**
 * Compares recent overall speaking scores (/100) against the user's earliest baseline recordings.
 */
export function computeOverallImprovement(recordings: Recording[]): ImprovementSummary {
  if (recordings.length === 0) {
    return { currentAvg: null, baselineAvg: null, delta: null, recordingCount: 0 };
  }
  const chronological = [...recordings].sort((a, b) => a.createdAt - b.createdAt);
  const scores = chronological.map((r) => getRecordingAssessment(r).overallScore);

  if (scores.length === 1) {
    return { currentAvg: scores[0], baselineAvg: scores[0], delta: 0, recordingCount: 1 };
  }
  const span = scores.length >= 6 ? 3 : scores.length >= 4 ? 2 : 1;
  const baselineAvg = Math.round(scores.slice(0, span).reduce((a, b) => a + b, 0) / span);
  const currentAvg = Math.round(scores.slice(-span).reduce((a, b) => a + b, 0) / span);
  return {
    currentAvg,
    baselineAvg,
    delta: currentAvg - baselineAvg,
    recordingCount: scores.length,
  };
}

export function monthlyReport(
  recordings: Recording[],
  logs: PracticeLog[],
  skillAverages: Record<SkillKey, number | null>
): string {
  const dayMs = 86400000;
  const now = Date.now();
  const monthLogs = logs.filter((l) => now - new Date(l.date + "T00:00:00").getTime() < 30 * dayMs);
  const monthRecs = recordings.filter((r) => now - r.createdAt < 30 * dayMs);
  const monthSec = monthLogs.reduce((a, l) => a + l.seconds, 0);
  const activeDays = new Set(monthLogs.map((l) => l.date)).size;

  const lines: string[] = [];
  lines.push(`# Monthly speech coaching report — last 30 days (as of ${new Date(now).toLocaleDateString()})`);
  lines.push("");
  lines.push(`- Total practice time: ${Math.round(monthSec / 60)} minutes across ${activeDays} active day(s)`);
  lines.push(`- Sessions logged: ${monthLogs.length} · Recordings evaluated: ${monthRecs.length}`);

  if (monthRecs.length > 0) {
    const scores = monthRecs.map((r) => getRecordingAssessment(r).overallScore);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const wpms = monthRecs.map((r) => r.analysis.wpm).filter((v): v is number => v != null);
    const avgWpm = wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null;
    const avgFill = (monthRecs.reduce((a, r) => a + r.analysis.fillerTotal, 0) / monthRecs.length).toFixed(1);
    lines.push(`- Average overall speaking score: ${avgScore}/100`);
    if (avgWpm != null) lines.push(`- Average speaking speed: ${avgWpm} WPM · Average fillers/take: ${avgFill}`);

    const imp = computeOverallImprovement(monthRecs);
    if (imp.delta != null && monthRecs.length >= 2) {
      lines.push(`- 30-day score movement: ${imp.baselineAvg}/100 → ${imp.currentAvg}/100 (${imp.delta >= 0 ? "+" : ""}${imp.delta} pts)`);
    }
  }

  const mistakes = analyzeCommonMistakes(monthRecs);
  if (mistakes.topFillers.length > 0) {
    lines.push(
      `- Most frequent filler words: ${mistakes.topFillers.slice(0, 3).map((f) => `"${f.word}" (${f.count}×)`).join(", ")}`
    );
  }
  lines.push(`- Pace tendency: ${mistakes.paceTendency.label}`);

  const skills = (Object.keys(skillAverages) as SkillKey[])
    .filter((k) => skillAverages[k] != null)
    .map((k) => `${SKILL_LABELS[k]} ${(skillAverages[k] as number).toFixed(1)}/5`)
    .join(" · ");
  if (skills) lines.push(`- Listening self-checks: ${skills}`);

  lines.push("");
  lines.push("_Generated locally by SpeechCoach — verifiable acoustic & transcript measurements._");
  return lines.join("\n");
}
