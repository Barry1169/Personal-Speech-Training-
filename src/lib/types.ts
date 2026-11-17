export type PracticeLanguage = "en" | "hi";

export const PRACTICE_LANGUAGE_META: Record<
  PracticeLanguage,
  {
    code: PracticeLanguage;
    label: string;
    nativeLabel: string;
    shortLabel: string;
    bcp47: string;
    defaultTargetWpm: number;
  }
> = {
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    shortLabel: "EN",
    bcp47: "en-US",
    defaultTargetWpm: 130,
  },
  hi: {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    shortLabel: "HI",
    bcp47: "hi-IN",
    defaultTargetWpm: 120,
  },
};

export function langOf(item?: { language?: PracticeLanguage } | null): PracticeLanguage {
  return item?.language === "hi" ? "hi" : "en";
}

export type SkillKey = "clarity" | "pronunciation" | "fluency" | "pacing" | "vocalControl";

export type CoachSkillKey =
  | "pronunciation"
  | "clarity"
  | "pacing"
  | "fluency"
  | "pausesBreathing"
  | "expression"
  | "projection"
  | "confidence";

export interface SelfScores {
  clarity: number;
  pronunciation: number;
  fluency: number;
  pacing: number;
  vocalControl: number;
  expression?: number;
  breathing?: number;
}

export const EMPTY_SCORES: SelfScores = {
  clarity: 0,
  pronunciation: 0,
  fluency: 0,
  pacing: 0,
  vocalControl: 0,
  expression: 0,
  breathing: 0,
};

export interface VolumeSample {
  t: number; // ms since start
  r: number; // rms 0..1
}

export interface VolumeStats {
  avg: number;
  min: number;
  max: number;
  cv: number; // coefficient of variation over active speech
  activeRatio: number; // fraction of time speaking
  avgDb?: number; // relative dBFS of active speech
  dynamicRangeDb?: number; // spread between 90th and 10th percentile active dB
}

export interface PitchSample {
  t: number; // ms since start
  hz: number; // fundamental frequency in Hz
  clarity: number; // autocorrelation confidence 0..1
}

export interface PitchStats {
  medianHz: number;
  minHz: number;
  maxHz: number;
  p10Hz: number;
  p90Hz: number;
  semitoneRange: number; // 12 * log2(p90 / p10)
  semitoneStd: number;
  voicedFrames: number;
}

export interface PauseStats {
  naturalCount: number; // 350ms - 1000ms (healthy breath/phrasing pauses)
  deliberateCount: number; // 1000ms - 1500ms (emphatic / paragraph pauses)
  longCount: number; // > 1500ms (hesitation / dead air)
  longestPauseMs: number;
  longestRunMs: number; // longest continuous speaking run without a breath pause
  avgPauseMs: number;
  pausesPerMin: number;
}

export type ScoreEvidenceKind = "measured" | "hybrid" | "self";

export interface DimensionScore {
  key: "pronunciation" | "clarity" | "pace" | "fluency" | "pausesBreathing" | "expression";
  label: string;
  score: number | null; // 0..100 (null when self-check is required and not yet provided)
  displayScore: number; // 0..100 for charts/gauges (falls back cleanly when pending)
  pendingSelfCheck?: boolean;
  rawDisplay: string;
  evidenceKind: ScoreEvidenceKind;
  evidence: string; // factual acoustic / transcript measurement
  interpretation: string; // coaching interpretation clearly distinct from raw metric
  tip: string; // concrete next step
}

export interface ProblemWord {
  word: string;
  kind: "missing" | "extra" | "repeated" | "filler";
  context: string;
  correctionTip: string;
  phoneticHint?: string;
}

export interface ProblemSentence {
  index: number;
  sentence: string;
  matchPct: number;
  missingWords: string[];
  fillers: string[];
  tip: string;
}

export interface DetailedAssessment {
  overallScore: number; // 0..100
  overallBasis: string;
  dimensions: {
    pronunciation: DimensionScore;
    clarity: DimensionScore;
    pace: DimensionScore;
    fluency: DimensionScore;
    pausesBreathing: DimensionScore;
    expression: DimensionScore;
  };
  strengths: string[];
  improvements: string[];
  problemWords: ProblemWord[];
  problemSentences: ProblemSentence[];
  formulaSummary: string;
  measurableSummary: string[];
  subjectiveNotes: string[];
  targetWpm: number;
}

