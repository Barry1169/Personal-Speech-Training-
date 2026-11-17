import test from "node:test";
import assert from "node:assert/strict";
import { detectPitchHz, summarizePitch } from "../pitch";
import {
  analyzePauses,
  analyzeSentences,
  analyzeVolume,
  buildAnalysis,
  compareWords,
  computeDetailedAssessment,
  extractProblemWords,
} from "../analytics";
import {
  analyzeCommonMistakes,
  buildInitialPlan,
  computeOverallImprovement,
  deriveSkillStandings,
  evaluateDifficultyAdjustment,
  generateSessionDebrief,
  getRecordingAssessment,
  monthlyReport,
  selectDailySession,
} from "../adaptiveCoach";
import { COACHED_MATERIALS, DIAGNOSTIC_EXERCISE, getCoachedExerciseById } from "../materials";
import { BUILTIN_EXERCISES, MODES, PROGRAM, SCENARIOS, dayLabel } from "../program";
import { streaksFromDates, weeklyReport } from "../coach";
import {
  analyzeWordEntry,
  applyWordAttempt,
  buildCustomWordCoachedExercise,
  compareWordBeforeAfter,
  createPersonalWord,
  detectWeakSounds,
  evaluateWordAttempt,
  getDueWords,
  recommendedPracticeSpeed,
} from "../pronunciation";
import {
  DEFAULT_COACH_PLAN,
  DEFAULT_PROFILE,
  dateKey,
  type PitchSample,
  type PracticeLog,
  type Recording,
  type VolumeSample,
} from "../types";

function makeSineFrame(freqHz: number, sampleRate = 44100, length = 2048, amp = 0.25): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] =
      amp *
      (0.75 * Math.sin((2 * Math.PI * freqHz * i) / sampleRate) +
        0.25 * Math.sin((4 * Math.PI * freqHz * i) / sampleRate));
  }
  return buf;
}

function makeTimeline(pattern: { sec: number; rms: number }[]): VolumeSample[] {
  const tl: VolumeSample[] = [];
  let t = 0;
  for (const seg of pattern) {
    const steps = Math.round(seg.sec * 10); // 100ms step
    for (let i = 0; i < steps; i++) {
      tl.push({ t, r: seg.rms });
      t += 100;
    }
  }
  return tl;
}

test("pitch detection measures male/female F0 accurately, rejects silence, and computes semitone span", () => {
  const male = detectPitchHz(makeSineFrame(135), 44100);
  assert.ok(male);
  assert.ok(Math.abs(male.hz - 135) < 3, `Expected ~135 Hz, got ${male.hz}`);

  const female = detectPitchHz(makeSineFrame(220), 44100);
  assert.ok(female);
  assert.ok(Math.abs(female.hz - 220) < 4, `Expected ~220 Hz, got ${female.hz}`);

  assert.equal(detectPitchHz(new Float32Array(2048), 44100), null);

  const expressiveSamples: PitchSample[] = Array.from({ length: 24 }, (_, i) => ({
    t: i * 100,
    hz: 120 + (i / 23) * 60,
    clarity: 0.9,
  }));
  const monotoneSamples: PitchSample[] = Array.from({ length: 24 }, (_, i) => ({
    t: i * 100,
    hz: 140 + (i % 2) * 3,
    clarity: 0.9,
  }));

  const exprStats = summarizePitch(expressiveSamples);
  const monoStats = summarizePitch(monotoneSamples);
  assert.ok(exprStats && monoStats);
  assert.ok(exprStats.semitoneRange > 5.0);
  assert.ok(monoStats.semitoneRange < 1.0);
});

