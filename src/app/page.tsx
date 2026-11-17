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
import WordBankView from "@/components/WordBankView";
import ShadowView from "@/components/ShadowView";
import AddWordModal from "@/components/AddWordModal";
import WordPracticeModal from "@/components/WordPracticeModal";
import { FiveRepWordModal } from "@/components/FiveRepWordModal";
import { QuickWordWidget } from "@/components/QuickWordWidget";
import OnboardingFlow from "@/components/OnboardingFlow";
import GuidedSessionModal from "@/components/GuidedSessionModal";
import ErrorBoundary from "@/components/ErrorBoundary";

type View = "today" | "breathe" | "record" | "modes" | "words" | "shadow" | "library" | "progress" | "data";

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="11" height="10" rx="2" />
        <path d="M2 6h11M5 1.5V4M10 1.5V4" />
      </svg>
    ),
  },
  {
    id: "modes",
    label: "Practice",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4.5h11M2 7.5h8M2 10.5h5" />
        <circle cx="12.5" cy="10.5" r="1.6" />
      </svg>
    ),
  },
  {
    id: "words",
    label: "Words",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.5 3.5h10v7.5H6l-3.5 2V3.5z" />
        <path d="M5 6.5h5M5 8.8h3.2" />
      </svg>
    ),
  },
  {
    id: "shadow",
    label: "Shadow",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 8.5v-2M4.5 10.5v-6M7 12V3M9.5 9.5v-4M12 8.5v-2" />
      </svg>
    ),
  },
  {
    id: "record",
    label: "Record",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7.5" cy="6" r="3.5" />
        <path d="M3.5 12.5c1.2-1.8 6.8-1.8 8 0" />
      </svg>
    ),
  },
  {
    id: "breathe",
    label: "Breathe",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7.5" cy="7.5" r="5.5" />
        <circle cx="7.5" cy="7.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 2.5h4a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 0 7 11.5H3zM12 2.5H8A1.5 1.5 0 0 0 6.5 4v9A1.5 1.5 0 0 1 8 11.5h4z" />
      </svg>
    ),
  },
  {
    id: "progress",
    label: "Progress",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12.5l3.5-4 2.5 2 4.5-6" />
        <path d="M10.5 4.5H12.5V6.5" />
      </svg>
    ),
  },
  {
    id: "data",
    label: "Coach & Data",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="7.5" cy="3.5" rx="5" ry="2" />
        <path d="M2.5 3.5v8c0 1.1 2.2 2 5 2s5-.9 5-2v-8M2.5 7.5c0 1.1 2.2 2 5 2s5-.9 5-2" />
      </svg>
    ),
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
      <div className="leading-none text-left">
        <p className="font-display text-[15.5px] font-bold tracking-tight">SpeechCoach</p>
        <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
          AI Speech Training Coach
        </p>
      </div>
    </div>
  );
}

