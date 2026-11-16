"use client";

import { useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import TodayView from "@/components/TodayView";
import BreathingTrainer from "@/components/BreathingTrainer";
import RecordView from "@/components/RecordView";
import ModesView from "@/components/ModesView";
import LibraryView from "@/components/LibraryView";
import ProgressView from "@/components/ProgressView";
import DataView from "@/components/DataView";
import ErrorBoundary from "@/components/ErrorBoundary";

type View = "today" | "breathe" | "record" | "modes" | "library" | "progress" | "data";

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "today", label: "Today",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="11" height="10" rx="2" /><path d="M2 6h11M5 1.5V4M10 1.5V4" /></svg>,
  },
  {
    id: "breathe", label: "Breathe",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7.5" cy="7.5" r="5.5" /><circle cx="7.5" cy="7.5" r="2.5" /></svg>,
  },
  {
    id: "record", label: "Record",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7.5" cy="6" r="3.5" /><path d="M3.5 12.5c1.2-1.8 6.8-1.8 8 0" /></svg>,
  },
  {
    id: "modes", label: "Modes",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4.5h11M2 7.5h8M2 10.5h5" /><circle cx="12.5" cy="10.5" r="1.6" /></svg>,
  },
  {
    id: "library", label: "Library",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2.5h4a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 0 7 11.5H3zM12 2.5H8A1.5 1.5 0 0 0 6.5 4v9A1.5 1.5 0 0 1 8 11.5h4z" /></svg>,
  },
  {
    id: "progress", label: "Progress",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12.5l3.5-4 2.5 2 4.5-6" /><path d="M10.5 4.5H12.5V6.5" /></svg>,
  },
  {
    id: "data", label: "Data",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="7.5" cy="3.5" rx="5" ry="2" /><path d="M2.5 3.5v8c0 1.1 2.2 2 5 2s5-.9 5-2v-8M2.5 7.5c0 1.1 2.2 2 5 2s5-.9 5-2" /></svg>,
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--brand)] text-white">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6.5v4M5.5 4.5v8M8 2.5v12M10.5 5v7M13 7v3" />
        </svg>
      </span>
      <div className="leading-none">
        <p className="font-display text-[15.5px] font-bold tracking-tight">SpeechCoach</p>
        <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] sm:block">12-week voice training</p>
      </div>
    </div>
  );
}

function Shell() {
  const [view, setView] = useState<View>("today");
  const { hydrated, stats, backupDue, toasts } = useStore();

  const nav = (v: string) => setView(v as View);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo />
        <p className="text-[13px] text-[var(--muted)]">Opening your local practice data…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5 md:px-6">
          <button className="mr-1" onClick={() => nav("today")}><Logo /></button>
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <button key={n.id} className={`nav-tab ${view === n.id ? "nav-tab-active" : ""}`} onClick={() => nav(n.id)}>
                {n.icon}
                {n.label}
                {n.id === "data" && backupDue && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="chip chip-accent cursor-pointer"
              onClick={() => nav("progress")}
              title="Practice streak"
            >
              <svg width="11" height="12" viewBox="0 0 12 14" fill="currentColor"><path d="M6.5 0C7 2.5 9.5 3.5 10.5 5.5c1.2 2.4.3 5.5-2 6.9C7.5 13 6 14 6 14s-1.5-1-2.5-1.6C1.2 10.9.3 7.9 1.5 5.5 2.5 3.5 5 2.5 5.5 0h1z" /></svg>
              {stats.currentStreak}d
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1240px] px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-[21px] font-bold tracking-tight">
            {NAV.find((n) => n.id === view)?.label === "Record" ? "Record & Assess" : NAV.find((n) => n.id === view)?.label}
          </h1>
          <p className="text-[12.5px] text-[var(--muted)]">
            {view === "today" && "Your daily routine, materials, and timers."}
            {view === "breathe" && "The 3-4-6 pattern that starts every session."}
            {view === "record" && "Record, transcribe, compare, and get coached — all on-device."}
            {view === "modes" && "Shadowing, fluency, pronunciation, presentation, reading — and real-world scenarios."}
            {view === "library" && "Your full drill bank: search, filter, favorite, and add your own."}
            {view === "progress" && "Streaks, trends, recordings, badges, and reports."}
            {view === "data" && "Backups, settings, and your local data."}
          </p>
        </div>
        {view === "today" && <TodayView nav={nav} />}
        {view === "breathe" && <BreathingTrainer />}
        {view === "record" && <RecordView nav={nav} />}
        {view === "modes" && <ModesView nav={nav} />}
        {view === "library" && <LibraryView />}
        {view === "progress" && <ProgressView />}
        {view === "data" && <DataView nav={nav} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_94%,transparent)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-[560px] grid-cols-7">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => nav(n.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[9.5px] font-semibold ${view === n.id ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
              {n.icon}
              <span className="relative">
                {n.label}
                {n.id === "data" && backupDue && <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-16 right-4 z-50 flex flex-col gap-2 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.kind === "ok" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--good)" strokeWidth="2"><path d="M2.5 7.5L5.5 10.5 11.5 3.5" /></svg>}
            {t.kind === "err" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--bad)" strokeWidth="2"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" /></svg>}
            {t.kind === "info" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M7 6.5V10M7 3.8v.4" /></svg>}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// theme toggle needs store context — separate component to use the hook properly
function ThemeToggle() {
  const { settings, setSettings } = useStore();
  return (
    <button
      className="icon-btn"
      title={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
    >
      {settings.theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3.2" /><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" /></svg>
      )}
    </button>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default function Page() {
  return <App />;
}