test("pause & breath analyzer distinguishes healthy cadence from breathless runs and dead-air stalls", () => {
  const healthyTl = makeTimeline([
    { sec: 4.0, rms: 0.11 },
    { sec: 0.6, rms: 0.002 },
    { sec: 3.5, rms: 0.12 },
    { sec: 0.7, rms: 0.002 },
    { sec: 4.0, rms: 0.10 },
  ]);
  const breathlessTl = makeTimeline([{ sec: 18.0, rms: 0.12 }]);
  const stalledTl = makeTimeline([
    { sec: 3.0, rms: 0.11 },
    { sec: 2.0, rms: 0.002 },
    { sec: 3.0, rms: 0.11 },
    { sec: 2.1, rms: 0.002 },
    { sec: 3.0, rms: 0.11 },
    { sec: 1.9, rms: 0.002 },
    { sec: 3.0, rms: 0.11 },
  ]);

  const healthyP = analyzePauses(healthyTl, 12.8)!;
  const breathlessP = analyzePauses(breathlessTl, 18)!;
  const stalledP = analyzePauses(stalledTl, 18)!;

  assert.equal(healthyP.naturalCount, 2);
  assert.equal(healthyP.longCount, 0);
  assert.ok(breathlessP.longestRunMs >= 17000);
  assert.equal(stalledP.longCount, 3);

  const healthyAssess = computeDetailedAssessment({
    analysis: buildAnalysis("word ".repeat(28).trim(), 13, healthyTl, null),
    self: null,
    script: null,
    transcript: "word ".repeat(28).trim(),
    comparison: null,
    durationSec: 13,
    targetWpm: 130,
  });
  const breathlessAssess = computeDetailedAssessment({
    analysis: buildAnalysis("word ".repeat(40).trim(), 18, breathlessTl, null),
    self: null,
    script: null,
    transcript: "word ".repeat(40).trim(),
    comparison: null,
    durationSec: 18,
    targetWpm: 130,
  });
  assert.ok(
    healthyAssess.dimensions.pausesBreathing.displayScore >
      breathlessAssess.dimensions.pausesBreathing.displayScore + 15,
    "Healthy breath cadence must score substantially higher than an 18s breathless run"
  );
});

test("100-point assessment is deterministic, responds to WPM/fillers/pitch, and never fakes pronunciation", () => {
  const script = DIAGNOSTIC_EXERCISE.plainText;
  const cleanSpoken = script;
  const fillerSpoken =
    "Um good speaking is uh not about like you talking fast or um using complicated words you know basically it is um good.";

  const tl = makeTimeline([
    { sec: 6, rms: 0.1 },
    { sec: 0.6, rms: 0.002 },
    { sec: 8, rms: 0.14 },
    { sec: 0.7, rms: 0.002 },
    { sec: 8, rms: 0.09 },
    { sec: 0.6, rms: 0.002 },
    { sec: 8, rms: 0.13 },
  ]);
  const exprPitches: PitchSample[] = Array.from({ length: 60 }, (_, i) => ({
    t: i * 400,
    hz: 120 + (i % 10) * 7,
    clarity: 0.9,
  }));
  const monoPitches: PitchSample[] = Array.from({ length: 60 }, (_, i) => ({
    t: i * 400,
    hz: 140 + (i % 2) * 2,
    clarity: 0.9,
  }));

  const cmpClean = compareWords(script, cleanSpoken);
  const aClean = computeDetailedAssessment({
    analysis: buildAnalysis(cleanSpoken, 32, tl, cmpClean, exprPitches),
    self: null,
    script,
    transcript: cleanSpoken,
    comparison: cmpClean,
    durationSec: 32,
    targetWpm: 125,
  });

  // Strict honesty: pronunciation cannot be scored without self-check
  assert.equal(aClean.dimensions.pronunciation.pendingSelfCheck, true);
  assert.equal(aClean.dimensions.pronunciation.score, null);
  assert.equal(aClean.dimensions.pace.evidenceKind, "measured");
  assert.equal(aClean.dimensions.fluency.evidenceKind, "measured");

  // Determinism check
  const aCleanRepeat = computeDetailedAssessment({
    analysis: buildAnalysis(cleanSpoken, 32, tl, cmpClean, exprPitches),
    self: null,
    script,
    transcript: cleanSpoken,
    comparison: cmpClean,
    durationSec: 32,
    targetWpm: 125,
  });
  assert.deepEqual(aClean, aCleanRepeat);

  // Expressive vs monotone pitch
  const aMono = computeDetailedAssessment({
    analysis: buildAnalysis(cleanSpoken, 32, tl, cmpClean, monoPitches),
    self: null,
    script,
    transcript: cleanSpoken,
    comparison: cmpClean,
    durationSec: 32,
    targetWpm: 125,
  });
  assert.ok(
    aClean.dimensions.expression.displayScore > aMono.dimensions.expression.displayScore + 15,
    "Expressive pitch range must outscore monotone delivery"
  );

  // Clean vs filler-heavy
  const cmpFill = compareWords(script, fillerSpoken);
  const aFill = computeDetailedAssessment({
    analysis: buildAnalysis(fillerSpoken, 14, tl, cmpFill, exprPitches),
    self: null,
    script,
    transcript: fillerSpoken,
    comparison: cmpFill,
    durationSec: 14,
    targetWpm: 125,
  });
  assert.ok(aClean.dimensions.fluency.displayScore > aFill.dimensions.fluency.displayScore + 25);
  assert.ok(aFill.problemWords.some((w) => w.kind === "filler"));

  // Self-check activates pronunciation cleanly
  const aWithSelf = computeDetailedAssessment({
    analysis: buildAnalysis(cleanSpoken, 32, tl, cmpClean, exprPitches),
    self: { clarity: 4, pronunciation: 5, fluency: 5, pacing: 4, vocalControl: 4, expression: 4, breathing: 4 },
    script,
    transcript: cleanSpoken,
    comparison: cmpClean,
    durationSec: 32,
    targetWpm: 125,
  });
  assert.equal(aWithSelf.dimensions.pronunciation.pendingSelfCheck, false);
  assert.ok((aWithSelf.dimensions.pronunciation.score ?? 0) >= 90);
});

