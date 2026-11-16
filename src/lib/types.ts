export type SkillKey = "clarity" | "pronunciation" | "fluency" | "pacing" | "vocalControl";

export interface SelfScores {
  clarity: number;
  pronunciation: number;
  fluency: number;
  pacing: number;
  vocalControl: number;
}

export const EMPTY_SCORES: SelfScores = { clarity: 0, pronunciation: 0, fluency: 0, pacing: 0, vocalControl: 0 };

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
}

export interface RecordingAnalysis {
  wordCount: number;
  wpm: number | null;
  fillerTotal: number;
  fillers: Record<string, number>;
  repeats: string[];
  longPauses: number;
  volume: VolumeStats | null;
  coverage: number | null; // % of script words spoken in order (null if no script)
}

export interface Recording {
  id: string;
  createdAt: number;
  title: string;
  mode: string;
  scriptText: string | null;
  transcript: string;
  durationSec: number;
  analysis: RecordingAnalysis;
  self: SelfScores | null;
  hasAudio: boolean;
  mimeType: string;
  dayLabel: string; // e.g. "Week 1 · Day 3"
}

export interface PracticeLog {
  id: string;
  ts: number;
  date: string; // YYYY-MM-DD
  seconds: number;
  mode: string;
  completed: number; // exercises completed
  scores: SelfScores | null;
  note?: string;
}

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
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

export interface Settings {
  theme: "light" | "dark";
  dailyGoalMin: number;
  difficulty: "easy" | "standard" | "intensive";
  currentDay: number; // 1..84
  completedDays: string[]; // "day-7"
  favorites: string[]; // exercise ids
  lastBackupAt: number | null;
  backupDismissedUntil: number | null;
  breathing: { inhale: number; hold: number; exhale: number };
  ttsRate: number;
  task: { title: string; mode: string; script: string } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  dailyGoalMin: 15,
  difficulty: "standard",
  currentDay: 1,
  completedDays: [],
  favorites: [],
  lastBackupAt: null,
  backupDismissedUntil: null,
  breathing: { inhale: 3, hold: 4, exhale: 6 },
  ttsRate: 0.9,
  task: null,
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
] as const;

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
