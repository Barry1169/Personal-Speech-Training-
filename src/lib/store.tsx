"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { idbAll, idbGet, idbPut, idbDelete, idbClear, blobToB64, b64ToBlob } from "./idb";
import {
  type BeforeAfterComparison,
  type CoachPlan,
  type CoachedExercise,
  type Exercise,
  type PersonalWord,
  type PracticeLanguage,
  type PracticeLog,
  type Recording,
  type ResolvedProblemWord,
  type SessionDebrief,
  type Settings,
  type ShadowAttempt,
  type ShadowItem,
  type Toast,
  type UserProfile,
  type WeakComboFinding,
  type WeakSoundFinding,
  type WordAttempt,
  DEFAULT_COACH_PLAN,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  PRACTICE_LANGUAGE_META,
  dateKey,
  langOf,
} from "./types";
import { computeBadges, streaksFromDates, type Badge, type StatsPack } from "./coach";
import {
  analyzeCommonMistakes,
  computeOverallImprovement,
  deriveSkillStandings,
  getRecordingAssessment,
  selectDailySession,
  type CommonMistakesReport,
  type DailySessionPlan,
  type ImprovementSummary,
  type SkillStanding,
} from "./adaptiveCoach";
import {
  FIVE_REP_PASS_THRESHOLD,
  applyFiveRepResult,
  applyWordAttempt,
  buildCustomWordCoachedExercise,
  compareOverallBeforeAfter,
  createPersonalWord,
  detectWeakSounds,
  getDueWords,
  normalizeWord,
  type CreatePersonalWordOptions,
} from "./pronunciation";

interface ExportPayload {
  app: "speechcoach";
  version: number;
  exportedAt: number;
  settings: Settings;
  exercises: Exercise[];
  logs: PracticeLog[];
  recordings: Recording[];
  debriefs?: SessionDebrief[];
  words?: PersonalWord[];
  shadowItems?: ShadowItem[];
  blobs: Record<string, { mime: string; data: string }>;
}

export interface AddWordModalState {
  open: boolean;
  initialWord: string;
  source: PersonalWord["source"];
  editingWord: PersonalWord | null;
}

export interface FiveRepTarget {
  word: string;
  language?: PracticeLanguage;
  context?: string;
  correctionTip?: string;
}

export interface QuickWordModalState {
  open: boolean;
  initialWord: string;
  autoRecord: boolean;
  sessionKey: number;
}

export type AddWordStoreOptions = CreatePersonalWordOptions & {
  userRecordingBlob?: Blob | null;
  silent?: boolean;
};

export interface LangProgressSummary {
  language: PracticeLanguage;
  label: string;
  nativeLabel: string;
  totalSec: number;
  sessionCount: number;
  recordingCount: number;
  currentStreak: number;
  bestStreak: number;
  avgScore: number | null;
  wordCount: number;
  masteredWords: number;
  adaptiveLevel: number;
}

function defaultPlanForLang(lang: PracticeLanguage): CoachPlan {
  if (lang === "hi") {
    return {
      ...DEFAULT_COACH_PLAN,
      targetWpmMin: 100,
      targetWpmMax: 128,
      adjustmentNote:
        "Initial Hindi speech plan created. Hindi progress, streak, and adaptive level track independently from English.",
    };
  }
  return DEFAULT_COACH_PLAN;
}

function computeStatsPack(logs: PracticeLog[], recordings: Recording[]): StatsPack {
  const totalSec = logs.reduce((a, l) => a + l.seconds, 0);
  const dates = [...new Set(logs.map((l) => l.date))];
  const st = streaksFromDates(dates);
  const bestAvgScore = recordings.reduce((best, r) => {
    if (!r.self) return best;
    const vals = [r.self.clarity, r.self.pronunciation, r.self.fluency, r.self.pacing, r.self.vocalControl].filter(
      (v) => v > 0
    );
    if (!vals.length) return best;
    return Math.max(best, vals.reduce((a, b) => a + b, 0) / vals.length);
  }, 0);
  const maxWpm = recordings.reduce((m, r) => Math.max(m, r.analysis.wpm ?? 0), 0);
  const minFillerRecording = recordings
    .filter((r) => r.analysis.fillerTotal === 0)
    .reduce((m, r) => Math.max(m, r.analysis.wordCount), 0);
  return {
    totalSec,
    sessionCount: logs.length,
    recordingCount: recordings.length,
    currentStreak: st.current,
    bestStreak: st.best,
    bestAvgScore,
    maxWpm,
    minFillerRecording,
    daysPracticed: dates.length,
  };
}

