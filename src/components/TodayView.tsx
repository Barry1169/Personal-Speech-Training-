"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PROGRAM, dayLabel, dayProgressLabel, BUILTIN_EXERCISES, type ProgramExercise } from "@/lib/program";
import type { Exercise } from "@/lib/types";
import { fmtDur } from "@/lib/types";
import { Btn, Card, Chip, Ring, SectionLabel, Timer, Select } from "./ui";

const CAT_TONE: Record<string, "brand" | "accent" | "good" | "warn" | "bad" | "muted"> = {
  breathing: "brand", pronunciation: "accent", clarity: "good", fluency: "warn",
  pitch: "brand", confidence: "bad", reading: "muted", "connected speech": "muted", impromptu: "warn",
};

function ExerciseCard({ ex, index, done, onDone, onTick, onSendScript }: {
  ex: ProgramExercise; index: number; done: boolean;
  onDone: () => void; onTick: (s: number) => void; onSendScript: (title: string, text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasMaterial = ex.material && ex.material.length > 0;
  return (
    <div className={`xcard ${done ? "xcard-done" : ""}`}>
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className={`xnum ${done ? "xnum-done" : ""}`}>{done ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6.5L4.5 9 10 3" /></svg>
        ) : index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold leading-tight">{ex.name}</span>
            <Chip tone={CAT_TONE[ex.category] ?? "muted"}>{ex.category}</Chip>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] tabular-nums text-[var(--muted)]">
            <span>⏱ {fmtDur(ex.durationSec)}</span>
            {ex.reps > 0 && <span>×{ex.reps} reps</span>}
            {ex.restSec > 0 && <span>rest {ex.restSec}s</span>}
            {hasMaterial && <span className="text-[var(--brand)]">+ material</span>}
          </div>
        </div>
        <svg className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5.5l4 4 4-4" /></svg>
      </button>

      {open && (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">{ex.instructions}</p>
          {ex.tips && (
            <ul className="mt-2 grid gap-1">
              {ex.tips.map((t, i) => <li key={i} className="text-[12px] text-[var(--muted)]"><span className="text-[var(--accent)]">→</span> {t}</li>)}
            </ul>
          )}
          {hasMaterial && (
            <div className="mt-3">
              <SectionLabel>{ex.materialLabel ?? "Practice material"}</SectionLabel>
              <div className="mt-1.5 grid gap-1.5">
                {ex.material!.map((m, i) => (
                  <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2 text-[13.5px] leading-relaxed">
                    <span className="material-words">
                      {m.split(/\*\*(.+?)\*\*/g).map((part, j) =>
                        j % 2 === 1 ? <b key={j} className="text-[var(--ink)]">{part}</b> : <span key={j}>{part}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn variant="soft" onClick={() => onSendScript(ex.name, ex.material!.join("\n\n"))}>
                  <svg className="mr-1.5" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="5" r="3" /><path d="M2 10.5c1-1.6 6-1.6 8 0M4.5 5l1 .8 1.6-1.8" /></svg>
                  Send to Recorder
                </Btn>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Timer seconds={ex.durationSec} onTick={onTick} />
            <Btn variant={done ? "ghost" : "primary"} onClick={onDone} className="ml-auto">
              {done ? "Undo" : "Done"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodayView({ nav }: { nav: (v: string) => void }) {
  const { settings, setSettings, addLog, markDayDone, toast, recordings, exercises, logs } = useStore();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [accum, setAccum] = useState(0);
  const [scriptOpen, setScriptOpen] = useState(false);

  const day = settings.currentDay;
  const { week, day: pday } = dayLabel(day);
  const allEx = useMemo(() => [...pday.warmup, ...pday.main], [pday]);
  const doneCount = allEx.filter((e) => done[e.id]).length;
  const allDone = doneCount === allEx.length && allEx.length > 0;

  const todaySecs = useMemo(() => {
    const tk = new Date().toISOString().slice(0, 10);
    const today = new Date();
    const key = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    void tk;
    return logs.filter((l) => l.date === key).reduce((a, l) => a + l.seconds, 0);
  }, [logs]);

  const goalMin = settings.dailyGoalMin;
  const goalValue = Math.min(1, todaySecs / (goalMin * 60));

  const favorites = useMemo(() => {
    const ids = new Set(settings.favorites);
    const all: Exercise[] = [...BUILTIN_EXERCISES, ...exercises];
    return all.filter((e) => ids.has(e.id)).slice(0, 6);
  }, [settings.favorites, exercises]);

  const finishSession = () => {
    const seconds = Math.max(accum, doneCount * 45);
    addLog({ seconds, mode: "daily", completed: doneCount, scores: null, note: `${dayProgressLabel(day)} — ${pday.title}` });
    markDayDone(day);
    toast(`Session logged: ${fmtDur(seconds)}, ${doneCount}/${allEx.length} exercises`);
    setDone({});
    setAccum(0);
  };

  const sendScript = (title: string, text: string) => {
    setSettings({ task: { title, mode: "daily", script: text } });
    nav("record");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="grid content-start gap-5">
        {/* Day header */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <Ring value={goalValue} size={76} stroke={7}>
              <div className="text-center">
                <p className="font-display text-[15px] font-semibold leading-none">{Math.round(goalValue * 100)}%</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">daily goal</p>
              </div>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="brand">{dayProgressLabel(day)}</Chip>
                <Chip>{week.title}</Chip>
                <Chip tone="accent">target ~{pday.targetWpm} wpm</Chip>
              </div>
              <h2 className="mt-2 font-display text-[22px] font-semibold tracking-tight">{pday.title}</h2>
              <p className="mt-0.5 text-[13px] text-[var(--muted)]">Focus: {pday.focus} · {Math.round(allEx.reduce((a, e) => a + e.durationSec, 0) / 60)} min planned · {Math.round(todaySecs / 60)} min practiced today</p>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="ghost" onClick={() => setSettings({ currentDay: Math.max(1, day - 1) })} title="Previous day">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3L5 7l4 4" /></svg>
              </Btn>
              <Select value={day} onChange={(e) => setSettings({ currentDay: Number(e.target.value) })} className="w-[130px]">
                {PROGRAM.flatMap((w) => w.days.map((d) => ({ d, n: (w.week - 1) * 7 + d.day }))).map(({ d, n }) => (
                  <option key={n} value={n}>W{Math.ceil(n / 7)} D{((n - 1) % 7) + 1}: {d.title.slice(0, 18)}</option>
                ))}
              </Select>
              <Btn variant="ghost" onClick={() => setSettings({ currentDay: Math.min(84, day + 1) })} title="Next day">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3l4 4-4 4" /></svg>
              </Btn>
            </div>
          </div>
        </Card>

        {/* Routine */}
        <div className="grid gap-2.5">
          <div className="flex items-center justify-between px-1">
            <SectionLabel>Today's routine — {doneCount}/{allEx.length} complete</SectionLabel>
            {settings.completedDays.includes(`day-${day}`) && <Chip tone="good">Day already completed</Chip>}
          </div>
          {pday.warmup.map((e, i) => (
            <ExerciseCard key={e.id} ex={e} index={i} done={!!done[e.id]}
              onDone={() => setDone((d) => ({ ...d, [e.id]: !d[e.id] }))}
              onTick={() => setAccum((a) => a + 1)}
              onSendScript={sendScript} />
          ))}
          <div className="mt-2 px-1"><SectionLabel>Main exercises</SectionLabel></div>
          {pday.main.map((e, i) => (
            <ExerciseCard key={e.id} ex={e} index={i + pday.warmup.length} done={!!done[e.id]}
              onDone={() => setDone((d) => ({ ...d, [e.id]: !d[e.id] }))}
              onTick={() => setAccum((a) => a + 1)}
              onSendScript={sendScript} />
          ))}
        </div>

        {/* Session log */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">Finish today's session</p>
              <p className="text-[12.5px] text-[var(--muted)]">
                Logs {fmtDur(Math.max(accum, doneCount * 45))} of practice ({doneCount}/{allEx.length} exercises{accum > 0 ? `, ${fmtDur(accum)} on timers` : ""}). Recording sessions log themselves automatically.
              </p>
            </div>
            <Btn onClick={finishSession} disabled={doneCount === 0 && accum === 0}>Log session</Btn>
            {allDone && <Btn variant="soft" onClick={() => { setSettings({ currentDay: Math.min(84, day + 1) }); toast("Moved to the next day", "info"); }}>Next day →</Btn>}
          </div>
        </Card>
      </div>

      {/* Side column */}
      <div className="grid content-start gap-5">
        <Card title="Today's impromptu topic" sub="30 seconds to think. 2 minutes to talk. No notes.">
          <div className="grid gap-2">
            {pday.impromptu.map((t, i) => (
              <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13.5px] leading-relaxed">{t}</div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="soft" onClick={() => sendScript(pday.impromptu[0], "")}>Record this</Btn>
            <Btn variant="ghost" onClick={() => nav("modes")}>More impromptu →</Btn>
          </div>
        </Card>

        {pday.script && (
          <Card title="Today's script" sub={pday.script.title}
            right={<button className="chip chip-muted cursor-pointer hover:chip-hover" onClick={() => setScriptOpen((o) => !o)}>{scriptOpen ? "Hide" : "Show"}</button>}>
            {scriptOpen ? (
              <div className="grid gap-3">
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{pday.script.text}</p>
                <Btn variant="soft" onClick={() => sendScript(pday.script!.title, pday.script!.text)}>Read it in the Recorder</Btn>
              </div>
            ) : (
              <p className="text-[12.5px] text-[var(--muted)]">A {pday.script.text.split(/\s+/).length}-word script for today. Expand it here or send it to the Recorder for a scored comparison.</p>
            )}
          </Card>
        )}

        <Card title="Your favorite exercises" sub="Starred from the Library.">
          {favorites.length === 0 ? (
            <div className="grid gap-2">
              <p className="text-[12.5px] text-[var(--muted)]">No favorites yet. Star exercises in the Library and they will appear here for quick access.</p>
              <Btn variant="ghost" onClick={() => nav("library")}>Open Library →</Btn>
            </div>
          ) : (
            <div className="grid gap-2">
              {favorites.map((f) => (
                <div key={f.id} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium leading-tight">{f.name}</span>
                    <span className="text-[11px] tabular-nums text-[var(--muted)]">{fmtDur(f.durationSec)}</span>
                  </div>
                  <div className="mt-2"><Timer seconds={f.durationSec} onTick={() => setAccum((a) => a + 1)} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Record a check-in" sub="Compare yourself against your baseline over time.">
          <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
            {recordings.length === 0
              ? "You haven't recorded yet. Your first recording is your baseline — every future comparison starts here."
              : `${recordings.length} recording${recordings.length > 1 ? "s" : ""} so far. Today's recording will be compared against your Day 1 automatically.`}
          </p>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => sendScript(`Check-in — ${dayProgressLabel(day)}`, pday.impromptu.join("\n"))}>Open Recorder</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