test("sentence alignment isolates problem sentences cleanly without cross-sentence bleed", () => {
  const script = "First sentence is very clear and crisp. Second sentence has thirty-three thorough thinkers.";
  const spoken = "First sentence is very clear and crisp. Second sentence has um thinkers.";
  const sents = analyzeSentences(script, spoken);
  assert.equal(sents.length, 1);
  assert.equal(sents[0].index, 2);
  assert.ok(sents[0].missingWords.includes("thorough"));
  assert.ok(sents[0].fillers.includes("um"));

  const cmp = compareWords(script, spoken);
  const words = extractProblemWords(script, spoken, cmp, { um: 1 }, ["thinkers"]);
  assert.ok(words.some((w) => w.word === "thorough" && w.phoneticHint === "TH placement"));
  assert.ok(words.some((w) => w.word === "um" && w.kind === "filler"));
  assert.ok(words.some((w) => w.word === "thinkers" && w.kind === "repeated"));
});

test("all 7 material types x 3 difficulty levels exist with complete coaching instructions", () => {
  const types = [
    "short_sentence",
    "paragraph",
    "long_passage",
    "storytelling",
    "tongue_twister",
    "conversation",
    "impromptu",
  ] as const;
  const diffs = ["beginner", "intermediate", "advanced"] as const;

  for (const t of types) {
    for (const d of diffs) {
      const match = COACHED_MATERIALS.find((m) => m.materialType === t && m.difficulty === d);
      assert.ok(match, `Missing coached material for ${t} (${d})`);
      assert.ok(match.whatToDo.length > 20);
      assert.ok(match.howToSpeak.length > 20);
      assert.ok(match.emphasisWords.length >= 3);
      assert.ok(match.pauseNotes.length > 15);
      assert.ok(match.mistakesToAvoid.length >= 2);
      assert.ok(match.annotatedText.length > 30);
    }
  }
});