function Shell() {
  const [view, setView] = useState<View>("today");
  const {
    hydrated,
    practiceLanguage,
    setPracticeLanguage,
    profile,
    coachPlan,
    stats,
    dueWords,
    shadowItems,
    backupDue,
    toasts,
    dismissToast,
    guidedOpen,
    setGuidedOpen,
    onboardingOpen,
    setOnboardingOpen,
    openAddWord,
  } = useStore();

  const nav = (v: string) => setView(v as View);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo />
        <p className="text-[13px] text-[var(--muted)]">Opening your local coaching data…</p>
      </div>
    );
  }

  const showOnboarding = !profile.onboardingCompleted || onboardingOpen;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-2.5 md:px-6">
          <button
            className="mr-1 shrink-0"
            onClick={() => {
              if (onboardingOpen) setOnboardingOpen(false);
              nav("today");
            }}
          >
            <Logo />
          </button>

          {!showOnboarding && (
            <nav className="ml-1 hidden items-center gap-0.5 overflow-x-auto md:flex">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  className={`nav-tab ${view === n.id ? "nav-tab-active" : ""}`}
                  onClick={() => nav(n.id)}
                >
                  {n.icon}
                  <span>{n.label}</span>
                  {n.id === "words" && dueWords.length > 0 && (
                    <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {dueWords.length}
                    </span>
                  )}
                  {n.id === "shadow" && shadowItems.length > 0 && (
                    <span className="rounded-full bg-[var(--panel2)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--muted)]">
                      {shadowItems.length}
                    </span>
                  )}
                  {n.id === "data" && backupDue && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                </button>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Practice Language Toggle (English vs Hindi — separate progress!) */}
            <div
              className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-0.5"
              title="Switch Practice Language — English and Hindi track completely separate progress, streaks, and Word Banks"
            >
              <button
                type="button"
                onClick={() => setPracticeLanguage("en")}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                  practiceLanguage === "en"
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setPracticeLanguage("hi")}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                  practiceLanguage === "hi"
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                हिन्दी
              </button>
            </div>

            {!showOnboarding && (
              <>
                <button
                  type="button"
                  onClick={() => openAddWord("", "manual")}
                  className="btn btn-soft px-2.5 py-1.5 text-[12px]"
                  title="Add a difficult word to your Personal Word Bank"
                >
                  + Add Word
                </button>
                <button
                  className="chip chip-brand hidden cursor-pointer xl:inline-flex"
                  onClick={() => nav("data")}
                  title="Adaptive coaching level for active language"
                >
                  Lvl {coachPlan.adaptiveLevel}
                </button>
                <button
                  className={`chip chip-accent cursor-pointer ${stats.currentStreak > 0 ? "streak-glow" : ""}`}
                  onClick={() => nav("progress")}
                  title={`${practiceLanguage === "hi" ? "Hindi" : "English"} practice streak`}
                >
                  <svg width="11" height="12" viewBox="0 0 12 14" fill="currentColor">
                    <path d="M6.5 0C7 2.5 9.5 3.5 10.5 5.5c1.2 2.4.3 5.5-2 6.9C7.5 13 6 14 6 14s-1.5-1-2.5-1.6C1.2 10.9.3 7.9 1.5 5.5 2.5 3.5 5 2.5 5.5 0h1z" />
                  </svg>
                  {stats.currentStreak}d
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1240px] px-4 py-5 md:px-6">
        {showOnboarding ? (
          <OnboardingFlow
            isReassessment={profile.onboardingCompleted}
            onCancel={profile.onboardingCompleted ? () => setOnboardingOpen(false) : undefined}
            onFinished={(startNow) => {
              nav("today");
              if (startNow) setGuidedOpen(true);
            }}
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[21px] font-bold tracking-tight">
                  {view === "today" && "Daily Training Dashboard"}
                  {view === "modes" && "Practice Studio"}
                  {view === "words" && "Personal Word Bank & Pronunciation Coach"}
                  {view === "shadow" && "Speaker Shadowing Studio"}
                  {view === "record" && "Record & Assess"}
                  {view === "breathe" && "Breathing Trainer"}
                  {view === "library" && "Exercise Library"}
                  {view === "progress" && "Progress & Reports"}
                  {view === "data" && "Coach Profile & Local Data"}
                </h1>
                {view !== "shadow" && view !== "breathe" && (
                  <span className="chip chip-brand text-[11px]">
                    {practiceLanguage === "hi" ? "Hindi Mode · हिन्दी (Separate Progress)" : "English Mode (Separate Progress)"}
                  </span>
                )}
              </div>
              <p className="w-full text-[12.5px] text-[var(--muted)]">
                {view === "today" && "Your personalized daily coaching plan, streaks, difficult words, weaknesses, and curriculum."}
                {view === "modes" && "All 7 coached practice material types in English or Hindi — plus 5 training modes & 6 real-world scenarios."}
                {view === "words" && "Save difficult English or Hindi words, practice slow & natural pronunciation with IPA & mouth cues, detect weak sounds, and track spaced-repetition mastery."}
                {view === "shadow" && "Upload any script + speaker audio recording (English or Hindi) and match their exact pace, pauses, emphasis, and pitch melody."}
                {view === "record" && "Record, measure pace, fillers, pauses, volume, and vocal pitch (F0), and save tricky words straight into your Word Bank."}
                {view === "breathe" && "Guided breath pacing to calm nerves and anchor vocal support before speaking."}
                {view === "library" && "Your full drill bank: switch between English & Hindi coached exercises, favorite drills, hear audio models, and add custom exercises."}
                {view === "progress" && "Separate English & Hindi score trends, streaks, training calendars, Before vs. After comparisons, weak sounds, and reports."}
                {view === "data" && "Edit your coach profile, retake your baseline assessment, adjust settings, and export backups."}
              </p>
            </div>
            <div key={`${view}-${practiceLanguage}`} className="animate-view">
              {view === "today" && <TodayView nav={nav} />}
              {view === "breathe" && <BreathingTrainer />}
              {view === "record" && <RecordView nav={nav} />}
              {view === "modes" && <ModesView nav={nav} />}
              {view === "words" && <WordBankView nav={nav} />}
              {view === "shadow" && <ShadowView />}
              {view === "library" && <LibraryView nav={nav} />}
              {view === "progress" && <ProgressView />}
              {view === "data" && <DataView nav={nav} />}
            </div>
          </>
        )}
      </main>

      {/* Global Modals & Quick Word Practice Widget */}
      <GuidedSessionModal open={guidedOpen} onClose={() => setGuidedOpen(false)} />
      <AddWordModal />
      <WordPracticeModal />
      <FiveRepWordModal />
      {!showOnboarding && <QuickWordWidget />}

      {/* Mobile bottom nav */}
      {!showOnboarding && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_95%,transparent)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-[680px] overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => nav(n.id)}
                className={`flex min-w-[60px] flex-1 flex-col items-center gap-0.5 py-2 text-[9.5px] font-semibold ${
                  view === n.id ? "text-[var(--brand)]" : "text-[var(--muted)]"
                }`}
              >
                {n.icon}
                <span className="relative truncate max-w-full px-0.5">
                  {n.id === "data" ? "Coach" : n.label}
                  {n.id === "words" && dueWords.length > 0 && (
                    <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                  )}
                  {n.id === "data" && backupDue && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Toasts (auto-dismissing & click-to-dismiss) */}
      <div className="pointer-events-none fixed bottom-28 right-4 z-[90] flex flex-col gap-2 md:bottom-16">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismissToast(t.id)}
            className="toast text-left"
            title="Dismiss notification"
          >
            {t.kind === "ok" && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--good)" strokeWidth="2">
                <path d="M2.5 7.5L5.5 10.5 11.5 3.5" />
              </svg>
            )}
            {t.kind === "err" && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--bad)" strokeWidth="2">
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
              </svg>
            )}
            {t.kind === "info" && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M7 6.5V10M7 3.8v.4" />
              </svg>
            )}
            <span>{t.msg}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { settings, setSettings } = useStore();
  return (
    <button
      className="icon-btn"
      title={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
    >
      {settings.theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="3.2" />
          <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" />
        </svg>
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