export interface RecordingAnalysis {
  wordCount: number;
  wpm: number | null;
  articulationWpm?: number | null; // WPM over active speech only
  fillerTotal: number;
  fillers: Record<string, number>;
  repeats: string[];
  longPauses: number;
  volume: VolumeStats | null;
  coverage: number | null; // % of script words spoken in order (null if no script)
  pitch?: PitchStats | null;
  pauses?: PauseStats | null;
}

export interface Recording {
  id: string;
  createdAt: number;
  title: string;
  mode: string;
  language?: PracticeLanguage; // defaults to "en" for legacy recordings
  scriptText: string | null;
  transcript: string;
  durationSec: number;
  analysis: RecordingAnalysis;
  self: SelfScores | null;
  assessment?: DetailedAssessment | null;
  exerciseId?: string | null;
  attemptOf?: string | null;
  targetWpm?: number;
  hasAudio: boolean;
  mimeType: string;
  dayLabel: string; // e.g. "Week 1 · Day 3"
}

export interface PracticeLog {
  id: string;
  ts: number;
  date: string; // YYYY-MM-DD
  language?: PracticeLanguage; // defaults to "en" for legacy logs
  seconds: number;
  mode: string;
  completed: number; // exercises completed
  scores: SelfScores | null;
  overallScore?: number | null;
  note?: string;
}

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type PracticeMaterialType =
  | "short_sentence"
  | "paragraph"
  | "long_passage"
  | "storytelling"
  | "tongue_twister"
  | "conversation"
  | "impromptu";

export interface CoachedExercise {
  id: string;
  title: string;
  language?: PracticeLanguage; // defaults to "en"
  materialType: PracticeMaterialType;
  difficulty: Difficulty;
  skills: CoachSkillKey[];
  durationSec: number;
  reps: number;
  targetWpm: number;
  whatToDo: string;
  howToSpeak: string;
  emphasisWords: string[];
  pauseNotes: string;
  mistakesToAvoid: string[];
  /** Annotated text: **word** = emphasize, | = short pause, ‖ = full pause, ∧ = breath point */
  annotatedText: string;
  /** Clean text for script comparison and TTS model playback */
  plainText: string;
  /** Optional Romanized / Hinglish reading helper for Hindi scripts */
  romanizedText?: string;
  /** Optional conversation prompts or impromptu bullet framework */
  structureSteps?: string[];
  /** Optional specialty tags for targeted routines */
  focusTags?: ("stammering" | "youtube")[];
  category: string;
}

export interface Exercise {
  id: string;
  name: string;
  language?: PracticeLanguage;
  category: string;
  instructions: string;
  material: string[];
  durationSec: number;
  reps: number;
  restSec: number;
  difficulty: Difficulty;
  builtin: boolean;
  createdAt: number;
}

export type SpeakingGoalId =
  | "stammer_fluency"
  | "youtube_creator"
  | "clarity_pronunciation"
  | "presentations_work"
  | "everyday_conversation"
  | "interviews_pitching"
  | "pace_fillers"
  | "storytelling_expression";

export interface UserProfile {
  name: string;
  goals: SpeakingGoalId[];
  experienceLevel: Difficulty;
  selfWeaknesses: CoachSkillKey[];
  dailyMinutes: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt: number | null;
  baselineRecordingId: string | null;
}

export interface PlanPriority {
  skill: CoachSkillKey;
  reason: string;
  priority: 1 | 2 | 3;
}

export interface CoachPlan {
  adaptiveLevel: number; // 1..5
  difficulty: Difficulty;
  targetWpmMin: number;
  targetWpmMax: number;
  priorityAreas: PlanPriority[];
  dailyBlueprint: { slot: string; minutes: number; focus: string }[];
  lastUpdatedAt: number;
  adjustmentNote: string;
}

export interface SessionDebrief {
  id: string;
  createdAt: number;
  date: string; // YYYY-MM-DD
  language?: PracticeLanguage; // defaults to "en"
  durationSec: number;
  exercisesCompleted: string[]; // exercise titles
  exerciseIds: string[];
  recordingIds: string[];
  avgOverallScore: number | null;
  avgWpm: number | null;
  totalFillers: number;
  biggestWeakness: {
    skill: CoachSkillKey;
    label: string;
    evidence: string;
  };
  suggestions: string[];
  tomorrowExerciseIds: string[];
  planChangeNote: string;
  summary: string;
}

export interface ActiveTask {
  title: string;
  mode: string;
  language?: PracticeLanguage;
  script: string;
  romanizedText?: string;
  exerciseId?: string;
  targetWpm?: number;
  annotatedText?: string;
  coaching?: {
    whatToDo: string;
    howToSpeak: string;
    emphasisWords: string[];
    pauseNotes: string;
    mistakesToAvoid: string[];
  };
}