test("adaptive coach evolves difficulty up & down, builds daily sessions, debriefs, and handles legacy recordings", () => {
  const profile = {
    ...DEFAULT_PROFILE,
    name: "Sam",
    experienceLevel: "beginner" as const,
    selfWeaknesses: ["fluency" as const, "pacing" as const],
    dailyMinutes: 15,
    onboardingCompleted: true,
  };
  const plan = buildInitialPlan(profile, null);
  assert.equal(plan.adaptiveLevel, 1);
  assert.equal(plan.difficulty, "beginner");
  assert.equal(plan.priorityAreas.length, 3);

  const dayA = selectDailySession(profile, plan, [], [], "2026-11-16");
  const dayB = selectDailySession(profile, plan, [], [], "2026-11-17");
  assert.ok(dayA.exercises.length === 3);
  assert.ok(dayB.exercises.length === 3);

  const makeRec = (id: string, createdAt: number, wpm: number, fillers: number, selfVal: number): Recording => ({
    id,
    createdAt,
    title: `Take ${id}`,
    mode: "daily",
    scriptText: null,
    transcript: "word ".repeat(60).trim(),
    durationSec: 30,
    analysis: {
      wordCount: 60,
      wpm,
      fillerTotal: fillers,
      fillers: fillers ? { um: fillers } : {},
      repeats: fillers > 2 ? ["word"] : [],
      longPauses: fillers > 2 ? 3 : 0,
      volume: { avg: 0.1, min: 0.06, max: 0.15, cv: 0.19, activeRatio: 0.78, avgDb: -20, dynamicRangeDb: 8 },
      coverage: null,
      pitch: { medianHz: 150, minHz: 115, maxHz: 205, p10Hz: 122, p90Hz: 185, semitoneRange: 7.1, semitoneStd: 2.0, voicedFrames: 80 },
      pauses: { naturalCount: 4, deliberateCount: 1, longCount: fillers > 2 ? 3 : 0, longestPauseMs: 1100, longestRunMs: 6500, avgPauseMs: 620, pausesPerMin: 10 },
    },
    self: { clarity: selfVal, pronunciation: selfVal, fluency: selfVal, pacing: selfVal, vocalControl: selfVal, expression: selfVal, breathing: selfVal },
    hasAudio: false,
    mimeType: "audio/webm",
    dayLabel: "Week 1 · Day 1",
  });

  // Step-up check
  const strongRecs = [makeRec("r2", 2000, 130, 0, 5), makeRec("r1", 1000, 128, 0, 5)];
  const stepUp = evaluateDifficultyAdjustment({ ...DEFAULT_COACH_PLAN, adaptiveLevel: 1, difficulty: "beginner" }, strongRecs);
  assert.equal(stepUp.nextLevel, 2);

  // Step-down check
  const roughRecs = [makeRec("w2", 2000, 210, 7, 1), makeRec("w1", 1000, 205, 8, 1)];
  const stepDown = evaluateDifficultyAdjustment({ ...DEFAULT_COACH_PLAN, adaptiveLevel: 3, difficulty: "intermediate" }, roughRecs);
  assert.equal(stepDown.nextLevel, 2);
  assert.equal(stepDown.nextDifficulty, "beginner");

  // Debrief + plan update + tomorrow recommendation
  const { debrief, updatedPlan } = generateSessionDebrief({
    durationSec: 840,
    exercisesCompleted: dayA.exercises,
    sessionRecordings: [strongRecs[0]],
    allRecordings: strongRecs,
    profile,
    plan,
  });
  assert.equal(debrief.suggestions.length, 3);
  assert.ok(debrief.tomorrowExerciseIds.length >= 2);
  assert.equal(updatedPlan.adaptiveLevel, 2);

  // Legacy recording (no pitch, pauses, or assessment fields) still computes cleanly
  const legacyRec: Recording = {
    id: "legacy-1",
    createdAt: Date.now() - 86400000 * 5,
    title: "Legacy v1 take",
    mode: "manual",
    scriptText: "hello world this is a test",
    transcript: "hello world this is a test",
    durationSec: 12,
    analysis: {
      wordCount: 6,
      wpm: 120,
      fillerTotal: 0,
      fillers: {},
      repeats: [],
      longPauses: 0,
      volume: { avg: 0.1, min: 0.05, max: 0.14, cv: 0.2, activeRatio: 0.8 },
      coverage: 100,
    },
    self: { clarity: 4, pronunciation: 4, fluency: 4, pacing: 4, vocalControl: 4 },
    hasAudio: false,
    mimeType: "audio/webm",
    dayLabel: "Week 1 · Day 1",
  };
  const legacyAssessment = getRecordingAssessment(legacyRec);
  assert.ok(legacyAssessment.overallScore > 70);

  // Progress reports, streaks, standings, mistakes, improvement
  const standings = deriveSkillStandings([...strongRecs, legacyRec]);
  assert.ok(standings.some((s) => s.score != null));

  const mistakes = analyzeCommonMistakes(roughRecs);
  assert.equal(mistakes.topFillers[0].word, "um");
  assert.equal(mistakes.paceTendency.label, "Tends to rush");

  const imp = computeOverallImprovement([strongRecs[0], roughRecs[1]]);
  assert.ok((imp.delta ?? 0) > 20);

  const todayStr = dateKey();
  const yestStr = dateKey(Date.now() - 86400000);
  const st = streaksFromDates([yestStr, todayStr]);
  assert.equal(st.current, 2);
  assert.equal(st.best, 2);

  const logs: PracticeLog[] = [
    { id: "l1", ts: Date.now(), date: todayStr, seconds: 900, mode: "daily-coach", completed: 3, scores: null, overallScore: 86 },
  ];
  const wk = weeklyReport(strongRecs, logs, { clarity: 4, pronunciation: 4, fluency: 4, pacing: 4, vocalControl: 4 });
  const mo = monthlyReport(strongRecs, logs, { clarity: 4, pronunciation: 4, fluency: 4, pacing: 4, vocalControl: 4 });
  assert.ok(wk.includes("Weekly speech report"));
  assert.ok(mo.includes("Monthly speech coaching report"));
});

