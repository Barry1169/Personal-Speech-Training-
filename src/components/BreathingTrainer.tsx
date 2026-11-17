"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Btn, Card, Field, Input } from "./ui";

type Phase = "inhale" | "hold" | "exhale";
type State = "idle" | "running" | "paused";

const PHASE_LABEL: Record<Phase, string> = {
  inhale: "Breathe in through your nose",
  hold: "Hold, gently",
  exhale: "Breathe out slowly, soft “ffff”",
};

const PHASE_FREQ: Record<Phase, number> = { inhale: 520, hold: 660, exhale: 440 };

export default function BreathingTrainer() {
  const { practiceLanguage, settings, setSettings, addLog, toast } = useStore();
  const [pat, setPat] = useState(settings.breathing);
  const [state, setState] = useState<State>("idle");
  const [phase, setPhase] = useState<Phase>("inhale");
  const [phaseLeft, setPhaseLeft] = useState(pat.inhale);
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState(true);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  const patRef = useRef(pat);
  const phaseRef = useRef<Phase>("inhale");
  const leftRef = useRef(pat.inhale);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    patRef.current = pat;
  }, [pat]);

  const beep = (freq: number) => {
    if (!soundRef.current) return;
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.25);
    } catch {
      /* audio not available */
    }
  };

  useEffect(() => {
    if (state !== "running") {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    timer.current = setInterval(() => {
      setElapsed((e) => e + 1);
      leftRef.current -= 1;
      if (leftRef.current <= 0) {
        const p = patRef.current;
        let next: Phase;
        if (phaseRef.current === "inhale") next = p.hold > 0 ? "hold" : "exhale";
        else if (phaseRef.current === "hold") next = "exhale";
        else {
          next = "inhale";
          setCycle((c) => c + 1);
        }
        phaseRef.current = next;
        leftRef.current = Math.max(1, next === "inhale" ? p.inhale : next === "hold" ? p.hold : p.exhale);
        beep(PHASE_FREQ[next]);
        setPhase(next);
      }
      setPhaseLeft(leftRef.current);
    }, 1000);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [state]);

  const updatePattern = (nextPat: { inhale: number; hold: number; exhale: number }) => {
    setPat(nextPat);
    setSettings({ breathing: nextPat });
    if (state === "idle") {
      phaseRef.current = "inhale";
      leftRef.current = Math.max(1, nextPat.inhale);
      setPhase("inhale");
      setPhaseLeft(leftRef.current);
    }
  };

  const start = () => {
    phaseRef.current = "inhale";
    leftRef.current = Math.max(1, pat.inhale);
    setPhase("inhale");
    setPhaseLeft(leftRef.current);
    setCycle(0);
    setElapsed(0);
    setState("running");
    beep(PHASE_FREQ.inhale);
  };

  const stop = () => {
    if (elapsed >= 20) {
      addLog({
        language: practiceLanguage,
        seconds: elapsed,
        mode: "breathing",
        completed: Math.max(1, cycle),
        scores: null,
        note: `Breathing (${pat.inhale}-${pat.hold}-${pat.exhale}, ${cycle} cycle${cycle === 1 ? "" : "s"})`,
      });
      toast(`Logged ${Math.max(1, Math.round(elapsed / 60))} min of breathing warm-up`);
    }
    setState("idle");
    phaseRef.current = "inhale";
    leftRef.current = Math.max(1, pat.inhale);
    setPhase("inhale");
    setPhaseLeft(leftRef.current);
  };

  // Purely derived scale (no setState inside useEffect!)
  const scale = state === "idle" ? 1 : phase === "inhale" || phase === "hold" ? 1.42 : 1;
  const dur = phase === "inhale" ? pat.inhale : phase === "hold" ? Math.max(1, pat.hold) : pat.exhale;
  const progress = 1 - phaseLeft / Math.max(1, dur);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col items-center justify-center" title="Breathing Trainer" sub="Long-exhale patterns calm the nervous system before you speak.">
        <div className="relative flex h-[300px] w-full items-center justify-center">
          <div className="absolute h-[240px] w-[240px] rounded-full border border-dashed border-[var(--line)]" />
          <div
            className="flex h-[210px] w-[210px] items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, var(--brand-solid), var(--brand-solid-end) 75%)",
              transform: `scale(${scale})`,
              transition: state === "running" || state === "paused" ? `transform ${dur}s linear` : "transform .6s ease",
              boxShadow: "0 10px 40px -8px color-mix(in srgb, var(--brand-solid) 48%, transparent)",
            }}
          >
            <div className="text-center text-white">
              {state === "idle" ? (
                <p className="px-8 text-[14px] leading-snug opacity-90">Press Start to begin the guided cycle</p>
              ) : (
                <>
                  <p className="font-display text-[15px] font-medium uppercase tracking-[0.18em] opacity-80">{phase}</p>
                  <p className="my-1 font-display text-5xl font-semibold tabular-nums">{state === "paused" ? "•" : phaseLeft}</p>
                  <p className="px-6 text-[12.5px] leading-snug opacity-90">{PHASE_LABEL[phase]}</p>
                </>
              )}
            </div>
          </div>
          {state !== "idle" && (
            <svg className="absolute" width="260" height="260" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="124" fill="none" stroke="var(--line)" strokeWidth="3" />
              <circle
                cx="130"
                cy="130"
                r="124"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 124}`}
                strokeDashoffset={`${2 * Math.PI * 124 * (1 - progress)}`}
                transform="rotate(-90 130 130)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {state === "idle" && <Btn onClick={start}>Start</Btn>}
          {state === "running" && <Btn variant="soft" onClick={() => setState("paused")}>Pause</Btn>}
          {state === "paused" && <Btn onClick={() => setState("running")}>Resume</Btn>}
          {state !== "idle" && <Btn variant="danger" onClick={stop}>{elapsed >= 20 ? "Stop & Log" : "Stop"}</Btn>}
          <label className="ml-2 flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--muted)]">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="accent-[var(--brand)]" />
            Phase chime
          </label>
        </div>

        <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-3 text-center">
          <div className="stat"><span className="stat-label">Cycle</span><span className="stat-value">{cycle}</span></div>
          <div className="stat"><span className="stat-label">Elapsed</span><span className="stat-value">{fmt(elapsed)}</span></div>
          <div className="stat"><span className="stat-label">Pattern</span><span className="stat-value text-[15px]">{pat.inhale} · {pat.hold} · {pat.exhale}</span></div>
        </div>
      </Card>

      <div className="grid content-start gap-5">
        <Card title="Custom pattern" sub="Saved automatically to your settings. Long exhale = calm; equal timing = activation.">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Inhale (s)">
              <Input
                type="number"
                min={1}
                max={15}
                value={pat.inhale}
                onChange={(e) => {
                  const v = Math.min(15, Math.max(1, Number(e.target.value) || 1));
                  updatePattern({ ...pat, inhale: v });
                }}
              />
            </Field>
            <Field label="Hold (s)">
              <Input
                type="number"
                min={0}
                max={20}
                value={pat.hold}
                onChange={(e) => {
                  const v = Math.min(20, Math.max(0, Number(e.target.value) || 0));
                  updatePattern({ ...pat, hold: v });
                }}
              />
            </Field>
            <Field label="Exhale (s)">
              <Input
                type="number"
                min={1}
                max={20}
                value={pat.exhale}
                onChange={(e) => {
                  const v = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                  updatePattern({ ...pat, exhale: v });
                }}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { n: "Calm 3-4-6", v: { inhale: 3, hold: 4, exhale: 6 } },
              { n: "Deep 4-7-8", v: { inhale: 4, hold: 7, exhale: 8 } },
              { n: "Box 4-4-4", v: { inhale: 4, hold: 4, exhale: 4 } },
              { n: "Speak 5-2-8", v: { inhale: 5, hold: 2, exhale: 8 } },
            ].map((p) => (
              <button
                key={p.n}
                className="chip chip-muted cursor-pointer hover:chip-hover"
                onClick={() => updatePattern(p.v)}
              >
                {p.n}
              </button>
            ))}
          </div>
        </Card>
        <Card title="How to use it">
          <ol className="grid gap-2 text-[13px] leading-relaxed text-[var(--muted)]">
            <li><strong className="text-[var(--ink)]">Before every session</strong> — 6 cycles of 3-4-6. It is your warm-up, every single day.</li>
            <li><strong className="text-[var(--ink)]">Before a stressful talk</strong> — 4-7-8 for 3 minutes. The long exhale directly lowers vocal tension.</li>
            <li><strong className="text-[var(--ink)]">During practice</strong> — use a 5-2-8 cycle right before recording; a fuller exhale gives you a steadier volume band.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