export interface Settings {
  theme: "light" | "dark";
  practiceLanguage?: PracticeLanguage; // active language: "en" | "hi"
  showHindiRomanized?: boolean; // toggle Romanized Hinglish guide under Devanagari scripts
  dailyGoalMin: number;
  difficulty: "easy" | "standard" | "intensive";
  currentDay: number; // 1..84
  completedDays: string[]; // "day-7"
  favorites: string[]; // exercise ids
  lastBackupAt: number | null;
  backupDismissedUntil: number | null;
  breathing: { inhale: number; hold: number; exhale: number };
  ttsRate: number;
  preferredVoice?: string | null;
  preferredVoiceHi?: string | null;
  task: ActiveTask | null;
  profile?: UserProfile;
  coachPlan?: CoachPlan;
  coachPlanByLang?: Partial<Record<PracticeLanguage, CoachPlan>>;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  goals: ["clarity_pronunciation"],
  experienceLevel: "beginner",
  selfWeaknesses: ["clarity", "fluency", "pacing"],
  dailyMinutes: 15,
  onboardingCompleted: false,
  onboardingCompletedAt: null,
  baselineRecordingId: null,
};

export const DEFAULT_COACH_PLAN: CoachPlan = {
  adaptiveLevel: 1,
  difficulty: "beginner",
  targetWpmMin: 110,
  targetWpmMax: 140,
  priorityAreas: [
    { skill: "clarity", reason: "Clean consonants and unhurried word endings build instant listener trust.", priority: 1 },
    { skill: "pacing", reason: "Establishing a calm 110–140 WPM baseline stops rushing under pressure.", priority: 2 },
    { skill: "fluency", reason: "Replacing filler sounds with deliberate silent beats improves poise.", priority: 3 },
  ],
  dailyBlueprint: [
    { slot: "Warm-up & Breath", minutes: 3, focus: "Diaphragmatic 3-4-6 breathing to anchor vocal support" },
    { slot: "Targeted Skill Drill", minutes: 4, focus: "Precision articulation & control for your #1 focus area" },
    { slot: "Coached Speaking Material", minutes: 5, focus: "Guided passage with emphasis, pause, and breath cues" },
    { slot: "Real-World Transfer", minutes: 3, focus: "Short recorded check-in to measure real progress" },
  ],
  lastUpdatedAt: 0,
  adjustmentNote: "Initial beginner-friendly plan created. Your coach will adapt after each scored recording.",
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  practiceLanguage: "en",
  showHindiRomanized: true,
  dailyGoalMin: 15,
  difficulty: "standard",
  currentDay: 1,
  completedDays: [],
  favorites: [],
  lastBackupAt: null,
  backupDismissedUntil: null,
  breathing: { inhale: 3, hold: 4, exhale: 6 },
  ttsRate: 0.9,
  preferredVoice: null,
  preferredVoiceHi: null,
  task: null,
  profile: DEFAULT_PROFILE,
  coachPlan: DEFAULT_COACH_PLAN,
  coachPlanByLang: {
    en: DEFAULT_COACH_PLAN,
    hi: {
      ...DEFAULT_COACH_PLAN,
      targetWpmMin: 100,
      targetWpmMax: 128,
      adjustmentNote: "Initial Hindi speech plan created. Hindi progress and adaptive level track independently from English.",
    },
  },
};

export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "err" | "info";
}

export const CATEGORIES = [
  "pronunciation",
  "clarity",
  "fluency",
  "pitch",
  "breathing",
  "confidence",
  "reading",
  "impromptu",
  "connected speech",
  "pacing",
  "storytelling",
  "conversation",
] as const;

export const COACH_SKILL_LABELS: Record<CoachSkillKey, string> = {
  pronunciation: "Pronunciation & Articulation",
  clarity: "Clarity",
  pacing: "Speaking Pace",
  fluency: "Fluency & Filler Control",
  pausesBreathing: "Pauses & Breathing",
  expression: "Intonation & Expression",
  projection: "Voice Projection & Volume",
  confidence: "Confidence & Spontaneous Speaking",
};