test("all preserved legacy 12-week program, modes, scenarios, and built-in library remain intact", () => {
  assert.equal(PROGRAM.length, 12);
  for (let d = 1; d <= 84; d++) {
    const info = dayLabel(d);
    assert.ok(info.week && info.day);
    assert.ok(info.day.main.length > 0);
  }
  assert.equal(MODES.length, 5);
  assert.equal(SCENARIOS.length, 6);
  assert.ok(BUILTIN_EXERCISES.length >= 25);
});

test("stammering fluency & YouTube creator goals prioritize anti-stammering/camera drills and calm WPM targets", () => {
  const stammerMaterials = COACHED_MATERIALS.filter((m) => m.focusTags?.includes("stammering"));
  const youtubeMaterials = COACHED_MATERIALS.filter((m) => m.focusTags?.includes("youtube"));
  assert.ok(stammerMaterials.length >= 6, "Expected >= 6 anti-stammering coached exercises");
  assert.ok(youtubeMaterials.length >= 4, "Expected >= 4 YouTube camera coached exercises");

  const ytProfile = {
    ...DEFAULT_PROFILE,
    goals: ["stammer_fluency" as const, "youtube_creator" as const],
    experienceLevel: "beginner" as const,
    selfWeaknesses: ["fluency" as const, "pausesBreathing" as const],
    dailyMinutes: 15,
    onboardingCompleted: true,
  };
  const ytPlan = buildInitialPlan(ytProfile, null);
  assert.ok(ytPlan.targetWpmMin <= 105 && ytPlan.targetWpmMax <= 125, "Stammer-focused plan must target a calm unhurried WPM band");

  const session = selectDailySession(ytProfile, ytPlan, [], [], "2026-11-16");
  assert.ok(
    session.exercises.some((e) => e.focusTags?.includes("stammering")),
    "Daily session must prioritize anti-stammering fluency exercises"
  );
  assert.ok(
    session.exercises.some((e) => e.focusTags?.includes("youtube")),
    "Daily session must include YouTube camera exercises"
  );
});

