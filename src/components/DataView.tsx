"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { listVoices, hasNativeVoice } from "@/lib/tts";
import { COACH_SKILL_LABELS, GOAL_OPTIONS, fmtDur } from "@/lib/types";
import { Btn, Card, Chip, Field, Input, Modal, Select } from "./ui";

export default function DataView({ nav }: { nav: (v: string) => void }) {
  const {
    nowMs,
    practiceLanguage,
    setPracticeLanguage,
    langSummaries,
    settings,
    profile,
    coachPlan,
    setSettings,
    setOnboardingOpen,
    exportJSON,
    importJSON,
    clearAllData,
    allRecordings,
    allLogs,
    allDebriefs,
    allWords,
    shadowItems,
    exercises,
    backupDue,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmImport, setConfirmImport] = useState<File | null>(null);
  const [storage, setStorage] = useState<string>("…");
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hiVoices, setHiVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => {
      setEnVoices(listVoices("en"));
      setHiVoices(listVoices("hi"));
    };
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          const mb = (est.usage ?? 0) / 1048576;
          const cap = (est.quota ?? 0) / 1048576;
          setStorage(`${mb.toFixed(1)} MB used of ~${Math.round(cap)} MB quota`);
        } else setStorage("usage unknown in this browser");
      } catch {
        setStorage("unknown");
      }
    })();
  }, [allRecordings.length, shadowItems.length]);

  const onFile = (f: File | null) => {
    if (f) setConfirmImport(f);
  };

  const daysSinceBackup =
    settings.lastBackupAt && nowMs ? Math.round((nowMs - settings.lastBackupAt) / 86400000) : null;

  return (
    <div className="grid gap-5">
      {backupDue && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3">
          <svg className="text-[var(--accent)]" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 2l7 13H2z" />
            <path d="M9 7v3.5M9 13v.5" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">Time for a backup</p>
            <p className="text-[12px] text-[var(--muted)]">
              It has been {daysSinceBackup != null ? `${daysSinceBackup} days` : "a while"} since your last export. Your data is safe in this browser, but a JSON backup protects it from browser cleanup.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="soft" onClick={() => setSettings({ backupDismissedUntil: Date.now() + 7 * 86400000 })}>
              Remind me next week
            </Btn>
            <Btn onClick={() => void exportJSON(true)}>Export now</Btn>
          </div>
        </div>
      )}

      {/* Personal Coach Profile & Adaptive Plan */}
      <Card
        title="My Coach Profile & Adaptive Plan"
        sub="Your training plan automatically adapts after each scored session. Update your goals or retake the baseline check anytime."
        right={
          <Btn variant="soft" onClick={() => setOnboardingOpen(true)}>
            Edit Profile / Retake Assessment
          </Btn>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[var(--panel2)] p-3.5">
            <p className="section-label">Learner Profile</p>
            <p className="mt-1.5 text-[14px] font-semibold">
              {profile.name || "Personal Speaker"} · <span className="capitalize">{profile.experienceLevel}</span>
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Daily budget: {profile.dailyMinutes} min/day · Adaptive Level {coachPlan.adaptiveLevel} ({coachPlan.difficulty})
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Target pace: {coachPlan.targetWpmMin}–{coachPlan.targetWpmMax} WPM
            </p>
          </div>

          <div className="rounded-xl bg-[var(--panel2)] p-3.5">
            <p className="section-label">Selected Goals</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.goals.map((gId) => {
                const g = GOAL_OPTIONS.find((x) => x.id === gId);
                return g ? (
                  <Chip key={gId} tone="brand">{g.label}</Chip>
                ) : null;
              })}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--panel2)] p-3.5">
            <p className="section-label">Active Priority Weaknesses</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {coachPlan.priorityAreas.map((p) => (
                <Chip key={p.skill} tone={p.priority === 1 ? "bad" : "warn"}>
                  #{p.priority} {COACH_SKILL_LABELS[p.skill]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--muted)]">{coachPlan.adjustmentNote}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Backup & restore" sub="Full JSON backup — includes settings, coach plan, debriefs, exercises, logs, recordings, and audio.">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Export backup (JSON)</p>
                <p className="text-[11.5px] text-[var(--muted)]">
                  Last backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "never"}
                </p>
              </div>
              <Btn onClick={() => void exportJSON(true)}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Restore from backup</p>
                <p className="text-[11.5px] text-[var(--muted)]">Replaces current data with the backup contents (v2–v5 supported, including Hindi &amp; Shadowing).</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="soft" onClick={() => void exportJSON(false)}>Text only</Btn>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    if (fileRef.current) fileRef.current.value = "";
                    fileRef.current?.click();
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 10.5V2.5M4.5 6L8 2.5 11.5 6" />
                    <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
                  </svg>
                  Upload Backup
                </Btn>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
            {importMsg && (
              <p className={`rounded-lg px-3 py-2 text-[12.5px] ${importMsg.ok ? "bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-[var(--good)]" : "bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] text-[var(--bad)]"}`}>
                {importMsg.msg}
              </p>
            )}
            <div className="rounded-lg border border-dashed border-[var(--line)] p-3 text-[12px] leading-relaxed text-[var(--muted)]">
              <p>
                <strong className="text-[var(--ink)]">How persistence works:</strong> everything lives in this browser&apos;s IndexedDB (schema v5 with non-destructive migrations). English progress, Hindi progress, Word Banks, and Speaker Shadowing clips are stored safely side by side.
              </p>
              <p className="mt-2">
                <strong className="text-[var(--ink)]">Offline:</strong> the app, coached English &amp; Hindi materials, 12-week program, and Shadowing Studio work locally. Live speech-to-text works best in Chrome or Edge on desktop.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Settings" sub="Saved automatically. Website interface always stays in English.">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Active Practice Language" hint="English & Hindi progress stay separate.">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["en", "hi"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPracticeLanguage(lang)}
                      className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                        practiceLanguage === lang ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                      }`}
                    >
                      {lang === "hi" ? "Hindi · हिन्दी" : "English"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Hindi Romanized Guide" hint="Show Hinglish reading under Devanagari.">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {([true, false] as const).map((on) => (
                    <button
                      key={String(on)}
                      type="button"
                      onClick={() => setSettings({ showHindiRomanized: on })}
                      className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                        (settings.showHindiRomanized ?? true) === on ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                      }`}
                    >
                      {on ? "Shown" : "Devanagari only"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Theme">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings({ theme: t })}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition ${
                        settings.theme === t ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Training intensity" hint="Scales durations in the routine.">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["easy", "standard", "intensive"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings({ difficulty: t })}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium capitalize transition ${
                        settings.difficulty === t ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily goal (minutes)">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={settings.dailyGoalMin}
                  onChange={(e) => {
                    const mins = Math.min(120, Math.max(5, Number(e.target.value) || 15));
                    setSettings({
                      dailyGoalMin: mins,
                      profile: { ...profile, dailyMinutes: mins },
                    });
                  }}
                />
              </Field>
              <Field label="Model audio speed (TTS)" hint="For model audio & shadowing modes.">
                <Input
                  type="number"
                  min={0.5}
                  max={1.3}
                  step={0.05}
                  value={settings.ttsRate}
                  onChange={(e) => setSettings({ ttsRate: Math.min(1.3, Math.max(0.5, Number(e.target.value) || 0.9)) })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="English model voice">
                <Select
                  value={settings.preferredVoice ?? ""}
                  onChange={(e) => setSettings({ preferredVoice: e.target.value || null })}
                >
                  <option value="">Auto (best English voice)</option>
                  {enVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Hindi model voice (hi-IN)"
                hint={hasNativeVoice("hi") ? `${hiVoices.length} Hindi voice(s) available` : "No local Hindi OS voice detected — Chrome/Edge online voices recommended."}
              >
                <Select
                  value={settings.preferredVoiceHi ?? ""}
                  onChange={(e) => setSettings({ preferredVoiceHi: e.target.value || null })}
                >
                  <option value="">Auto (best Hindi voice)</option>
                  {hiVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[12.5px] text-[var(--muted)]">
              Breathing pattern:{" "}
              <strong className="text-[var(--ink)]">
                {settings.breathing.inhale} · {settings.breathing.hold} · {settings.breathing.exhale}
              </strong>{" "}
              — adjust it on the Breathe page.
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your data at a glance (all languages + shadowing)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="stat"><span className="stat-label">Total time</span><span className="stat-value">{fmtDur(langSummaries.en.totalSec + langSummaries.hi.totalSec)}</span></div>
            <div className="stat"><span className="stat-label">Recordings</span><span className="stat-value">{allRecordings.length}</span></div>
            <div className="stat"><span className="stat-label">Saved Words</span><span className="stat-value">{allWords.length}</span></div>
            <div className="stat"><span className="stat-label">Shadow Clips</span><span className="stat-value">{shadowItems.length}</span></div>
            <div className="stat"><span className="stat-label">Debriefs</span><span className="stat-value">{allDebriefs.length}</span></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-[var(--panel2)] px-3 py-2">
              <strong className="text-[var(--ink)]">English:</strong> {langSummaries.en.recordingCount} takes · {langSummaries.en.wordCount} words · {langSummaries.en.currentStreak}d streak
            </div>
            <div className="rounded-lg bg-[var(--panel2)] px-3 py-2">
              <strong className="text-[var(--ink)]">Hindi:</strong> {langSummaries.hi.recordingCount} takes · {langSummaries.hi.wordCount} words · {langSummaries.hi.currentStreak}d streak
            </div>
          </div>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Storage: {storage} · {allLogs.length} logs · {exercises.length} custom exercises · IndexedDB “speechcoach” (schema v5)
          </p>
        </Card>

        <Card title="Danger zone" sub="These actions cannot be undone.">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Reset app to factory state</p>
                <p className="text-[11.5px] text-[var(--muted)]">Deletes all local data — export a backup first.</p>
              </div>
              <Btn variant="danger" onClick={() => setConfirmClear(true)}>Clear everything</Btn>
            </div>
          </div>
        </Card>
      </div>

      {/* Import confirm */}
      <Modal open={!!confirmImport} onClose={() => setConfirmImport(null)} title="Restore this backup?">
        {confirmImport && (
          <div className="grid gap-4">
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
              File: <strong className="text-[var(--ink)]">{confirmImport.name}</strong> ({(confirmImport.size / 1048576).toFixed(1)} MB).
              Restoring <strong className="text-[var(--ink)]">replaces</strong> your current settings, profile, exercises, logs, and recordings with the backup.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmImport(null)}>Cancel</Btn>
              <Btn
                onClick={async () => {
                  const res = await importJSON(confirmImport);
                  setImportMsg(res);
                  setConfirmImport(null);
                  if (fileRef.current) fileRef.current.value = "";
                  if (res.ok) nav("today");
                }}
              >
                Restore backup
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear confirm */}
      <Modal open={!!confirmClear} onClose={() => setConfirmClear(false)} title="Clear all local data?">
        <div className="grid gap-4">
          <div>
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
              This deletes <strong className="text-[var(--ink)]">everything</strong>: {allRecordings.length} recordings (+ audio), {allLogs.length} logs, {allWords.length} saved words, {shadowItems.length} speaker shadowing clips, {exercises.length} custom exercises, coach debriefs, and settings. There is no undo.
            </p>
            <Chip tone="bad" className="mt-2">Recommend: Export a backup first</Chip>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Btn>
            <Btn variant="soft" onClick={() => { setConfirmClear(false); void exportJSON(true); }}>Export first</Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                await clearAllData();
                setConfirmClear(false);
              }}
            >
              Yes, delete everything
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