export const GOAL_OPTIONS: { id: SpeakingGoalId; label: string; desc: string; skills: CoachSkillKey[] }[] = [
  {
    id: "stammer_fluency",
    label: "Reduce stammering & stuttering (smooth fluency)",
    desc: "Gentle voice starts, light lip/tongue contact, calm airflow, and tension-free pausing.",
    skills: ["fluency", "pausesBreathing", "pacing"],
  },
  {
    id: "youtube_creator",
    label: "YouTube & on-camera speaking confidence",
    desc: "Natural camera energy, strong video intros, and smooth unscripted talking without rushing.",
    skills: ["confidence", "fluency", "expression"],
  },
  {
    id: "clarity_pronunciation",
    label: "Clearer pronunciation & articulation",
    desc: "Crisper consonants, cleaner word endings, and effortless intelligibility.",
    skills: ["pronunciation", "clarity"],
  },
  {
    id: "presentations_work",
    label: "Work meetings & presentations",
    desc: "Command the room with steady pace, projection, and intentional pauses.",
    skills: ["projection", "pausesBreathing", "pacing"],
  },
  {
    id: "everyday_conversation",
    label: "Confident everyday conversation",
    desc: "Sound natural, warm, and composed without freezing or rushing.",
    skills: ["confidence", "fluency", "expression"],
  },
  {
    id: "interviews_pitching",
    label: "Interviews & persuasive pitching",
    desc: "Structured, zero-filler answers that land with authority.",
    skills: ["fluency", "confidence", "pacing"],
  },
  {
    id: "pace_fillers",
    label: "Stop rushing & eliminate filler words",
    desc: "Replace um/uh/like with calm breathing and controlled timing.",
    skills: ["pacing", "fluency", "pausesBreathing"],
  },
  {
    id: "storytelling_expression",
    label: "Expressive storytelling & vocal variety",
    desc: "Break out of monotone delivery with pitch, stress, and emotional arc.",
    skills: ["expression", "pausesBreathing", "confidence"],
  },
];

export const MATERIAL_TYPE_LABELS: Record<PracticeMaterialType, string> = {
  short_sentence: "Short Sentences",
  paragraph: "Paragraphs",
  long_passage: "Long Passages",
  storytelling: "Storytelling",
  tongue_twister: "Tongue Twisters",
  conversation: "Conversations",
  impromptu: "Impromptu Topics",
};

// ---------- Personal Pronunciation Word Bank & Weak Sound Intelligence ----------

export type WordStatus = "difficult" | "learning" | "mastered";

export type SoundCategoryKey =
  | "th"
  | "r"
  | "l"
  | "s_sh"
  | "v_w"
  | "p_b_t_d"
  | "clusters"
  | "endings"
  | "vowels"
  // Hindi-specific articulation groups
  | "mahaprana"
  | "murdhanya"
  | "dantya"
  | "sibilants_hi"
  | "samyuktakshar"
  | "anusvara";

export const SOUND_CATEGORY_LABELS: Record<SoundCategoryKey, { label: string; short: string; phonemes: string }> = {
  th: { label: "TH Sounds", short: "TH", phonemes: "/θ/ · /ð/" },
  r: { label: "R Articulation", short: "R", phonemes: "/ɹ/" },
  l: { label: "L (Light & Dark)", short: "L", phonemes: "/l/ · /ɫ/" },
  s_sh: { label: "S / SH / CH Sibilants", short: "S / SH", phonemes: "/s/ · /ʃ/ · /tʃ/" },
  v_w: { label: "V vs W Contrast", short: "V / W", phonemes: "/v/ · /w/" },
  p_b_t_d: { label: "Plosives (P / B / T / D / K / G)", short: "P/B/T/D", phonemes: "/p,b,t,d,k,g/" },
  clusters: { label: "Consonant Clusters", short: "Clusters", phonemes: "str, thr, rld, sts…" },
  endings: { label: "Final Consonant Release", short: "Endings", phonemes: "-t, -d, -ts, -ks, -st" },
  vowels: { label: "Vowel Precision & Stress", short: "Vowels", phonemes: "syllable stress" },
  mahaprana: { label: "Hindi Aspirated (Mahaprana)", short: "ख/घ/थ/ध/फ", phonemes: "ख, घ, छ, ठ, थ, ध, फ, भ" },
  murdhanya: { label: "Hindi Retroflex (Murdhanya)", short: "ट/ड/ण/ड़", phonemes: "ट, ठ, ड, ढ, ण, ड़, ढ़" },
  dantya: { label: "Hindi Dental (Dantya)", short: "त/थ/द/ध", phonemes: "त, थ, द, ध, न" },
  sibilants_hi: { label: "Hindi Sibilants (Sh / S)", short: "श/ष/स", phonemes: "श, ष, स" },
  samyuktakshar: { label: "Hindi Conjuncts (Samyuktakshar)", short: "संयुक्त", phonemes: "क्ष, त्र, ज्ञ, श्र, प्र, स्त" },
  anusvara: { label: "Hindi Nasalization (Anusvara)", short: "अं/अँ", phonemes: "ं · ँ" },
};

