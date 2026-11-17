"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { idbAll, idbGet, idbPut, idbDelete, idbClear, blobToB64, b64ToBlob } from "./idb";
import {
  type BeforeAfterComparison,
  type CoachPlan,
  type CoachedExercise,
  type Exercise,
  type PersonalWord,
  type PracticeLog,
  type Recording,
  type SessionDebrief,
  type Settings,
  type Toast,
  type UserProfile,
  type WeakComboFinding,
  type WeakSoundFinding,
  type WordAttempt,
  type WordMouthGuide,
  type WordStatus,
  DEFAULT_COACH_PLAN,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  dateKey,
} from "./types";
import { computeBadges, streaksFromDates, type Badge, type StatsPack } from "./coach";
import {
  analyzeCommonMistakes,
  computeOverallImprovement,
  deriveSkillStandings,
  selectDailySession,
  type CommonMistakesReport,
  type DailySessionPlan,
  type ImprovementSummary,
  type SkillStanding,
} from "./adaptiveCoach";
import {
  applyWordAttempt,
  buildCustomWordCoachedExercise,
  compareOverallBeforeAfter,
  createPersonalWord,
  detectWeakSounds,
  getDueWords,
  normalizeWord,
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
  blobs: Record<string, { mime: string; data: string }>;
}

export interface AddWordModalState {
  open: boolean;
  initialWord: string;
  source: PersonalWord["source"];
  editingWord: PersonalWord | null;
}

interface Store {
  hydrated: boolean;
  nowMs: number;
  settings: Settings;
  profile: UserProfile;
  coachPlan: CoachPlan;
  exercises: Exercise[];
  logs: PracticeLog[];
  recordings: Recording[];
  debriefs: SessionDebrief[];
  words: PersonalWord[];
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
  setSettings: (patch: Partial<Settings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateCoachPlan: (plan: CoachPlan) => void;
  completeOnboarding: (profile: UserProfile, plan: CoachPlan) => void;
  toggleFavorite: (id: string) => void;
  addExercise: (e: Omit<Exercise, "id" | "createdAt" | "builtin">) => void;
  updateExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;
  addWord: (
    rawWord: string,
    opts?: {
      status?: WordStatus;
      source?: PersonalWord["source"];
      phonetic?: string;
      ipa?: string;
      meaning?: string;
      exampleSentence?: string;
      notes?: string;
      mouthGuide?: Partial<WordMouthGuide>;
    }
  ) => { word: PersonalWord; existed: boolean };
  updateWord: (word: PersonalWord) => void;
  deleteWord: (id: string) => void;
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
  toast: (msg: string, kind?: Toast["kind"]) => void;
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
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [debriefs, setDebriefs] = useState<SessionDebrief[]>([]);
  const [words, setWords] = useState<PersonalWord[]>([]);
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

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = toastId++;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
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
        const [st, ex, lg, rec, deb, wds] = await Promise.all([
          idbGet<Settings & { key: string }>("kv", "settings"),
          idbAll<Exercise>("exercises"),
          idbAll<PracticeLog>("logs"),
          idbAll<Recording>("recordings"),
          idbAll<SessionDebrief>("debriefs").catch(() => [] as SessionDebrief[]),
          idbAll<PersonalWord>("words").catch(() => [] as PersonalWord[]),
        ]);

        const mergedProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          ...(st?.profile ?? {}),
        };

        // Returning v1/v2 user with existing history should not be forced through first-time onboarding
        if (!mergedProfile.onboardingCompleted && (lg.length > 0 || rec.length > 0)) {
          mergedProfile.onboardingCompleted = true;
          mergedProfile.dailyMinutes = st?.dailyGoalMin ?? DEFAULT_PROFILE.dailyMinutes;
        }

        const mergedPlan: CoachPlan = {
          ...DEFAULT_COACH_PLAN,
          ...(st?.coachPlan ?? {}),
        };