test("Personal Pronunciation System: curated & arbitrary word analysis generates phonetics, IPA, sound tags, and anatomical guides", () => {
  const curated = analyzeWordEntry("thorough");
  assert.equal(curated.ipaSource, "dictionary");
  assert.equal(curated.ipa, "/ˈθɜːr.oʊ/");
  assert.ok(curated.soundTags.includes("th") && curated.soundTags.includes("r"));
  assert.ok(curated.mouthGuide.tongue.toLowerCase().includes("tongue"));

  const custom = analyzeWordEntry("crystallization");
  assert.equal(custom.ipaSource, "estimated");
  assert.ok(custom.phonetic.length > 0 && custom.phonetic.includes("-"));
  assert.ok(custom.soundTags.includes("r") && custom.soundTags.includes("l") && custom.soundTags.includes("clusters"));
  assert.ok(custom.exampleSentence.toLowerCase().includes("crystallization"));
});

test("Personal Pronunciation System: honest attempt evaluation never fabricates 100/100 from STT-only matches", () => {
  const word = createPersonalWord("thorough", { source: "manual" });

  // STT-only exact match (no self-check) must stay capped <= 85 with explicit honesty note
  const sttOnly = evaluateWordAttempt({
    word,
    speedMode: "natural",
    transcript: "thorough",
    selfScore: null,
  });
  assert.equal(sttOnly.evidenceKind, "measured");
  assert.ok(sttOnly.score <= 85 && sttOnly.score >= 70, `Expected honest STT-only score 70..85, got ${sttOnly.score}`);
  assert.ok(sttOnly.evidence.toLowerCase().includes("capped"));

  // Hybrid match (STT + 5/5 listening self-check) unlocks high confidence >= 92
  const hybrid = evaluateWordAttempt({
    word,
    speedMode: "natural",
    transcript: "thorough",
    selfScore: 5,
  });
  assert.equal(hybrid.evidenceKind, "hybrid");
  assert.ok(hybrid.score >= 92, `Expected hybrid high score >= 92, got ${hybrid.score}`);

  // Mispronounced word ("toro") must score low and produce targeted TH guidance
  const miss = evaluateWordAttempt({
    word,
    speedMode: "slow",
    transcript: "toro",
    selfScore: 2,
  });
  assert.ok(miss.score < 60, `Expected low score for mispronunciation, got ${miss.score}`);
  assert.ok(miss.feedback.length > 0 && miss.matchedWord === false);
});

test("Personal Pronunciation System: spaced repetition & multi-day mastery requires consistent natural-speed accuracy and demotes on slips", () => {
  const baseWord = createPersonalWord("world", { source: "assessment" });
  assert.equal(baseWord.status, "difficult");
  assert.equal(recommendedPracticeSpeed(baseWord).mode, "slow");

  // Day 1: strong slow attempt -> moves to learning, NOT mastered yet
  const d1 = applyWordAttempt(baseWord, {
    id: "att_1",
    ts: Date.parse("2026-11-10T10:05:00Z"),
    date: "2026-11-10",
    speedMode: "slow",
    transcript: "world",
    matchedWord: true,
    similarityPct: 100,
    selfScore: 5,
    score: 88,
    evidenceKind: "hybrid",
    evidence: "Clean match + 5/5 self check",
    feedback: "Move to natural speed.",
    recordingId: "rec_before",
  });
  assert.equal(d1.status, "learning");
  assert.equal(recommendedPracticeSpeed(d1).mode, "natural");

  // Day 1 second strong natural attempt -> still only 1 distinct day, must NOT prematurely master
  const d1b = applyWordAttempt(d1, {
    id: "att_2",
    ts: Date.parse("2026-11-10T10:15:00Z"),
    date: "2026-11-10",
    speedMode: "natural",
    transcript: "the world changes",
    matchedWord: true,
    similarityPct: 100,
    selfScore: 5,
    score: 92,
    evidenceKind: "hybrid",
    evidence: "Clean match + 5/5 self check",
    feedback: "Review tomorrow.",
    recordingId: null,
  });
  assert.equal(d1b.status, "learning");

  // Day 2 third strong natural attempt -> multi-day consistency achieved -> MASTERED!
  const d2 = applyWordAttempt(d1b, {
    id: "att_3",
    ts: Date.parse("2026-11-11T10:00:00Z"),
    date: "2026-11-11",
    speedMode: "natural",
    transcript: "the world changes every day",
    matchedWord: true,
    similarityPct: 100,
    selfScore: 5,
    score: 96,
    evidenceKind: "hybrid",
    evidence: "Mastered",
    feedback: "Maintenance review.",
    recordingId: "rec_after",
  });
  assert.equal(d2.status, "mastered");
  assert.ok(d2.intervalDays >= 7, `Expected mastered interval >= 7 days, got ${d2.intervalDays}`);

  // Before vs After comparison on this word shows concrete improvement and audio links
  const ba = compareWordBeforeAfter(d2);
  assert.ok(ba !== null);
  assert.equal(ba!.beforeScore, 88);
  assert.equal(ba!.afterScore, 96);
  assert.equal(ba!.delta, 8);
  assert.equal(ba!.beforeRecordingId, "rec_before");
  assert.equal(ba!.afterRecordingId, "rec_after");

  // Due words check: not due on 2026-11-11, due after nextReviewAt
  assert.equal(getDueWords([d2], Date.parse("2026-11-11T12:00:00Z")).length, 0);
  assert.equal(getDueWords([d2], Date.parse("2026-12-01T12:00:00Z")).length, 1);

  // Slip on a later day honestly demotes from mastered -> learning and resets interval to 1 day
  const slipped = applyWordAttempt(d2, {
    id: "att_4",
    ts: Date.parse("2026-11-20T10:00:00Z"),
    date: "2026-11-20",
    speedMode: "natural",
    transcript: "word",
    matchedWord: false,
    similarityPct: 60,
    selfScore: 2,
    score: 52,
    evidenceKind: "hybrid",
    evidence: "Dropped L.",
    feedback: "Slow down.",
    recordingId: null,
  });
  assert.equal(slipped.status, "learning");
  assert.equal(slipped.intervalDays, 1);
});