interface Store {
  hydrated: boolean;
  nowMs: number;
  practiceLanguage: PracticeLanguage;
  setPracticeLanguage: (lang: PracticeLanguage) => void;
  settings: Settings;
  profile: UserProfile;
  coachPlan: CoachPlan;
  exercises: Exercise[];
  /** Scoped to active practiceLanguage (separate English & Hindi progress!) */
  logs: PracticeLog[];
  recordings: Recording[];
  debriefs: SessionDebrief[];
  words: PersonalWord[];
  /** Full cross-language arrays for storage stats & side-by-side summary */
  allLogs: PracticeLog[];
  allRecordings: Recording[];
  allDebriefs: SessionDebrief[];
  allWords: PersonalWord[];
  langSummaries: Record<PracticeLanguage, LangProgressSummary>;
  /** Speaker Shadowing Studio items */
  shadowItems: ShadowItem[];
  addShadowItem: (item: ShadowItem, refBlob: Blob) => Promise<void>;
  deleteShadowItem: (id: string) => Promise<void>;
  recordShadowAttempt: (itemId: string, attempt: ShadowAttempt, attemptBlob: Blob) => Promise<ShadowItem | null>;
  toasts: Toast[];
  guidedOpen: boolean;
  setGuidedOpen: (open: boolean) => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  addWordModal: AddWordModalState;
  openAddWord: (initialWord?: string, source?: PersonalWord["source"]) => void;
  openEditWord: (word: PersonalWord) => void;
  closeAddWord: () => void;
  practiceWordId: string | null;
  setPracticeWordId: (id: string | null) => void;
  fiveRepTarget: FiveRepTarget | null;
  openFiveRepPractice: (target: FiveRepTarget) => void;
  closeFiveRepPractice: () => void;
  completeFiveRepSession: (params: {
    word: string;
    language?: PracticeLanguage;
    reps: { transcript: string; correct: boolean; similarityPct: number; ts: number }[];
    durationSec: number;
  }) => Promise<{ passed: boolean; correctCount: number; resolvedWord: boolean }>;
  isProblemWordResolved: (rawWord: string, lang?: PracticeLanguage) => boolean;
  resolvedProblemWords: ResolvedProblemWord[];
  quickWordModal: QuickWordModalState;
  openQuickWord: (initialWord?: string, autoRecord?: boolean) => void;
  closeQuickWord: () => void;
  completeQuickWordCheck: (word: string, lang?: PracticeLanguage, durationSec?: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateCoachPlan: (plan: CoachPlan, lang?: PracticeLanguage) => void;
  completeOnboarding: (profile: UserProfile, plan: CoachPlan) => void;
  toggleFavorite: (id: string) => void;
  addExercise: (e: Omit<Exercise, "id" | "createdAt" | "builtin">) => void;
  updateExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;
  addWord: (
    rawWord: string,
    opts?: AddWordStoreOptions
  ) => { word: PersonalWord; existed: boolean };
  addWordsBatch: (
    rawWords: string[],
    opts?: Omit<AddWordStoreOptions, "userRecordingBlob">
  ) => { added: PersonalWord[]; skipped: PersonalWord[] };
  updateWord: (word: PersonalWord, userRecordingBlob?: Blob | null) => void;
  deleteWord: (id: string) => void;
  saveBlob: (key: string, blob: Blob) => Promise<void>;
  deleteBlob: (key: string) => Promise<void>;
  recordWordAttempt: (
    wordId: string,
    attempt: WordAttempt,
    recording?: Recording | null,
    blob?: Blob | null
  ) => Promise<PersonalWord | null>;
  addLog: (l: Omit<PracticeLog, "id" | "ts" | "date"> & { ts?: number }) => void;
  saveRecording: (r: Recording, blob: Blob | null) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  saveDebrief: (d: SessionDebrief, updatedPlan?: CoachPlan) => Promise<void>;
  getBlob: (id: string) => Promise<Blob | undefined>;
  markDayDone: (dayNum: number) => void;
  exportJSON: (includeAudio: boolean) => Promise<{ ok: boolean; skippedAudio: boolean }>;
  importJSON: (file: File) => Promise<{ ok: boolean; msg: string }>;
  clearAllData: () => Promise<void>;
  toast: (msg: string, kind?: Toast["kind"], durationMs?: number) => void;
  dismissToast: (id: number) => void;
  stats: StatsPack;
  badges: Badge[];
  skillAverages: Record<string, number | null>;
  skillStandings: SkillStanding[];
  improvement: ImprovementSummary;
  commonMistakes: CommonMistakesReport;
  dueWords: PersonalWord[];
  weakSounds: WeakSoundFinding[];
  weakCombos: WeakComboFinding[];
  overallBeforeAfter: BeforeAfterComparison | null;
  customWordExercise: CoachedExercise | null;
  todayPlan: DailySessionPlan;
  backupDue: boolean;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}

let toastId = 1;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allLogs, setAllLogs] = useState<PracticeLog[]>([]);
  const [allRecordings, setAllRecordings] = useState<Recording[]>([]);
  const [allDebriefs, setAllDebriefs] = useState<SessionDebrief[]>([]);
  const [allWords, setAllWords] = useState<PersonalWord[]>([]);
  const [shadowItems, setShadowItems] = useState<ShadowItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [addWordModal, setAddWordModal] = useState<AddWordModalState>({
    open: false,
    initialWord: "",
    source: "manual",
    editingWord: null,
  });
  const [practiceWordId, setPracticeWordId] = useState<string | null>(null);
  const [fiveRepTarget, setFiveRepTarget] = useState<FiveRepTarget | null>(null);
  const [quickWordModal, setQuickWordModal] = useState<QuickWordModalState>({
    open: false,
    initialWord: "",
    autoRecord: false,
    sessionKey: 0,
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const practiceLanguage: PracticeLanguage = settings.practiceLanguage === "hi" ? "hi" : "en";
  const practiceLangRef = useRef<PracticeLanguage>(practiceLanguage);
  useEffect(() => {
    practiceLangRef.current = practiceLanguage;
  }, [practiceLanguage]);

  const allWordsRef = useRef(allWords);
  useEffect(() => {
    allWordsRef.current = allWords;
  }, [allWords]);

  const shadowRef = useRef(shadowItems);
  useEffect(() => {
    shadowRef.current = shadowItems;
  }, [shadowItems]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok", durationMs = 3600) => {
    const id = toastId++;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), Math.max(1200, durationMs));
  }, []);

  const openFiveRepPractice = useCallback((target: FiveRepTarget) => {
    setFiveRepTarget(target);
  }, []);

  const closeFiveRepPractice = useCallback(() => {
    setFiveRepTarget(null);
  }, []);

  const openQuickWord = useCallback((initialWord = "", autoRecord = false) => {
    setQuickWordModal((prev) => ({
      open: true,
      initialWord,
      autoRecord,
      sessionKey: prev.sessionKey + 1,
    }));
  }, []);

  const closeQuickWord = useCallback(() => {
    setQuickWordModal((prev) => ({ ...prev, open: false, autoRecord: false }));
  }, []);

  const openAddWord = useCallback((initialWord = "", source: PersonalWord["source"] = "manual") => {
    setAddWordModal({ open: true, initialWord, source, editingWord: null });
  }, []);

  const openEditWord = useCallback((word: PersonalWord) => {
    setAddWordModal({ open: true, initialWord: word.word, source: word.source, editingWord: word });
  }, []);

  const closeAddWord = useCallback(() => {
    setAddWordModal((prev) => ({ ...prev, open: false, editingWord: null }));
  }, []);

  // ---- hydrate from IndexedDB ----
  useEffect(() => {
    (async () => {
      try {
        const [st, ex, lg, rec, deb, wds, sh] = await Promise.all([
          idbGet<Settings & { key: string }>("kv", "settings"),
          idbAll<Exercise>("exercises"),
          idbAll<PracticeLog>("logs"),
          idbAll<Recording>("recordings"),
          idbAll<SessionDebrief>("debriefs").catch(() => [] as SessionDebrief[]),
          idbAll<PersonalWord>("words").catch(() => [] as PersonalWord[]),
          idbAll<ShadowItem>("shadowItems").catch(() => [] as ShadowItem[]),
        ]);

        const mergedProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          ...(st?.profile ?? {}),
        };

        if (!mergedProfile.onboardingCompleted && (lg.length > 0 || rec.length > 0)) {
          mergedProfile.onboardingCompleted = true;
          mergedProfile.dailyMinutes = st?.dailyGoalMin ?? DEFAULT_PROFILE.dailyMinutes;
        }

        const enPlan: CoachPlan = {
          ...DEFAULT_COACH_PLAN,
          ...(st?.coachPlanByLang?.en ?? st?.coachPlan ?? {}),
        };
        const hiPlan: CoachPlan = {
          ...defaultPlanForLang("hi"),
          ...(st?.coachPlanByLang?.hi ?? {}),
        };
        const activeLang: PracticeLanguage = st?.practiceLanguage === "hi" ? "hi" : "en";

        const mergedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...(st ?? {}),
          practiceLanguage: activeLang,
          profile: mergedProfile,
          coachPlan: activeLang === "hi" ? hiPlan : enPlan,
          coachPlanByLang: { en: enPlan, hi: hiPlan },
        };

        setNowMs(Date.now());
        setSettingsState(mergedSettings);
        setExercises(ex);
        setAllLogs(lg);
        setAllRecordings(rec.sort((a, b) => b.createdAt - a.createdAt));
        setAllDebriefs(deb.sort((a, b) => b.createdAt - a.createdAt));
        setAllWords(wds.sort((a, b) => b.updatedAt - a.updatedAt));
        setShadowItems(sh.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (e) {
        console.error("IDB hydrate failed", e);
        setNowMs(Date.now());
        toast("Could not open local database — data may not persist.", "err");
      } finally {
        setHydrated(true);
      }
    })();
  }, [toast]);

  // ---- theme ----
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    const normalizedPatch: Partial<Settings> =
      patch.task && !patch.task.loadedAt
        ? { ...patch, task: { ...patch.task, loadedAt: Date.now() } }
        : patch;
    setSettingsState((prev) => {
      const next = { ...prev, ...normalizedPatch };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const setPracticeLanguage = useCallback(
    (lang: PracticeLanguage) => {
      setSettingsState((prev) => {
        const planForLang =
          prev.coachPlanByLang?.[lang] ?? (lang === "en" ? prev.coachPlan ?? DEFAULT_COACH_PLAN : defaultPlanForLang("hi"));
        const next: Settings = {
          ...prev,
          practiceLanguage: lang,
          coachPlan: planForLang,
          coachPlanByLang: {
            en: prev.coachPlanByLang?.en ?? prev.coachPlan ?? DEFAULT_COACH_PLAN,
            hi: prev.coachPlanByLang?.hi ?? defaultPlanForLang("hi"),
          },
        };
        void idbPut("kv", { ...next, key: "settings" });
        return next;
      });
      setPracticeWordId(null);
      toast(
        lang === "hi"
          ? "Switched to Hindi practice (हिन्दी) — separate Hindi progress & Word Bank active"
          : "Switched to English practice — separate English progress & Word Bank active",
        "info"
      );
    },
    [toast]
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setSettingsState((prev) => {
      const profile: UserProfile = { ...DEFAULT_PROFILE, ...(prev.profile ?? {}), ...patch };
      const next: Settings = {
        ...prev,
        profile,
        dailyGoalMin: patch.dailyMinutes ?? prev.dailyGoalMin,
      };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const updateCoachPlan = useCallback((coachPlan: CoachPlan, lang?: PracticeLanguage) => {
    setSettingsState((prev) => {
      const targetLang = lang ?? (prev.practiceLanguage === "hi" ? "hi" : "en");
      const byLang = {
        en: prev.coachPlanByLang?.en ?? prev.coachPlan ?? DEFAULT_COACH_PLAN,
        hi: prev.coachPlanByLang?.hi ?? defaultPlanForLang("hi"),
        [targetLang]: coachPlan,
      };
      const next: Settings = {
        ...prev,
        coachPlan: targetLang === (prev.practiceLanguage === "hi" ? "hi" : "en") ? coachPlan : prev.coachPlan,
        coachPlanByLang: byLang,
      };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((profile: UserProfile, coachPlan: CoachPlan) => {
    setSettingsState((prev) => {
      const activeLang: PracticeLanguage = prev.practiceLanguage === "hi" ? "hi" : "en";
      const finalProfile: UserProfile = {
        ...profile,
        onboardingCompleted: true,
        onboardingCompletedAt: profile.onboardingCompletedAt ?? Date.now(),
      };
      const byLang = {
        en: prev.coachPlanByLang?.en ?? coachPlan,
        hi: prev.coachPlanByLang?.hi ?? {
          ...coachPlan,
          targetWpmMin: Math.min(coachPlan.targetWpmMin, 102),
          targetWpmMax: Math.min(coachPlan.targetWpmMax, 128),
          adjustmentNote: "Initial Hindi plan aligned to your goals. Tracks independently from English.",
        },
        [activeLang]: coachPlan,
      };
      const next: Settings = {
        ...prev,
        dailyGoalMin: finalProfile.dailyMinutes,
        profile: finalProfile,
        coachPlan,
        coachPlanByLang: byLang,
      };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
    setOnboardingOpen(false);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSettingsState((prev) => {
      const favorites = prev.favorites.includes(id)
        ? prev.favorites.filter((f) => f !== id)
        : [...prev.favorites, id];
      const next = { ...prev, favorites };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const addExercise = useCallback(
    (e: Omit<Exercise, "id" | "createdAt" | "builtin">) => {
      const full: Exercise = {
        ...e,
        language: e.language ?? practiceLangRef.current,
        id: `cx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        builtin: false,
        createdAt: Date.now(),
      };
      setExercises((prev) => [full, ...prev]);
      void idbPut("exercises", full);
      toast("Exercise added to your library");
    },
    [toast]
  );

  const updateExercise = useCallback(
    (e: Exercise) => {
      setExercises((prev) => prev.map((x) => (x.id === e.id ? e : x)));
      void idbPut("exercises", e);
      toast("Exercise updated");
    },
    [toast]
  );

  const deleteExercise = useCallback(
    (id: string) => {
      setExercises((prev) => prev.filter((x) => x.id !== id));
      void idbDelete("exercises", id);
      setSettingsState((prev) => {
        const next = { ...prev, favorites: prev.favorites.filter((f) => f !== id) };
        void idbPut("kv", { ...next, key: "settings" });
        return next;
      });
      toast("Exercise deleted", "info");
    },
    [toast]
  );

  // ---- Personal Pronunciation Word Bank CRUD & Spaced-Repetition ----

  const saveBlob = useCallback(async (key: string, blob: Blob) => {
    await idbPut("blobs", blob, key);
  }, []);

  const deleteBlob = useCallback(async (key: string) => {
    await idbDelete("blobs", key).catch(() => undefined);
  }, []);

  const unresolveProblemWord = useCallback((norm: string, lang: PracticeLanguage) => {
    setSettingsState((prev) => {
      const list = prev.resolvedProblemWords ?? [];
      if (!list.some((r) => r.normalized === norm && r.language === lang)) return prev;
      const next: Settings = {
        ...prev,
        resolvedProblemWords: list.filter((r) => !(r.normalized === norm && r.language === lang)),
      };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const addWord = useCallback(
    (rawWord: string, opts?: AddWordStoreOptions) => {
      const targetLang = opts?.language ?? practiceLangRef.current;
      const norm = normalizeWord(rawWord);
      const existing = allWordsRef.current.find((w) => w.normalized === norm && langOf(w) === targetLang);
      if (existing) {
        // Reactivate if it had been cleared from active practice or enrich with new detectedPronunciation/recording
        const needsUpdate =
          Boolean(existing.clearedFromActive) ||
          Boolean(opts?.detectedPronunciation && opts.detectedPronunciation !== existing.detectedPronunciation) ||
          Boolean(opts?.userRecordingBlob && opts?.userRecordingBlobKey);

        if (needsUpdate) {
          const refreshed: PersonalWord = {
            ...existing,
            status: existing.clearedFromActive ? opts?.status ?? "difficult" : existing.status,
            clearedFromActive: false,
            detectedPronunciation: opts?.detectedPronunciation?.trim() || existing.detectedPronunciation,
            userRecordingBlobKey: opts?.userRecordingBlobKey || existing.userRecordingBlobKey,
            userRecordingMimeType: opts?.userRecordingMimeType || existing.userRecordingMimeType,
            userRecordingTranscript: opts?.userRecordingTranscript?.trim() || existing.userRecordingTranscript,
            nextReviewAt: existing.clearedFromActive ? Date.now() : existing.nextReviewAt,
            updatedAt: Date.now(),
          };
          allWordsRef.current = allWordsRef.current.map((w) => (w.id === refreshed.id ? refreshed : w));
          setAllWords((prev) => prev.map((w) => (w.id === refreshed.id ? refreshed : w)));
          void idbPut("words", refreshed);
          if (opts?.userRecordingBlob && opts?.userRecordingBlobKey) {
            void idbPut("blobs", opts.userRecordingBlob, opts.userRecordingBlobKey);
          }
          unresolveProblemWord(norm, targetLang);
          if (!opts?.silent) {
            toast(
              existing.clearedFromActive
                ? `Re-activated "${refreshed.word}" in your ${targetLang === "hi" ? "Hindi" : "English"} Word Bank`
                : `Updated "${refreshed.word}" in your ${targetLang === "hi" ? "Hindi" : "English"} Word Bank`,
              "info"
            );
          }
          return { word: refreshed, existed: true };
        }

        if (!opts?.silent) {
          toast(`"${existing.word}" is already in your ${targetLang === "hi" ? "Hindi" : "English"} Word Bank`, "info");
        }
        return { word: existing, existed: true };
      }

      const { userRecordingBlob, silent, ...createOpts } = opts ?? {};
      const blobKey =
        userRecordingBlob && !createOpts.userRecordingBlobKey
          ? `wordrec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
          : createOpts.userRecordingBlobKey;
      const blobMime =
        userRecordingBlob && !createOpts.userRecordingMimeType
          ? userRecordingBlob.type || "audio/webm"
          : createOpts.userRecordingMimeType;

      const created = createPersonalWord(rawWord, {
        ...createOpts,
        language: targetLang,
        userRecordingBlobKey: blobKey,
        userRecordingMimeType: blobMime,
      });
      allWordsRef.current = [created, ...allWordsRef.current];
      setAllWords((prev) => [created, ...prev]);
      void idbPut("words", created);
      if (userRecordingBlob && blobKey) {
        void idbPut("blobs", userRecordingBlob, blobKey);
      }
      unresolveProblemWord(created.normalized, targetLang);
      if (!silent) {
        toast(`Added "${created.word}" to your ${targetLang === "hi" ? "Hindi" : "English"} Word Bank`);
      }
      return { word: created, existed: false };
    },
    [toast, unresolveProblemWord]
  );

  const addWordsBatch = useCallback(
    (rawWords: string[], opts?: Omit<AddWordStoreOptions, "userRecordingBlob">) => {
      const targetLang = opts?.language ?? practiceLangRef.current;
      const added: PersonalWord[] = [];
      const skipped: PersonalWord[] = [];
      const seenNorms = new Set<string>();
      const { silent, ...createOpts } = opts ?? {};

      for (const raw of rawWords) {
        const cleaned = raw.trim();
        const norm = normalizeWord(cleaned);
        if (!norm || seenNorms.has(norm)) continue;
        seenNorms.add(norm);

        const existing = allWordsRef.current.find(
          (w) => w.normalized === norm && langOf(w) === targetLang && !w.clearedFromActive
        );
        if (existing) {
          skipped.push(existing);
          continue;
        }

        const clearedExisting = allWordsRef.current.find(
          (w) => w.normalized === norm && langOf(w) === targetLang && w.clearedFromActive
        );
        if (clearedExisting) {
          const revived: PersonalWord = {
            ...clearedExisting,
            status: createOpts.status ?? "difficult",
            clearedFromActive: false,
            nextReviewAt: Date.now(),
            updatedAt: Date.now(),
          };
          allWordsRef.current = allWordsRef.current.map((w) => (w.id === revived.id ? revived : w));
          void idbPut("words", revived);
          unresolveProblemWord(norm, targetLang);
          added.push(revived);
          continue;
        }

        const created = createPersonalWord(cleaned, { ...createOpts, language: targetLang });
        allWordsRef.current = [created, ...allWordsRef.current];
        void idbPut("words", created);
        unresolveProblemWord(created.normalized, targetLang);
        added.push(created);
      }

      if (added.length > 0) {
        const nextSnapshot = [...allWordsRef.current];
        setAllWords(nextSnapshot);
      }

      if (!silent) {
        const bankLabel = targetLang === "hi" ? "Hindi Word Bank" : "Word Bank";
        if (added.length > 0 && skipped.length > 0) {
          toast(
            `Added ${added.length} new word${added.length === 1 ? "" : "s"} to ${bankLabel} (${skipped.length} already saved)`
          );
        } else if (added.length > 0) {
          toast(`Added all ${added.length} word${added.length === 1 ? "" : "s"} to your ${bankLabel}`);
        } else if (skipped.length > 0) {
          toast(`All ${skipped.length} word${skipped.length === 1 ? " is" : "s are"} already in your ${bankLabel}`, "info");
        }
      }
      return { added, skipped };
    },
    [toast, unresolveProblemWord]
  );

  const updateWord = useCallback(
    (word: PersonalWord, userRecordingBlob?: Blob | null) => {
      const prevWord = allWordsRef.current.find((w) => w.id === word.id);
      if (
        prevWord?.userRecordingBlobKey &&
        prevWord.userRecordingBlobKey !== word.userRecordingBlobKey
      ) {
        void idbDelete("blobs", prevWord.userRecordingBlobKey).catch(() => undefined);
      }
      const stamped: PersonalWord = {
        ...word,
        language: langOf(word),
        normalized: normalizeWord(word.word),
        updatedAt: Date.now(),
      };
      allWordsRef.current = allWordsRef.current.map((w) => (w.id === stamped.id ? stamped : w));
      setAllWords((prev) => prev.map((w) => (w.id === stamped.id ? stamped : w)));
      void idbPut("words", stamped);
      if (userRecordingBlob && stamped.userRecordingBlobKey) {
        void idbPut("blobs", userRecordingBlob, stamped.userRecordingBlobKey);
      }
      toast(`Updated "${stamped.word}"`);
    },
    [toast]
  );

  const deleteWord = useCallback(
    (id: string) => {
      const target = allWordsRef.current.find((w) => w.id === id);
      if (target?.userRecordingBlobKey) {
        void idbDelete("blobs", target.userRecordingBlobKey).catch(() => undefined);
      }
      allWordsRef.current = allWordsRef.current.filter((w) => w.id !== id);
      setAllWords((prev) => prev.filter((w) => w.id !== id));
      void idbDelete("words", id);
      setPracticeWordId((cur) => (cur === id ? null : cur));
      toast(target ? `Removed "${target.word}" from Word Bank` : "Word removed", "info");
    },
    [toast]
  );

  const addLog = useCallback((l: Omit<PracticeLog, "id" | "ts" | "date"> & { ts?: number }) => {
    const ts = l.ts ?? Date.now();
    const full: PracticeLog = {
      id: `log-${ts.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ts,
      date: dateKey(ts),
      language: l.language ?? practiceLangRef.current,
      seconds: l.seconds,
      mode: l.mode,
      completed: l.completed,
      scores: l.scores,
      overallScore: l.overallScore ?? null,
      note: l.note,
    };
    setAllLogs((prev) => [full, ...prev]);
    void idbPut("logs", full);
  }, []);

  const saveRecording = useCallback(async (r: Recording, blob: Blob | null) => {
    const stamped: Recording = { ...r, language: r.language ?? practiceLangRef.current };
    await idbPut("recordings", stamped);
    if (blob) await idbPut("blobs", blob, stamped.id);
    setAllRecordings((prev) => [stamped, ...prev.filter((p) => p.id !== stamped.id)]);
  }, []);

  const recordWordAttempt = useCallback(
    async (
      wordId: string,
      attempt: WordAttempt,
      recording?: Recording | null,
      blob?: Blob | null
    ): Promise<PersonalWord | null> => {
      const current = allWordsRef.current.find((w) => w.id === wordId);
      if (!current) return null;
      const wordLang = langOf(current);

      if (recording) {
        await saveRecording({ ...recording, language: wordLang }, blob ?? null);
      }

      const prevStatus = current.status;
      const updated = applyWordAttempt(current, attempt);
      await idbPut("words", updated);
      setAllWords((prev) => [updated, ...prev.filter((w) => w.id !== updated.id)]);
      setNowMs(Date.now());

      addLog({
        language: wordLang,
        seconds: Math.max(15, recording?.durationSec ?? 25),
        mode: "word-bank",
        completed: 1,
        scores: attempt.selfScore
          ? {
              clarity: attempt.selfScore,
              pronunciation: attempt.selfScore,
              fluency: 0,
              pacing: 0,
              vocalControl: 0,
            }
          : null,
        overallScore: attempt.score,
        note: `Word practice: ${updated.word} (${attempt.speedMode})`,
      });

      if (prevStatus !== "mastered" && updated.status === "mastered") {
        toast(`Mastered "${updated.word}"! Scheduled spaced review in ${updated.intervalDays}d.`);
      } else if (prevStatus === "difficult" && updated.status === "learning") {
        toast(`"${updated.word}" moved to Learning (${updated.masteryScore}/100)!`);
      } else {
        toast(`Saved "${updated.word}" attempt — ${attempt.score}/100`);
      }
      return updated;
    },
    [addLog, saveRecording, toast]
  );

  const completeFiveRepSession = useCallback(
    async (params: {
      word: string;
      language?: PracticeLanguage;
      reps: { transcript: string; correct: boolean; similarityPct: number; ts: number }[];
      durationSec: number;
    }): Promise<{ passed: boolean; correctCount: number; resolvedWord: boolean }> => {
      const lang = params.language ?? practiceLangRef.current;
      const norm = normalizeWord(params.word);
      const now = Date.now();
      const correctCount = params.reps.filter((r) => r.correct).length;
      const totalCount = params.reps.length;
      const passed = correctCount >= FIVE_REP_PASS_THRESHOLD;
      const pctScore = Math.round((correctCount / Math.max(1, totalCount)) * 100);

      // Update saved Word Bank entry if one exists — keep 100% of attempt history & progress stats!
      const bankWord = allWordsRef.current.find((w) => w.normalized === norm && langOf(w) === lang);
      if (bankWord) {
        const { updated } = applyFiveRepResult(bankWord, params.reps, now);
        allWordsRef.current = [updated, ...allWordsRef.current.filter((w) => w.id !== updated.id)];
        setAllWords((prev) => [updated, ...prev.filter((w) => w.id !== updated.id)]);
        await idbPut("words", updated);
      }

      // If >= 4 of 5 passed, mark word cleared from active problematic word lists while preserving history
      if (passed && norm) {
        setSettingsState((prev) => {
          const existingList = prev.resolvedProblemWords ?? [];
          const record: ResolvedProblemWord = {
            normalized: norm,
            word: params.word.trim(),
            language: lang,
            correctCount,
            totalReps: totalCount,
            resolvedAt: now,
          };
          const nextList = [
            record,
            ...existingList.filter((r) => !(r.normalized === norm && r.language === lang)),
          ];
          const next: Settings = { ...prev, resolvedProblemWords: nextList };
          void idbPut("kv", { ...next, key: "settings" });
          return next;
        });
      }

      // Always record a PracticeLog so past progress, minutes, streak & score history stay preserved
      addLog({
        language: lang,
        seconds: Math.max(15, Math.round(params.durationSec)),
        mode: "word-bank",
        completed: 1,
        scores: null,
        overallScore: pctScore,
        note: passed
          ? `5-Rep Cleared: "${params.word}" (${correctCount}/${totalCount} correct)`
          : `5-Rep Practice: "${params.word}" (${correctCount}/${totalCount} correct)`,
      });

      setNowMs(now);
      if (passed) {
        toast(
          `Cleared "${params.word}" (${correctCount}/${totalCount} correct) — removed from active problem words, history kept!`
        );
      } else {
        toast(
          `"${params.word}": ${correctCount}/${totalCount} correct — stays in active practice until you hit 4/5.`,
          "info"
        );
      }

      return { passed, correctCount, resolvedWord: passed };
    },
    [addLog, toast]
  );

  const completeQuickWordCheck = useCallback(
    (word: string, lang?: PracticeLanguage, durationSec = 15) => {
      const targetLang = lang ?? practiceLangRef.current;
      addLog({
        language: targetLang,
        seconds: Math.max(10, Math.round(durationSec)),
        mode: "word-bank",
        completed: 1,
        scores: null,
        overallScore: 92,
        note: `Quick Word Practice: "${word.trim()}" pronounced accurately`,
      });
      setNowMs(Date.now());
      toast(`Nice! "${word.trim()}" pronounced accurately.`);
    },
    [addLog, toast]
  );

  const isProblemWordResolved = useCallback(
    (rawWord: string, lang?: PracticeLanguage): boolean => {
      const targetLang = lang ?? practiceLanguage;
      const norm = normalizeWord(rawWord);
      if (!norm) return false;
      const list = settings.resolvedProblemWords ?? [];
      if (list.some((r) => r.normalized === norm && r.language === targetLang)) return true;
      const bankMatch = allWords.find((w) => w.normalized === norm && langOf(w) === targetLang);
      return Boolean(bankMatch?.clearedFromActive);
    },
    [settings.resolvedProblemWords, allWords, practiceLanguage]
  );

  const deleteRecording = useCallback(async (id: string) => {
    await idbDelete("recordings", id);
    await idbDelete("blobs", id).catch(() => undefined);
    setAllRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const saveDebrief = useCallback(async (d: SessionDebrief, updatedPlan?: CoachPlan) => {
    const debLang = d.language ?? practiceLangRef.current;
    const stamped: SessionDebrief = { ...d, language: debLang };
    await idbPut("debriefs", stamped);
    setAllDebriefs((prev) => [stamped, ...prev.filter((x) => x.id !== stamped.id)]);
    if (updatedPlan) {
      setSettingsState((prev) => {
        const byLang = {
          en: prev.coachPlanByLang?.en ?? prev.coachPlan ?? DEFAULT_COACH_PLAN,
          hi: prev.coachPlanByLang?.hi ?? defaultPlanForLang("hi"),
          [debLang]: updatedPlan,
        };
        const next: Settings = {
          ...prev,
          coachPlan: debLang === (prev.practiceLanguage === "hi" ? "hi" : "en") ? updatedPlan : prev.coachPlan,
          coachPlanByLang: byLang,
        };
        void idbPut("kv", { ...next, key: "settings" });
        return next;
      });
    }
  }, []);

  // ---- Speaker Shadowing Studio Persistence ----

  const addShadowItem = useCallback(
    async (item: ShadowItem, refBlob: Blob) => {
      await idbPut("blobs", refBlob, item.audioBlobKey);
      await idbPut("shadowItems", item);
      setShadowItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      toast(`Saved speaker reference "${item.title}"`);
    },
    [toast]
  );

  const deleteShadowItem = useCallback(
    async (id: string) => {
      const target = shadowRef.current.find((s) => s.id === id);
      await idbDelete("shadowItems", id);
      if (target) {
        await idbDelete("blobs", target.audioBlobKey).catch(() => undefined);
        for (const a of target.attempts) {
          await idbDelete("blobs", a.audioBlobKey).catch(() => undefined);
        }
      }
      setShadowItems((prev) => prev.filter((s) => s.id !== id));
      toast("Shadowing clip deleted", "info");
    },
    [toast]
  );

  const recordShadowAttempt = useCallback(
    async (itemId: string, attempt: ShadowAttempt, attemptBlob: Blob): Promise<ShadowItem | null> => {
      const current = shadowRef.current.find((s) => s.id === itemId);
      if (!current) return null;

      await idbPut("blobs", attemptBlob, attempt.audioBlobKey);
      const nextAttempts = [...current.attempts, attempt];
      const bestScore = nextAttempts.reduce((m, a) => Math.max(m, a.comparison.overallMatch), 0);
      const updated: ShadowItem = {
        ...current,
        attempts: nextAttempts,
        bestScore,
        updatedAt: attempt.ts,
      };
      await idbPut("shadowItems", updated);
      setShadowItems((prev) => [updated, ...prev.filter((x) => x.id !== updated.id)]);

      // Count shadowing practice toward the clip's own language progress!
      addLog({
        language: current.language,
        seconds: Math.max(15, Math.round(attempt.profile.totalDurationSec)),
        mode: "shadowing",
        completed: 1,
        scores: null,
        overallScore: attempt.comparison.overallMatch,
        note: `Speaker shadow: ${current.title} (${attempt.comparison.overallMatch}/100 match)`,
      });

      toast(`Shadow take scored — ${attempt.comparison.overallMatch}/100 delivery match!`);
      return updated;
    },
    [addLog, toast]
  );

  const getBlob = useCallback(async (id: string) => idbGet<Blob>("blobs", id), []);

  const markDayDone = useCallback((dayNum: number) => {
    setSettingsState((prev) => {
      const k = `day-${dayNum}`;
      if (prev.completedDays.includes(k)) return prev;
      const next = { ...prev, completedDays: [...prev.completedDays, k] };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const exportJSON = useCallback(
    async (includeAudio: boolean) => {
      const payload: ExportPayload = {
        app: "speechcoach",
        version: 5,
        exportedAt: Date.now(),
        settings: settingsRef.current,
        exercises,
        logs: allLogs,
        recordings: allRecordings,
        debriefs: allDebriefs,
        words: allWords,
        shadowItems,
        blobs: {},
      };
      let skippedAudio = false;
      if (includeAudio) {
        let total = 0;
        const blobEntries: { key: string; mime: string }[] = [];
        for (const r of allRecordings) {
          if (r.hasAudio) blobEntries.push({ key: r.id, mime: r.mimeType });
        }
        for (const w of allWords) {
          if (w.userRecordingBlobKey) {
            blobEntries.push({
              key: w.userRecordingBlobKey,
              mime: w.userRecordingMimeType || "audio/webm",
            });
          }
        }
        for (const sh of shadowItems) {
          blobEntries.push({ key: sh.audioBlobKey, mime: sh.mimeType });
          for (const a of sh.attempts) blobEntries.push({ key: a.audioBlobKey, mime: a.mimeType });
        }
        for (const entry of blobEntries) {
          const blob = await idbGet<Blob>("blobs", entry.key);
          if (!blob) continue;
          const b64 = await blobToB64(blob);
          total += b64.length;
          if (total > 45_000_000) {
            skippedAudio = true;
            payload.blobs = {};
            break;
          }
          payload.blobs[entry.key] = { mime: entry.mime, data: b64 };
        }
      }
      const data = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `speechcoach-backup-${dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSettings({ lastBackupAt: Date.now() });
      toast(
        skippedAudio
          ? "Backup saved (audio too large — text & metadata saved). Download large clips individually."
          : "Backup exported (English + Hindi + Shadow clips)"
      );
      return { ok: true, skippedAudio };
    },
    [exercises, allLogs, allRecordings, allDebriefs, allWords, shadowItems, setSettings, toast]
  );

  const importJSON = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const p = JSON.parse(text) as ExportPayload;
        if (p.app !== "speechcoach" || !p.settings) return { ok: false, msg: "Not a SpeechCoach backup file." };

        const restoredProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          ...(p.settings.profile ?? {}),
          onboardingCompleted:
            p.settings.profile?.onboardingCompleted ??
            ((p.logs?.length ?? 0) > 0 || (p.recordings?.length ?? 0) > 0),
        };
        const enPlan: CoachPlan = {
          ...DEFAULT_COACH_PLAN,
          ...(p.settings.coachPlanByLang?.en ?? p.settings.coachPlan ?? {}),
        };
        const hiPlan: CoachPlan = {
          ...defaultPlanForLang("hi"),
          ...(p.settings.coachPlanByLang?.hi ?? {}),
        };
        const activeLang: PracticeLanguage = p.settings.practiceLanguage === "hi" ? "hi" : "en";
        const mergedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...p.settings,
          practiceLanguage: activeLang,
          profile: restoredProfile,
          coachPlan: activeLang === "hi" ? hiPlan : enPlan,
          coachPlanByLang: { en: enPlan, hi: hiPlan },
        };

        await idbPut("kv", { ...mergedSettings, key: "settings" });
        await idbClear("exercises");
        for (const e of p.exercises ?? []) await idbPut("exercises", e);
        await idbClear("logs");
        for (const l of p.logs ?? []) await idbPut("logs", l);
        await idbClear("recordings");
        for (const r of p.recordings ?? []) {
          await idbPut("recordings", r);
          const entry = p.blobs?.[r.id];
          if (entry?.data) await idbPut("blobs", b64ToBlob(entry.data, entry.mime), r.id);
        }
        await idbClear("debriefs");
        for (const d of p.debriefs ?? []) await idbPut("debriefs", d);
        await idbClear("words").catch(() => undefined);
        for (const w of p.words ?? []) {
          await idbPut("words", w);
          if (w.userRecordingBlobKey) {
            const wEntry = p.blobs?.[w.userRecordingBlobKey];
            if (wEntry?.data) await idbPut("blobs", b64ToBlob(wEntry.data, wEntry.mime), w.userRecordingBlobKey);
          }
        }
        await idbClear("shadowItems").catch(() => undefined);
        for (const sh of p.shadowItems ?? []) {
          await idbPut("shadowItems", sh);
          const refEntry = p.blobs?.[sh.audioBlobKey];
          if (refEntry?.data) await idbPut("blobs", b64ToBlob(refEntry.data, refEntry.mime), sh.audioBlobKey);
          for (const att of sh.attempts ?? []) {
            const aEntry = p.blobs?.[att.audioBlobKey];
            if (aEntry?.data) await idbPut("blobs", b64ToBlob(aEntry.data, aEntry.mime), att.audioBlobKey);
          }
        }

        setSettingsState(mergedSettings);
        setExercises(p.exercises ?? []);
        setAllLogs(p.logs ?? []);
        setAllRecordings((p.recordings ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setAllDebriefs((p.debriefs ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setAllWords((p.words ?? []).sort((a, b) => b.updatedAt - a.updatedAt));
        setShadowItems((p.shadowItems ?? []).sort((a, b) => b.updatedAt - a.updatedAt));
        toast(
          `Backup restored: ${p.logs?.length ?? 0} logs, ${(p.recordings ?? []).length} recordings, ${
            (p.words ?? []).length
          } words, ${(p.shadowItems ?? []).length} shadow clips`
        );
        return { ok: true, msg: "Import complete." };
      } catch (e) {
        return { ok: false, msg: `Import failed: ${e instanceof Error ? e.message : "unknown error"}` };
      }
    },
    [toast]
  );

  const clearAllData = useCallback(async () => {
    for (const s of ["kv", "exercises", "logs", "recordings", "blobs", "debriefs", "words", "shadowItems"]) {
      await idbClear(s).catch(() => undefined);
    }
    setSettingsState(DEFAULT_SETTINGS);
    setExercises([]);
    setAllLogs([]);
    setAllRecordings([]);
    setAllDebriefs([]);
    setAllWords([]);
    setShadowItems([]);
    void idbPut("kv", { ...DEFAULT_SETTINGS, key: "settings" });
    toast("All local data cleared", "info");
  }, [toast]);

  // ---- Active-language isolated slices (English vs. Hindi progress kept completely separate!) ----

  const logs = useMemo(
    () => allLogs.filter((l) => langOf(l) === practiceLanguage),
    [allLogs, practiceLanguage]
  );
  const recordings = useMemo(
    () => allRecordings.filter((r) => langOf(r) === practiceLanguage),
    [allRecordings, practiceLanguage]
  );
  const debriefs = useMemo(
    () => allDebriefs.filter((d) => langOf(d) === practiceLanguage),
    [allDebriefs, practiceLanguage]
  );
  const words = useMemo(
    () => allWords.filter((w) => langOf(w) === practiceLanguage),
    [allWords, practiceLanguage]
  );

  const profile = useMemo<UserProfile>(
    () => ({ ...DEFAULT_PROFILE, ...(settings.profile ?? {}) }),
    [settings.profile]
  );

  const coachPlan = useMemo<CoachPlan>(() => {
    const planForLang = settings.coachPlanByLang?.[practiceLanguage];
    if (planForLang) return { ...defaultPlanForLang(practiceLanguage), ...planForLang };
    return practiceLanguage === "hi"
      ? defaultPlanForLang("hi")
      : { ...DEFAULT_COACH_PLAN, ...(settings.coachPlan ?? {}) };
  }, [settings.coachPlanByLang, settings.coachPlan, practiceLanguage]);

  const stats = useMemo<StatsPack>(() => computeStatsPack(logs, recordings), [logs, recordings]);

  // Independent side-by-side summary for both English and Hindi
  const langSummaries = useMemo<Record<PracticeLanguage, LangProgressSummary>>(() => {
    const build = (lang: PracticeLanguage): LangProgressSummary => {
      const lLogs = allLogs.filter((x) => langOf(x) === lang);
      const lRecs = allRecordings.filter((x) => langOf(x) === lang);
      const lWords = allWords.filter((x) => langOf(x) === lang);
      const st = computeStatsPack(lLogs, lRecs);
      const scored = lRecs.map((r) => getRecordingAssessment(r).overallScore);
      const avgScore = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
      const lPlan = settings.coachPlanByLang?.[lang] ?? defaultPlanForLang(lang);
      const meta = PRACTICE_LANGUAGE_META[lang];
      return {
        language: lang,
        label: meta.label,
        nativeLabel: meta.nativeLabel,
        totalSec: st.totalSec,
        sessionCount: st.sessionCount,
        recordingCount: st.recordingCount,
        currentStreak: st.currentStreak,
        bestStreak: st.bestStreak,
        avgScore,
        wordCount: lWords.length,
        masteredWords: lWords.filter((w) => w.status === "mastered").length,
        adaptiveLevel: lPlan.adaptiveLevel,
      };
    };
    return { en: build("en"), hi: build("hi") };
  }, [allLogs, allRecordings, allWords, settings.coachPlanByLang]);

  const badges = useMemo(() => computeBadges(stats), [stats]);

  const skillAverages = useMemo(() => {
    const out: Record<string, number | null> = {
      clarity: null,
      pronunciation: null,
      fluency: null,
      pacing: null,
      vocalControl: null,
    };
    for (const [k] of Object.entries(out)) {
      const vals = recordings
        .map((r) => Number(r.self?.[k as keyof typeof r.self] ?? 0))
        .filter((v) => v > 0);
      out[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return out;
  }, [recordings]);

  const skillStandings = useMemo(() => deriveSkillStandings(recordings), [recordings]);
  const improvement = useMemo(() => computeOverallImprovement(recordings), [recordings]);
  const commonMistakes = useMemo(() => analyzeCommonMistakes(recordings), [recordings]);

  const resolvedProblemWords = useMemo(
    () => (settings.resolvedProblemWords ?? []).filter((r) => r.language === practiceLanguage),
    [settings.resolvedProblemWords, practiceLanguage]
  );

  const dueWords = useMemo(
    () =>
      nowMs > 0
        ? getDueWords(words, nowMs)
        : words.filter((w) => w.status !== "mastered" && !w.clearedFromActive),
    [words, nowMs]
  );
  const { weakSounds, weakCombos } = useMemo(
    () => detectWeakSounds(words, recordings, practiceLanguage),
    [words, recordings, practiceLanguage]
  );
  const overallBeforeAfter = useMemo(() => compareOverallBeforeAfter(recordings), [recordings]);

  const todayKeyStr = useMemo(() => dateKey(nowMs || undefined), [nowMs]);
  const customWordExercise = useMemo(() => {
    if (words.length === 0) return null;
    const daySeed = todayKeyStr.split("-").reduce((acc, s) => acc + Number(s), 0);
    return buildCustomWordCoachedExercise(words, daySeed, practiceLanguage);
  }, [words, todayKeyStr, practiceLanguage]);

  const todayPlan = useMemo(
    () =>
      selectDailySession(
        profile,
        coachPlan,
        recordings,
        debriefs,
        todayKeyStr,
        customWordExercise,
        practiceLanguage
      ),
    [profile, coachPlan, recordings, debriefs, todayKeyStr, customWordExercise, practiceLanguage]
  );

  const backupDue = useMemo(() => {
    if (!nowMs) return false;
    const totalItems = allLogs.length + allRecordings.length + allWords.length + shadowItems.length;
    if (!settings.lastBackupAt) return totalItems > 0;
    const dismissed = settings.backupDismissedUntil != null && nowMs < settings.backupDismissedUntil;
    return !dismissed && nowMs - settings.lastBackupAt > 7 * 86400000;
  }, [nowMs, settings.lastBackupAt, settings.backupDismissedUntil, allLogs.length, allRecordings.length, allWords.length, shadowItems.length]);

  const value: Store = {
    hydrated,
    nowMs,
    practiceLanguage,
    setPracticeLanguage,
    settings,
    profile,
    coachPlan,
    exercises,
    logs,
    recordings,
    debriefs,
    words,
    allLogs,
    allRecordings,
    allDebriefs,
    allWords,
    langSummaries,
    shadowItems,
    addShadowItem,
    deleteShadowItem,
    recordShadowAttempt,
    toasts,
    guidedOpen,
    setGuidedOpen,
    onboardingOpen,
    setOnboardingOpen,
    addWordModal,
    openAddWord,
    openEditWord,
    closeAddWord,
    practiceWordId,
    setPracticeWordId,
    fiveRepTarget,
    openFiveRepPractice,
    closeFiveRepPractice,
    completeFiveRepSession,
    isProblemWordResolved,
    resolvedProblemWords,
    quickWordModal,
    openQuickWord,
    closeQuickWord,
    completeQuickWordCheck,
    setSettings,
    updateProfile,
    updateCoachPlan,
    completeOnboarding,
    toggleFavorite,
    addExercise,
    updateExercise,
    deleteExercise,
    addWord,
    addWordsBatch,
    updateWord,
    deleteWord,
    saveBlob,
    deleteBlob,
    recordWordAttempt,
    addLog,
    saveRecording,
    deleteRecording,
    saveDebrief,
    getBlob,
    markDayDone,
    exportJSON,
    importJSON,
    clearAllData,
    toast,
    dismissToast,
    stats,
    badges,
    skillAverages,
    skillStandings,
    improvement,
    commonMistakes,
    dueWords,
    weakSounds,
    weakCombos,
    overallBeforeAfter,
    customWordExercise,
    todayPlan,
    backupDue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
