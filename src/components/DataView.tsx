"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fmtDur } from "@/lib/types";
import { Btn, Card, Chip, Field, Input, Modal } from "./ui";

export default function DataView({ nav }: { nav: (v: string) => void }) {
  const {
    settings, setSettings, exportJSON, importJSON, clearAllData, toast,
    stats, recordings, exercises, logs, backupDue,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmImport, setConfirmImport] = useState<File | null>(null);
  const [storage, setStorage] = useState<string>("…");

  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          const mb = (est.usage ?? 0) / 1048576;
          const cap = (est.quota ?? 0) / 1048576;
          setStorage(`${mb.toFixed(1)} MB used of ~${Math.round(cap)} MB quota`);
        } else setStorage("usage unknown in this browser");
      } catch { setStorage("unknown"); }
    })();
  }, [recordings.length]);

  const onFile = (f: File | null) => {
    if (f) setConfirmImport(f);
  };

  return (
    <div className="grid gap-5">
      {backupDue && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3">
          <svg className="text-[var(--accent)]" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2l7 13H2z" /><path d="M9 7v3.5M9 13v.5" /></svg>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">Time for a backup</p>
            <p className="text-[12px] text-[var(--muted)]">
              It's been {settings.lastBackupAt ? `${Math.round((Date.now() - settings.lastBackupAt) / 86400000)} days` : "a while"} since your last export. Your data is safe in this browser, but a JSON backup protects it from browser cleanup.
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="soft" onClick={() => { setSettings({ backupDismissedUntil: Date.now() + 7 * 86400000 }); }}>Remind me next week</Btn>
            <Btn onClick={() => exportJSON(true)}>Export now</Btn>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Backup & restore" sub="Full JSON backup — includes settings, exercises, logs, recordings, and audio.">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Export backup (JSON)</p>
                <p className="text-[11.5px] text-[var(--muted)]">
                  Last backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "never"}
                </p>
              </div>
              <Btn onClick={() => exportJSON(true)}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Restore from backup</p>
                <p className="text-[11.5px] text-[var(--muted)]">Replaces current data with the backup's contents.</p>
              </div>
              <div className="flex gap-2">
                <Btn variant="soft" onClick={() => exportJSON(false)}>Text only</Btn>
                <Btn variant="ghost" onClick={() => fileRef.current?.click()}>Import…</Btn>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {importMsg && (
              <p className={`rounded-lg px-3 py-2 text-[12.5px] ${importMsg.ok ? "bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-[var(--good)]" : "bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] text-[var(--bad)]"}`}>
                {importMsg.msg}
              </p>
            )}
            <div className="rounded-lg border border-dashed border-[var(--line)] p-3 text-[12px] leading-relaxed text-[var(--muted)]">
              <p><strong className="text-[var(--ink)]">How persistence works:</strong> everything lives in this browser's IndexedDB (a real local database with versioned migrations). Closing tabs, refreshing, and app updates never touch it. It also means your data stays on this device/browser — export regularly to keep a copy elsewhere.</p>
              <p className="mt-2"><strong className="text-[var(--ink)]">Offline:</strong> the app, program content, and all your data work without a connection. Transcription quality is best in Chrome or Edge (desktop).</p>
            </div>
          </div>
        </Card>

        <Card title="Settings" sub="Saved automatically.">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Theme">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["light", "dark"] as const).map((t) => (
                    <button key={t} onClick={() => setSettings({ theme: t })}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition ${settings.theme === t ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Training intensity" hint="Scales durations in the routine.">
                <div className="flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["easy", "standard", "intensive"] as const).map((t) => (
                    <button key={t} onClick={() => setSettings({ difficulty: t })}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium capitalize transition ${settings.difficulty === t ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily goal (minutes)">
                <Input type="number" min={5} max={120} step={5} value={settings.dailyGoalMin}
                  onChange={(e) => setSettings({ dailyGoalMin: Math.min(120, Math.max(5, Number(e.target.value) || 15)) })} />
              </Field>
              <Field label="Text-to-speech speed" hint="For shadowing & listening modes.">
                <Input type="number" min={0.5} max={1.3} step={0.05} value={settings.ttsRate}
                  onChange={(e) => setSettings({ ttsRate: Math.min(1.3, Math.max(0.5, Number(e.target.value) || 0.9)) })} />
              </Field>
            </div>
            <div className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[12.5px] text-[var(--muted)]">
              Breathing pattern: <strong className="text-[var(--ink)]">{settings.breathing.inhale} · {settings.breathing.hold} · {settings.breathing.exhale}</strong>
              {" "}— adjust it on the Breathe page.
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your data at a glance">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="stat"><span className="stat-label">Practice time</span><span className="stat-value">{fmtDur(stats.totalSec)}</span></div>
            <div className="stat"><span className="stat-label">Sessions</span><span className="stat-value">{stats.sessionCount}</span></div>
            <div className="stat"><span className="stat-label">Recordings</span><span className="stat-value">{recordings.length}</span></div>
            <div className="stat"><span className="stat-label">Your exercises</span><span className="stat-value">{exercises.length}</span></div>
          </div>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Storage: {storage} · {logs.length} practice logs · IndexedDB “speechcoach” (schema v2)
          </p>
        </Card>

        <Card title="Danger zone" sub="These actions cannot be undone.">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div><p className="text-[13px] font-medium">Reset app to factory state</p><p className="text-[11.5px] text-[var(--muted)]">Deletes all local data — exports first.</p></div>
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
              Restoring <strong className="text-[var(--ink)]">replaces</strong> your current settings, exercises, logs, and recordings with the backup. Your current data is only kept if you have exported it first.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmImport(null)}>Cancel</Btn>
              <Btn onClick={async () => {
                const res = await importJSON(confirmImport);
                setImportMsg(res);
                setConfirmImport(null);
                if (fileRef.current) fileRef.current.value = "";
                if (res.ok) nav("today");
              }}>Restore backup</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear confirm */}
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all local data?">
        <div className="grid gap-4">
          <div>
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
              This deletes <strong className="text-[var(--ink)]">everything</strong>: {recordings.length} recordings (+ audio), {logs.length} logs, {exercises.length} custom exercises, and settings. There is no undo.
            </p>
            <Chip tone="bad" className="mt-2">Recommend: Export a backup first</Chip>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Btn>
            <Btn variant="soft" onClick={() => { setConfirmClear(false); void exportJSON(true); }}>Export first</Btn>
            <Btn variant="danger" onClick={async () => { await clearAllData(); setConfirmClear(false); }}>Yes, delete everything</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
