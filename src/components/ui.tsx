"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { PersonalWord, PitchSample, PracticeLanguage, PracticeLog, VolumeSample } from "@/lib/types";
import { getInlinePronunciation } from "@/lib/pronunciation";
import { speakSingle, useActiveSpeech } from "@/lib/tts";

// ---------- Buttons ----------

export function Btn({
  children, onClick, variant = "primary", className = "", disabled = false, type = "button", title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const base = "btn";
  const v = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : variant === "soft" ? "btn-soft" : "btn-ghost";
  return (
    <button type={type} title={title} className={`${base} ${v} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ---------- Card ----------

export function Card({ children, className = "", title, sub, right }: {
  children: React.ReactNode; className?: string; title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
          <div>
            {title && <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>}
            {sub && <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------- Modal ----------

export function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={onClose}
    >
      <div
        className={`modal-pop max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
          <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ---------- Fields ----------

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`inp ${p.className ?? ""}`} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`inp min-h-[80px] ${p.className ?? ""}`} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`inp ${p.className ?? ""}`} />;

// ---------- Chips ----------

export function Chip({ children, tone = "muted", className = "" }: { children: React.ReactNode; tone?: "muted" | "brand" | "good" | "warn" | "bad" | "accent"; className?: string }) {
  return <span className={`chip chip-${tone} ${className}`}>{children}</span>;
}

// ---------- Star / dot rating ----------

export function DotRating({ value, onChange, max = 5, label }: { value: number; onChange?: (v: number) => void; max?: number; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-28 shrink-0 text-[12.5px] text-[var(--muted)]">{label}</span>}
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1} of ${max}`}
            disabled={!onChange}
            onClick={() => onChange?.(i + 1)}
            className={`dot ${i < value ? "dot-on" : ""} ${onChange ? "cursor-pointer hover:scale-110" : ""}`}
          />
        ))}
      </div>
      <span className="w-7 text-right text-[12px] tabular-nums text-[var(--muted)]">{value > 0 ? value : "–"}</span>
    </div>
  );
}

// ---------- Progress ring ----------

export function Ring({ value, size = 64, stroke = 6, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ---------- Charts (hand-rolled SVG) ----------

export function BarChart({ data, height = 120, unit = "min", goal }: { data: { label: string; value: number }[]; height?: number; unit?: string; goal?: number }) {
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(3, (d.value / max) * (height - 22));
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height }}>
              <div
                className="w-full max-w-[26px] rounded-t-[4px] transition-colors"
                style={{ height: h, background: d.value >= (goal ?? 0) && goal ? "var(--brand)" : "var(--bar)", minHeight: 3 }}
              />
              <span className="mt-1 text-[9.5px] tabular-nums text-[var(--muted)]">{d.label}</span>
              <span className="pointer-events-none absolute -top-5 z-10 hidden whitespace-nowrap rounded bg-[var(--ink)] px-1.5 py-0.5 text-[10px] text-[var(--bg)] group-hover:block">
                {d.value.toFixed(0)}{unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineChart({ series, height = 130, labels, yMax = 5 }: {
  series: { name: string; color: string; points: (number | null)[] }[];
  height?: number; labels: string[]; yMax?: number;
}) {
  const W = 560;
  const H = height;
  const padL = 20;
  const padB = 18;
  const n = Math.max(2, labels.length);
  const x = (i: number) => padL + (i * (W - padL - 6)) / (n - 1);
  const y = (v: number) => H - padB - (v / yMax) * (H - padB - 8);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {[0, 1, 2, 3, 4, 5].filter((t) => t <= yMax).map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" strokeDasharray={t === 0 ? "" : "2 4"} />
            <text x={2} y={y(t) + 3.5} fontSize="9" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {series.map((s) => {
          const pts = s.points.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean) as string[];
          return (
            <g key={s.name}>
              {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {s.points.map((v, i) => (v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={s.color} />))}
            </g>
          );
        })}
        {labels.map((l, i) => (
          (i % Math.ceil(n / 10) === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={H - 4} fontSize="9" fill="var(--muted)" textAnchor="middle">{l}</text>
          )
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VolumeTimeline({ tl, height = 64 }: { tl: VolumeSample[]; height?: number }) {
  if (!tl.length) return <p className="text-[12px] text-[var(--muted)]">No volume data.</p>;
  const W = 560;
  const H = height;
  const maxT = tl[tl.length - 1]?.t || 1;
  const maxR = Math.max(...tl.map((s) => s.r), 0.05);
  const bars = Math.min(140, tl.length);
  const stride = Math.max(1, Math.floor(tl.length / bars));
  const sampled = tl.filter((_, i) => i % stride === 0);
  const bw = W / sampled.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <rect x="0" y="0" width={W} height={H} fill="var(--panel2)" rx="6" />
      {sampled.map((s, i) => {
        const h = Math.max(1, (s.r / maxR) * (H - 8));
        return <rect key={i} x={i * bw + 0.5} y={H - 4 - h} width={Math.max(1, bw - 1)} height={h} fill={s.r > 0.018 ? "var(--brand)" : "var(--line)"} rx="1" />;
      })}
      <text x={4} y={11} fontSize="9" fill="var(--muted)">0s</text>
      <text x={W - 4} y={11} fontSize="9" fill="var(--muted)" textAnchor="end">{Math.round(maxT / 1000)}s</text>
    </svg>
  );
}

// ---------- Stat tile ----------

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "brand" | "accent" | "bad" }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ? `text-[var(--${tone === "accent" ? "accent" : tone === "bad" ? "bad" : "brand"})]` : ""}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

// ---------- Timer ----------

function playTimerChime() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const notes = [523.25, 659.25, 783.99]; // soft C5 -> E5 -> G5 chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.13;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 1200);
  } catch {
    /* Web Audio unavailable */
  }
}

function TimerInner({
  seconds,
  className = "",
  onTick,
  onComplete,
}: {
  seconds: number;
  className?: string;
  onTick?: (elapsedSec: number) => void;
  onComplete?: () => void;
}) {
  const safeSeconds = Math.max(5, Math.round(seconds));
  const [left, setLeft] = useState(safeSeconds);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(onTick);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    tickRef.current = onTick;
    completeRef.current = onComplete;
  }, [onTick, onComplete]);

  useEffect(() => {
    if (!running) return;
    iv.current = setInterval(() => {
      setElapsed((e) => {
        const ne = e + 1;
        tickRef.current?.(ne);
        return ne;
      });
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          setFinished(true);
          playTimerChime();
          completeRef.current?.();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (iv.current) clearInterval(iv.current);
    };
  }, [running]);

  // Auto-dismiss the completion banner cleanly after 2 seconds so it never sticks on screen
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setFinished(false), 2000);
    return () => clearTimeout(timer);
  }, [finished]);

  const mm = Math.floor(left / 60).toString().padStart(2, "0");
  const ss = (left % 60).toString().padStart(2, "0");
  const fullMm = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const fullSs = (safeSeconds % 60).toString().padStart(2, "0");
  const em = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const es = (elapsed % 60).toString().padStart(2, "0");
  const pct = Math.min(100, Math.max(0, ((safeSeconds - left) / safeSeconds) * 100));

  const handlePrimary = () => {
    if (running) {
      setRunning(false);
    } else if (left === 0) {
      setLeft(safeSeconds);
      setFinished(false);
      setRunning(true);
    } else {
      setFinished(false);
      setRunning(true);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setLeft(safeSeconds);
    setElapsed(0);
    setFinished(false);
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div className="inline-flex flex-wrap items-center gap-2">
        <span
          className={`timer-chip ${finished || left === 0 ? "timer-done" : running ? "timer-running" : ""}`}
        >
          {finished || left === 0 ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4.6" />
              <path d="M6 3.5V6l1.8 1" />
            </svg>
          )}
          {mm}:{ss}
        </span>

        <Btn variant={left === 0 ? "primary" : "soft"} onClick={handlePrimary}>
          {running ? "Pause" : left === 0 ? "Run again" : elapsed > 0 ? "Resume" : "Start"}
        </Btn>

        <Btn variant="ghost" onClick={handleReset} title={`Reset timer to ${fullMm}:${fullSs}`}>
          Reset
        </Btn>

        {finished && (
          <button
            type="button"
            onClick={() => setFinished(false)}
            className="animate-pop inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--good)_15%,transparent)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--good)]"
            title="Dismiss"
          >
            ✓ Time&apos;s up!
          </button>
        )}

        {!finished && elapsed > 0 && (
          <span className="text-[11px] tabular-nums text-[var(--muted)]">practiced {em}:{es}</span>
        )}
      </div>

      {/* Live visual countdown bar */}
      <div className="h-1.5 w-full min-w-[180px] overflow-hidden rounded-full bg-[var(--panel2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: finished || left === 0 ? "var(--good)" : "var(--brand)",
          }}
        />
      </div>
    </div>
  );
}

export function Timer({
  seconds,
  resetKey,
  className = "",
  onTick,
  onComplete,
}: {
  seconds: number;
  resetKey?: string | number;
  className?: string;
  onTick?: (elapsedSec: number) => void;
  onComplete?: () => void;
}) {
  return (
    <TimerInner
      key={`${resetKey ?? "timer"}-${seconds}`}
      seconds={seconds}
      className={className}
      onTick={onTick}
      onComplete={onComplete}
    />
  );
}

// ---------- Live animated voice equalizer ----------

export function VoiceWaveBars({ level = 0.08, bars = 12 }: { level?: number; bars?: number }) {
  const weights = [0.45, 0.72, 0.95, 0.65, 1.0, 0.84, 0.92, 0.58, 0.96, 0.78, 0.62, 0.42];
  const norm = Math.min(1, Math.max(0.08, level * 7));
  return (
    <div className="flex h-7 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const w = weights[i % weights.length];
        const h = Math.round(5 + norm * w * 22);
        return <span key={i} className="voice-bar" style={{ height: `${h}px` }} />;
      })}
    </div>
  );
}

// ---------- Microphone / Iframe helper banner ----------

const noopSubscribe = () => () => undefined;
function getInIframeSnapshot(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
function getHostSnapshot(): string {
  try {
    return window.location.hostname;
  } catch {
    return "";
  }
}

export function MicHelperBanner({
  error,
  onManual,
}: {
  error: string | null;
  onManual?: () => void;
}) {
  const inIframe = useSyncExternalStore(noopSubscribe, getInIframeSnapshot, () => false);
  const host = useSyncExternalStore(noopSubscribe, getHostSnapshot, () => "");
  const isArenaPreview = inIframe && host.endsWith(".e2b.app");

  if (!error && !inIframe) return null;

  return (
    <div
      className={`animate-pop mt-3 rounded-xl border p-3.5 text-[12.5px] leading-relaxed ${
        error
          ? "border-[color-mix(in_srgb,var(--bad)_35%,var(--line))] bg-[color-mix(in_srgb,var(--bad)_7%,var(--panel))]"
          : "border-[color-mix(in_srgb,var(--brand)_28%,var(--line))] bg-[color-mix(in_srgb,var(--brand)_6%,var(--panel))]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${error ? "text-[var(--bad)]" : "text-[var(--brand)]"}`}>
            {isArenaPreview
              ? "Live microphone is restricted inside Arena's embedded preview"
              : error
              ? "Microphone access needed"
              : "Embedded frame detected — microphone access may be restricted"}
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {isArenaPreview
              ? "Arena's preview frame blocks browser microphone permissions for security. You can practice right now with Manual Transcript Check + Audio Models, or run locally (npm run dev → localhost:3000) / deploy to Vercel for full live voice & pitch recording."
              : error ||
                "If microphone access is blocked here, open SpeechCoach directly on localhost:3000 or your deployed URL, or use Manual Transcript Check."}
          </p>
        </div>
        {onManual && (
          <Btn variant={error ? "primary" : "soft"} onClick={onManual}>
            Use Manual Practice Check
          </Btn>
        )}
      </div>
    </div>
  );
}

// ---------- Section label ----------

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

// ---------- Score progress bar ----------

export function ScoreBar({ value, max = 100, tone }: { value: number; max?: number; tone?: "good" | "warn" | "bad" | "brand" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const resolved = tone ?? (pct >= 80 ? "good" : pct >= 60 ? "warn" : "bad");
  const color =
    resolved === "good"
      ? "var(--good)"
      : resolved === "warn"
      ? "var(--warn)"
      : resolved === "bad"
      ? "var(--bad)"
      : "var(--brand)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel2)]">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ---------- Pitch F0 contour (measured voiced pitch) ----------

export function PitchContour({ samples, height = 64 }: { samples: PitchSample[]; height?: number }) {
  if (samples.length < 4) {
    return <p className="text-[12px] text-[var(--muted)]">Not enough voiced pitch frames captured yet.</p>;
  }
  const W = 560;
  const H = height;
  const minT = samples[0].t;
  const maxT = Math.max(minT + 1000, samples[samples.length - 1].t);
  const hzVals = samples.map((s) => s.hz);
  const lo = Math.max(70, Math.min(...hzVals) - 15);
  const hi = Math.min(400, Math.max(...hzVals) + 15);
  const x = (t: number) => 8 + ((t - minT) / (maxT - minT)) * (W - 16);
  const y = (hz: number) => H - 10 - ((hz - lo) / Math.max(20, hi - lo)) * (H - 22);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <rect x="0" y="0" width={W} height={H} fill="var(--panel2)" rx="6" />
      {samples.map((s, i) => (
        <circle key={i} cx={x(s.t)} cy={y(s.hz)} r="2.1" fill="var(--accent)" opacity={Math.min(1, Math.max(0.45, s.clarity))} />
      ))}
      <text x={6} y={12} fontSize="9" fill="var(--muted)">{Math.round(hi)} Hz</text>
      <text x={6} y={H - 4} fontSize="9" fill="var(--muted)">{Math.round(lo)} Hz</text>
      <text x={W - 6} y={12} fontSize="9" fill="var(--muted)" textAnchor="end">measured vocal pitch (F0)</text>
    </svg>
  );
}

// ---------- Interactive Monthly Training Calendar ----------

export function TrainingCalendar({ logs, goalMin = 15, compact = false }: { logs: PracticeLog[]; goalMin?: number; compact?: boolean }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { year, month, label, cells, byDate, todayStr } = useMemo(() => {
    const now = new Date();
    const tStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const view = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const yr = view.getFullYear();
    const mo = view.getMonth();
    const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const firstDow = view.getDay(); // 0=Sun
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();

    const map = new Map<string, { seconds: number; sessions: number; notes: string[] }>();
    for (const l of logs) {
      const cur = map.get(l.date) ?? { seconds: 0, sessions: 0, notes: [] };
      cur.seconds += l.seconds;
      cur.sessions += 1;
      if (l.note) cur.notes.push(l.note);
      map.set(l.date, cur);
    }

    const list: ({ day: number; key: string } | null)[] = [];
    for (let i = 0; i < firstDow; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push({ day: d, key });
    }
    return { year: yr, month: mo, label: monthLabel, cells: list, byDate: map, todayStr: tStr };
  }, [logs, monthOffset]);

  void year;
  void month;
  const activeDetail = selectedDay ? byDate.get(selectedDay) : null;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[14px] font-semibold">{label}</p>
        <div className="flex items-center gap-1">
          <button className="icon-btn" title="Previous month" onClick={() => setMonthOffset((m) => m - 1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3L5 7l4 4" /></svg>
          </button>
          {monthOffset !== 0 && (
            <button className="chip chip-muted cursor-pointer" onClick={() => setMonthOffset(0)}>Today</button>
          )}
          <button className="icon-btn" title="Next month" onClick={() => setMonthOffset((m) => Math.min(0, m + 1))} disabled={monthOffset >= 0}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3l4 4-4 4" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{d}</span>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) return <span key={`e-${idx}`} />;
          const entry = byDate.get(cell.key);
          const mins = entry ? Math.round(entry.seconds / 60) : 0;
          const hitGoal = mins >= goalMin;
          const isToday = cell.key === todayStr;
          const isSelected = cell.key === selectedDay;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : cell.key)}
              title={entry ? `${cell.key}: ${mins} min (${entry.sessions} session${entry.sessions > 1 ? "s" : ""})` : cell.key}
              className={`flex flex-col items-center justify-center rounded-lg border text-[11px] tabular-nums transition ${
                compact ? "h-8" : "h-10"
              } ${
                isSelected
                  ? "border-[var(--accent)] ring-2 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
                  : isToday
                  ? "border-[var(--brand)]"
                  : "border-transparent"
              } ${
                hitGoal
                  ? "bg-[var(--brand)] font-semibold text-white"
                  : entry
                  ? "bg-[color-mix(in_srgb,var(--brand)_22%,var(--panel2))] font-semibold text-[var(--ink)]"
                  : "bg-[var(--panel2)] text-[var(--muted)] hover:border-[var(--line)]"
              }`}
            >
              <span>{cell.day}</span>
              {!compact && entry && <span className={`text-[9px] leading-none ${hitGoal ? "text-white/85" : "text-[var(--brand)]"}`}>{mins}m</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--panel2)] border border-[var(--line)]" /> Rest</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[color-mix(in_srgb,var(--brand)_28%,var(--panel2))]" /> Practiced</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand)]" /> Hit {goalMin}m goal</span>
        </div>
        {selectedDay && (
          <span className="text-[var(--ink)]">
            {selectedDay}: {activeDetail ? `${Math.round(activeDetail.seconds / 60)} min · ${activeDetail.sessions} session(s)` : "No logged practice"}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------- Compact Info Icon Toggle (for expandable feedback cards) ----------

export function InfoToggleBtn({
  open,
  onClick,
  label = "Toggle detailed coaching insight",
  className = "",
}: {
  open: boolean;
  onClick: (e: React.MouseEvent) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={label}
      title={open ? "Hide details" : "Show detailed coaching insight"}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-bold leading-none transition-colors ${
        open
          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
          : "border-[var(--line-strong)] bg-[var(--panel2)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
      } ${className}`}
    >
      i
    </button>
  );
}

// ---------- Inline Pronunciation Breakdown (easy phonetic + IPA) ----------

export function WordPronunciation({
  word,
  language,
  phonetic,
  ipa,
  savedWords,
  showIpa = true,
  paren = true,
  className = "",
}: {
  word: string;
  language?: PracticeLanguage;
  phonetic?: string;
  ipa?: string;
  savedWords?: PersonalWord[];
  showIpa?: boolean;
  paren?: boolean;
  className?: string;
}) {
  const info = useMemo(() => {
    if (phonetic) {
      return {
        phonetic: phonetic.replace(/-/g, "·"),
        ipa: ipa ?? "",
      };
    }
    return getInlinePronunciation(word, language, savedWords);
  }, [word, language, phonetic, ipa, savedWords]);

  if (!info.phonetic) return null;

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1 ${className}`}>
      <span className="phonetic-inline">
        {paren ? `(${info.phonetic}` : info.phonetic}
        {showIpa && info.ipa ? (
          <span className="ipa-inline"> · {info.ipa}</span>
        ) : null}
        {paren ? ")" : ""}
      </span>
    </span>
  );
}

// ---------- Standardized Per-Word Drill Controls: [0.7x] [1.0x] [Record Word] ----------

export function WordDrillControls({
  word,
  language = "en",
  onRecordWord,
  recordLabel = "Record Word",
  className = "",
}: {
  word: string;
  language?: PracticeLanguage;
  onRecordWord?: (word: string) => void;
  recordLabel?: string;
  className?: string;
}) {
  const active = useActiveSpeech();
  const cleanWord = word.trim();
  const isThisWord = active?.text.trim().toLowerCase() === cleanWord.toLowerCase();
  const playingSlow = Boolean(isThisWord && active && Math.abs(active.rate - 0.7) < 0.05);
  const playingNormal = Boolean(isThisWord && active && Math.abs(active.rate - 1.0) < 0.05);

  const handleSpeak = (e: React.MouseEvent, rate: 0.7 | 1.0) => {
    e.stopPropagation();
    if (!cleanWord) return;
    speakSingle(cleanWord, rate, undefined, language);
  };

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={(e) => handleSpeak(e, 0.7)}
        aria-pressed={playingSlow}
        title={`Play "${cleanWord}" slowly at 0.7x speed`}
        className={`word-ctrl-btn ${playingSlow ? "word-ctrl-btn-active" : ""}`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          {playingSlow ? <rect x="2.5" y="2.5" width="7" height="7" rx="1" /> : <path d="M3 2l7 4-7 4V2z" />}
        </svg>
        0.7x
      </button>
      <button
        type="button"
        onClick={(e) => handleSpeak(e, 1.0)}
        aria-pressed={playingNormal}
        title={`Play "${cleanWord}" at normal 1.0x speed`}
        className={`word-ctrl-btn ${playingNormal ? "word-ctrl-btn-active" : ""}`}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          {playingNormal ? <rect x="2.5" y="2.5" width="7" height="7" rx="1" /> : <path d="M3 2l7 4-7 4V2z" />}
        </svg>
        1.0x
      </button>
      {onRecordWord && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRecordWord(cleanWord);
          }}
          title={`Record and check your pronunciation of "${cleanWord}"`}
          className="word-ctrl-btn word-ctrl-btn-rec"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="6" r="4" />
          </svg>
          {recordLabel}
        </button>
      )}
    </span>
  );
}