        const mergedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...(st ?? {}),
          profile: mergedProfile,
          coachPlan: mergedPlan,
        };

        setNowMs(Date.now());
        setSettingsState(mergedSettings);
        setExercises(ex);
        setLogs(lg);
        setRecordings(rec.sort((a, b) => b.createdAt - a.createdAt));
        setDebriefs(deb.sort((a, b) => b.createdAt - a.createdAt));
        setWords(wds.sort((a, b) => b.updatedAt - a.updatedAt));
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
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

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

  const updateCoachPlan = useCallback((coachPlan: CoachPlan) => {
    setSettingsState((prev) => {
      const next: Settings = { ...prev, coachPlan };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((profile: UserProfile, coachPlan: CoachPlan) => {
    setSettingsState((prev) => {
      const finalProfile: UserProfile = {
        ...profile,
        onboardingCompleted: true,
        onboardingCompletedAt: profile.onboardingCompletedAt ?? Date.now(),
      };
      const next: Settings = {
        ...prev,
        dailyGoalMin: finalProfile.dailyMinutes,
        profile: finalProfile,
        coachPlan,
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

  const addWord = useCallback(
    (
      rawWord: string,
      opts?: {
        status?: WordStatus;
        source?: PersonalWord["source"];
        phonetic?: string;
        ipa?: string;
        meaning?: string;
        exampleSentence?: string;
        notes?: string;
        mouthGuide?: Partial<WordMouthGuide>;
      }
    ) => {
      const norm = normalizeWord(rawWord);
      const existing = wordsRef.current.find((w) => w.normalized === norm);
      if (existing) {
        toast(`"${existing.word}" is already in your Personal Word Bank`, "info");
        return { word: existing, existed: true };
      }
      const created = createPersonalWord(rawWord, opts);
      setWords((prev) => [created, ...prev]);
      void idbPut("words", created);
      toast(`Added "${created.word}" to your Personal Word Bank`);
      return { word: created, existed: false };
    },
    [toast]
  );

  const updateWord = useCallback(
    (word: PersonalWord) => {
      const stamped: PersonalWord = {
        ...word,
        normalized: normalizeWord(word.word),
        updatedAt: Date.now(),
      };
      setWords((prev) => prev.map((w) => (w.id === stamped.id ? stamped : w)));
      void idbPut("words", stamped);
      toast(`Updated "${stamped.word}"`);
    },
    [toast]
  );

  const deleteWord = useCallback(
    (id: string) => {
      const target = wordsRef.current.find((w) => w.id === id);
      setWords((prev) => prev.filter((w) => w.id !== id));
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
      seconds: l.seconds,
      mode: l.mode,
      completed: l.completed,
      scores: l.scores,
      overallScore: l.overallScore ?? null,
      note: l.note,
    };
    setLogs((prev) => [full, ...prev]);
    void idbPut("logs", full);
  }, []);

  const saveRecording = useCallback(async (r: Recording, blob: Blob | null) => {
    await idbPut("recordings", r);
    if (blob) await idbPut("blobs", blob, r.id);
    setRecordings((prev) => [r, ...prev.filter((p) => p.id !== r.id)]);
  }, []);

  const recordWordAttempt = useCallback(
    async (
      wordId: string,
      attempt: WordAttempt,
      recording?: Recording | null,
      blob?: Blob | null
    ): Promise<PersonalWord | null> => {
      const current = wordsRef.current.find((w) => w.id === wordId);
      if (!current) return null;

      if (recording) {
        await saveRecording(recording, blob ?? null);
      }

      const prevStatus = current.status;
      const updated = applyWordAttempt(current, attempt);
      await idbPut("words", updated);
      setWords((prev) => [updated, ...prev.filter((w) => w.id !== updated.id)]);
      setNowMs(Date.now());

      addLog({
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

  const deleteRecording = useCallback(async (id: string) => {
    await idbDelete("recordings", id);
    await idbDelete("blobs", id).catch(() => undefined);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const saveDebrief = useCallback(async (d: SessionDebrief, updatedPlan?: CoachPlan) => {
    await idbPut("debriefs", d);
    setDebriefs((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
    if (updatedPlan) {
      setSettingsState((prev) => {
        const next = { ...prev, coachPlan: updatedPlan };
        void idbPut("kv", { ...next, key: "settings" });
        return next;
      });
    }
  }, []);

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
        version: 4,
        exportedAt: Date.now(),
        settings: settingsRef.current,
        exercises,
        logs,
        recordings,
        debriefs,
        words,
        blobs: {},
      };
      let skippedAudio = false;
      if (includeAudio) {
        let total = 0;
        for (const r of recordings) {
          if (!r.hasAudio) continue;
          const blob = await idbGet<Blob>("blobs", r.id);
          if (!blob) continue;
          const b64 = await blobToB64(blob);
          total += b64.length;
          if (total > 40_000_000) {
            skippedAudio = true;
            payload.blobs = {};
            break;
          }
          payload.blobs[r.id] = { mime: r.mimeType, data: b64 };
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
          ? "Backup saved (audio too large — text only). Use per-recording download for audio."
          : "Backup exported"
      );
      return { ok: true, skippedAudio };
    },
    [exercises, logs, recordings, debriefs, words, setSettings, toast]
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
        const restoredPlan: CoachPlan = {
          ...DEFAULT_COACH_PLAN,
          ...(p.settings.coachPlan ?? {}),
        };
        const mergedSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...p.settings,
          profile: restoredProfile,
          coachPlan: restoredPlan,
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
        for (const w of p.words ?? []) await idbPut("words", w);

        setSettingsState(mergedSettings);
        setExercises(p.exercises ?? []);
        setLogs(p.logs ?? []);
        setRecordings((p.recordings ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setDebriefs((p.debriefs ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setWords((p.words ?? []).sort((a, b) => b.updatedAt - a.updatedAt));
        toast(
          `Backup restored: ${p.logs?.length ?? 0} logs, ${(p.recordings ?? []).length} recordings, ${
            (p.words ?? []).length
          } words`
        );
        return { ok: true, msg: "Import complete." };
      } catch (e) {
        return { ok: false, msg: `Import failed: ${e instanceof Error ? e.message : "unknown error"}` };
      }
    },
    [toast]
  );

  const clearAllData = useCallback(async () => {
    for (const s of ["kv", "exercises", "logs", "recordings", "blobs", "debriefs", "words"]) {
      await idbClear(s).catch(() => undefined);
    }
    setSettingsState(DEFAULT_SETTINGS);
    setExercises([]);
    setLogs([]);
    setRecordings([]);
    setDebriefs([]);
    setWords([]);
    void idbPut("kv", { ...DEFAULT_SETTINGS, key: "settings" });
    toast("All local data cleared", "info");
  }, [toast]);

  // ---- computed ----
  const profile = useMemo<UserProfile>(
    () => ({ ...DEFAULT_PROFILE, ...(settings.profile ?? {}) }),
    [settings.profile]
  );

  const coachPlan = useMemo<CoachPlan>(
    () => ({ ...DEFAULT_COACH_PLAN, ...(settings.coachPlan ?? {}) }),
    [settings.coachPlan]
  );

  const stats = useMemo<StatsPack>(() => {
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
  }, [logs, recordings]);

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

  const dueWords = useMemo(
    () => (nowMs > 0 ? getDueWords(words, nowMs) : words.filter((w) => w.status !== "mastered")),
    [words, nowMs]
  );
  const { weakSounds, weakCombos } = useMemo(() => detectWeakSounds(words, recordings), [words, recordings]);
  const overallBeforeAfter = useMemo(() => compareOverallBeforeAfter(recordings), [recordings]);

  const todayKeyStr = useMemo(() => dateKey(nowMs || undefined), [nowMs]);
  const customWordExercise = useMemo(() => {
    if (words.length === 0) return null;
    const daySeed = todayKeyStr.split("-").reduce((acc, s) => acc + Number(s), 0);
    return buildCustomWordCoachedExercise(words, daySeed);
  }, [words, todayKeyStr]);

  const todayPlan = useMemo(
    () => selectDailySession(profile, coachPlan, recordings, debriefs, todayKeyStr, customWordExercise),
    [profile, coachPlan, recordings, debriefs, todayKeyStr, customWordExercise]
  );

  const backupDue = useMemo(() => {
    if (!nowMs) return false;
    if (!settings.lastBackupAt) return logs.length + recordings.length + words.length > 0;
    const dismissed = settings.backupDismissedUntil != null && nowMs < settings.backupDismissedUntil;
    return !dismissed && nowMs - settings.lastBackupAt > 7 * 86400000;
  }, [nowMs, settings.lastBackupAt, settings.backupDismissedUntil, logs.length, recordings.length, words.length]);

  const value: Store = {
    hydrated,
    nowMs,
    settings,
    profile,
    coachPlan,
    exercises,
    logs,
    recordings,
    debriefs,
    words,
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
    setSettings,
    updateProfile,
    updateCoachPlan,
    completeOnboarding,
    toggleFavorite,
    addExercise,
    updateExercise,
    deleteExercise,
    addWord,
    updateWord,
    deleteWord,
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