test("Personal Pronunciation System: Weak Sound Detector & Custom Daily Word Exercise integrate cleanly with selectDailySession", () => {
  const words = [
    createPersonalWord("thorough", { source: "assessment" }),
    createPersonalWord("through", { source: "assessment" }),
    createPersonalWord("rural", { source: "manual" }),
    createPersonalWord("world", { source: "manual" }),
    createPersonalWord("strengths", { source: "manual" }),
  ];

  const { weakSounds, weakCombos } = detectWeakSounds(words, []);
  assert.ok(weakSounds.length >= 3, "Expected >= 3 detected weak sound categories");
  assert.ok(
    weakSounds.some((s) => s.sound === "th") && weakSounds.some((s) => s.sound === "r"),
    "Expected TH and R to be detected among weak sounds"
  );
  assert.ok(weakCombos.some((c) => c.comboKey === "th_r"), "Expected TH + R combination to be flagged");
  // Every recommended exercise ID must resolve to a real CoachedExercise
  for (const finding of weakSounds) {
    for (const id of finding.recommendedExerciseIds) {
      assert.ok(getCoachedExerciseById(id), `Recommended exercise ${id} must exist in COACHED_MATERIALS`);
    }
  }

  // Build custom daily pronunciation exercise from saved difficult words
  const customEx = buildCustomWordCoachedExercise(words);
  assert.ok(customEx !== null, "Expected custom daily word exercise to be built");
  assert.ok(customEx!.plainText.toLowerCase().includes("thorough"));
  assert.ok(customEx!.annotatedText.includes("**") && customEx!.annotatedText.includes("∧"));

  // Weave custom word exercise directly into selectDailySession
  const plan = buildInitialPlan({ ...DEFAULT_PROFILE, dailyMinutes: 15, onboardingCompleted: true }, null);
  const session = selectDailySession(
    { ...DEFAULT_PROFILE, dailyMinutes: 15, onboardingCompleted: true },
    plan,
    [],
    [],
    "2026-11-16",
    customEx
  );
  assert.ok(
    session.exercises.some((ex) => ex.id === customEx!.id),
    "Daily session must include the custom saved-words pronunciation drill"
  );
  assert.ok(session.coachRationale.length > 0, "Daily session must provide a clear coaching rationale");
});