export interface WordMouthGuide {
  tongue: string;
  lips: string;
  mouthAirflow: string;
}

export interface WordAttempt {
  id: string;
  ts: number;
  date: string; // YYYY-MM-DD
  speedMode: "slow" | "natural";
  transcript: string;
  matchedWord: boolean;
  similarityPct: number; // 0..100 objective string similarity
  selfScore: number | null; // 1..5 listening self-check
  score: number; // 0..100 honest combined score
  evidenceKind: "hybrid" | "measured" | "self";
  evidence: string;
  feedback: string;
  recordingId?: string | null;
}

export interface PersonalWord {
  id: string;
  word: string;
  normalized: string;
  language?: PracticeLanguage; // defaults to "en"
  status: WordStatus;
  phonetic: string;
  ipa: string;
  ipaSource: "dictionary" | "estimated" | "custom";
  meaning: string;
  exampleSentence: string;
  mouthGuide: WordMouthGuide;
  soundTags: SoundCategoryKey[];
  source: "manual" | "assessment" | "exercise";
  notes?: string;
  attempts: WordAttempt[];
  masteryScore: number; // 0..100
  consecutiveSuccessDays: number;
  intervalDays: number; // spaced repetition interval in days
  nextReviewAt: number; // epoch ms when next due
  lastPracticedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface WeakSoundFinding {
  sound: SoundCategoryKey;
  label: string;
  short: string;
  phonemes: string;
  issueCount: number;
  avgAccuracy: number | null; // 0..100 across words with this sound
  severity: "high" | "medium" | "watch";
  sampleWords: string[];
  placementCue: string;
  recommendedExerciseIds: string[];
}

export interface WeakComboFinding {
  comboKey: string;
  label: string;
  words: string[];
  tip: string;
}

export interface BeforeAfterComparison {
  kind: "word" | "overall";
  beforeLabel: string;
  afterLabel: string;
  beforeDate: number;
  afterDate: number;
  beforeScore: number;
  afterScore: number;
  delta: number;
  beforeRecordingId?: string | null;
  afterRecordingId?: string | null;
  beforeTranscript?: string;
  afterTranscript?: string;
  improvements: string[];
  remainingFocus: string[];
}

// ---------- Speaker Shadowing Studio (Reference Audio + Delivery Matching) ----------

export interface SpeakerAcousticProfile {
  totalDurationSec: number;
  activeDurationSec: number;
  startSec: number; // first active speech boundary
  endSec: number; // last active speech boundary
  estimatedWpm: number | null;
  medianPitchHz: number | null;
  pitchRangeSt: number; // p90-p10 semitone range
  voicedRatio: number; // 0..1
  speechDutyCycle: number; // 0..1 fraction of active window spent speaking vs pausing
  pauseCount: number;
  /** Normalized pause windows inside active speech [start01, end01] */
  pauses: { start: number; end: number; durMs: number }[];
  /** 64-bin normalized energy contour (0..1) over active speech */
  energyContour: number[];
  /** 64-bin speaker-normalized pitch melody in semitones relative to speaker's own median F0 (null = unvoiced/pause) */
  pitchContourSt: (number | null)[];
  /** Normalized indices (0..1) of major emphasis peaks */
  emphasisPeaks: number[];
}

export interface ShadowComparison {
  overallMatch: number; // 0..100 honest acoustic delivery match
  paceScore: number; // 0..100
  rhythmScore: number; // 0..100 (pause placement & speech-to-pause ratio)
  intonationScore: number; // 0..100 (speaker-normalized pitch melody similarity)
  emphasisScore: number; // 0..100 (volume/energy contour match)
  wordMatchPct: number | null; // 0..100 optional transcript match if captured
  paceRatioPct: number; // e.g. 112 means user was 12% faster than speaker
  pitchSpanDiffSt: number; // user pitchRangeSt - ref pitchRangeSt
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface ShadowAttempt {
  id: string;
  ts: number;
  date: string;
  playbackRateUsed: number;
  mode: "echo" | "simultaneous";
  transcript: string;
  audioBlobKey: string;
  mimeType: string;
  profile: SpeakerAcousticProfile;
  comparison: ShadowComparison;
}

export interface ShadowItem {
  id: string;
  title: string;
  language: PracticeLanguage;
  script: string;
  romanizedText?: string;
  speakerNotes?: string;
  audioBlobKey: string;
  mimeType: string;
  fileName: string;
  profile: SpeakerAcousticProfile;
  attempts: ShadowAttempt[];
  bestScore: number | null;
  createdAt: number;
  updatedAt: number;
}

export function dateKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
