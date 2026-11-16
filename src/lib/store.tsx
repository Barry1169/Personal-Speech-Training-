"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { idbAll, idbGet, idbPut, idbDelete, idbClear, blobToB64, b64ToBlob } from "./idb";
import {
  type Exercise, type PracticeLog, type Recording, type Settings, type Toast,
  DEFAULT_SETTINGS, dateKey,
} from "./types";
import { computeBadges, streaksFromDates, type Badge, type StatsPack } from "./coach";

interface ExportPayload {
  app: "speechcoach";
  version: number;
  exportedAt: number;
  settings: Settings;
  exercises: Exercise[];
  logs: PracticeLog[];
  recordings: Recording[];
  blobs: Record<string, { mime: string; data: string }>;
}

interface Store {
  hydrated: boolean;
  settings: Settings;
  exercises: Exercise[];
  logs: PracticeLog[];
  recordings: Recording[];
  toasts: Toast[];
  setSettings: (patch: Partial<Settings>) => void;
  toggleFavorite: (id: string) => void;
  addExercise: (e: Omit<Exercise, "id" | "createdAt" | "builtin">) => void;
  updateExercise: (e: Exercise) => void;
  deleteExercise: (id: string) => void;
  addLog: (l: Omit<PracticeLog, "id" | "ts" | "date"> & { ts?: number }) => void;
  saveRecording: (r: Recording, blob: Blob | null) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  getBlob: (id: string) => Promise<Blob | undefined>;
  markDayDone: (dayNum: number) => void;
  exportJSON: (includeAudio: boolean) => Promise<{ ok: boolean; skippedAudio: boolean }>;
  importJSON: (file: File) => Promise<{ ok: boolean; msg: string }>;
  clearAllData: () => Promise<void>;
  toast: (msg: string, kind?: Toast["kind"]) => void;
  stats: StatsPack;
  badges: Badge[];
  skillAverages: Record<string, number | null>;
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
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = toastId++;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // ---- hydrate from IndexedDB ----
  useEffect(() => {
    (async () => {
      try {
        const [st, ex, lg, rec] = await Promise.all([
          idbGet<Settings & { key: string }>("kv", "settings"),
          idbAll<Exercise>("exercises"),
          idbAll<PracticeLog>("logs"),
          idbAll<Recording>("recordings"),
        ]);
        if (st) setSettingsState({ ...DEFAULT_SETTINGS, ...st });
        setExercises(ex);
        setLogs(lg);
        setRecordings(rec.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
        console.error("IDB hydrate failed", e);
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

  const addExercise = useCallback((e: Omit<Exercise, "id" | "createdAt" | "builtin">) => {
    const full: Exercise = { ...e, id: `cx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, builtin: false, createdAt: Date.now() };
    setExercises((prev) => [full, ...prev]);
    void idbPut("exercises", full);
    toast("Exercise added to your library");
  }, [toast]);

  const updateExercise = useCallback((e: Exercise) => {
    setExercises((prev) => prev.map((x) => (x.id === e.id ? e : x)));
    void idbPut("exercises", e);
    toast("Exercise updated");
  }, [toast]);

  const deleteExercise = useCallback((id: string) => {
    setExercises((prev) => prev.filter((x) => x.id !== id));
    void idbDelete("exercises", id);
    setSettingsState((prev) => {
      const next = { ...prev, favorites: prev.favorites.filter((f) => f !== id) };
      void idbPut("kv", { ...next, key: "settings" });
      return next;
    });
    toast("Exercise deleted", "info");
  }, [toast]);

  const addLog = useCallback((l: Omit<PracticeLog, "id" | "ts" | "date"> & { ts?: number }) => {
    const ts = l.ts ?? Date.now();
    const full: PracticeLog = { id: `log-${ts.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, ts, date: dateKey(ts), seconds: l.seconds, mode: l.mode, completed: l.completed, scores: l.scores, note: l.note };
    setLogs((prev) => [full, ...prev]);
    void idbPut("logs", full);
  }, []);

  const saveRecording = useCallback(async (r: Recording, blob: Blob | null) => {
    await idbPut("recordings", r);
    if (blob) await idbPut("blobs", blob, r.id);
    setRecordings((prev) => [r, ...prev.filter((p) => p.id !== r.id)]);
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    await idbDelete("recordings", id);
    await idbDelete("blobs", id).catch(() => undefined);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
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

  const exportJSON = useCallback(async (includeAudio: boolean) => {
    const payload: ExportPayload = {
      app: "speechcoach",
      version: 2,
      exportedAt: Date.now(),
      settings: settingsRef.current,
      exercises,
      logs,
      recordings,
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
        if (total > 40_000_000) { skippedAudio = true; payload.blobs = {}; break; }
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
    toast(skippedAudio ? "Backup saved (audio too large — text only). Use per-recording download for audio." : "Backup exported");
    return { ok: true, skippedAudio };
  }, [exercises, logs, recordings, setSettings, toast]);

  const importJSON = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const p = JSON.parse(text) as ExportPayload;
      if (p.app !== "speechcoach" || !p.settings) return { ok: false, msg: "Not a SpeechCoach backup file." };
      await idbPut("kv", { ...DEFAULT_SETTINGS, ...p.settings, key: "settings" });
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
      setSettingsState({ ...DEFAULT_SETTINGS, ...p.settings });
      setExercises(p.exercises ?? []);
      setLogs(p.logs ?? []);
      setRecordings((p.recordings ?? []).sort((a, b) => b.createdAt - a.createdAt));
      toast(`Backup restored: ${p.logs?.length ?? 0} logs, ${(p.recordings ?? []).length} recordings, ${p.exercises?.length ?? 0} exercises`);
      return { ok: true, msg: "Import complete." };
    } catch (e) {
      return { ok: false, msg: `Import failed: ${e instanceof Error ? e.message : "unknown error"}` };
    }
  }, [toast]);

  const clearAllData = useCallback(async () => {
    for (const s of ["kv", "exercises", "logs", "recordings", "blobs"]) await idbClear(s);
    setSettingsState(DEFAULT_SETTINGS);
    setExercises([]);
    setLogs([]);
    setRecordings([]);
    setSettingsState((prev) => { void idbPut("kv", { ...prev, key: "settings" }); return prev; });
    toast("All local data cleared", "info");
  }, [toast]);

  // ---- computed ----
  const stats = useMemo<StatsPack>(() => {
    const totalSec = logs.reduce((a, l) => a + l.seconds, 0);
    const dates = [...new Set(logs.map((l) => l.date))];
    const st = streaksFromDates(dates);
    const bestAvgScore = recordings.reduce((best, r) => {
      if (!r.self) return best;
      const vals = Object.values(r.self).filter((v) => v > 0);
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
    const out: Record<string, number | null> = { clarity: null, pronunciation: null, fluency: null, pacing: null, vocalControl: null };
    for (const [k] of Object.entries(out)) {
      const vals = recordings.map((r) => r.self?.[k as keyof typeof r.self] ?? 0).filter((v) => v > 0);
      out[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return out;
  }, [recordings]);

  const backupDue = useMemo(() => {
    if (!settings.lastBackupAt) return logs.length + recordings.length > 0;
    const dismissed = settings.backupDismissedUntil != null && Date.now() < settings.backupDismissedUntil;
    return !dismissed && Date.now() - settings.lastBackupAt > 7 * 86400000;
  }, [settings.lastBackupAt, settings.backupDismissedUntil, logs.length, recordings.length]);

  const value: Store = {
    hydrated, settings, exercises, logs, recordings, toasts,
    setSettings, toggleFavorite, addExercise, updateExercise, deleteExercise,
    addLog, saveRecording, deleteRecording, getBlob, markDayDone,
    exportJSON, importJSON, clearAllData, toast,
    stats, badges, skillAverages, backupDue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
