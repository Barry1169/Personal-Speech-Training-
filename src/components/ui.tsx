"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VolumeSample } from "@/lib/types";

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
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={`modal-pop max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--panel)] shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
          <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
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

export function Timer({ seconds, className = "", onTick }: { seconds: number; className?: string; onTick?: (elapsedSec: number) => void }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (running) {
      iv.current = setInterval(() => {
        setElapsed((e) => {
          const ne = e + 1;
          tickRef.current?.(ne);
          return ne;
        });
        setLeft((l) => {
          if (l <= 1) { setRunning(false); return 0; }
          return l - 1;
        });
      }, 1000);
    }
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [running]);

  const mm = Math.floor(left / 60).toString().padStart(2, "0");
  const ss = (left % 60).toString().padStart(2, "0");
  const em = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const es = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`timer-chip ${left === 0 && elapsed > 0 ? "timer-done" : ""}`}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4.6" /><path d="M6 3.5V6l1.8 1" /></svg>
        {mm}:{ss}
      </span>
      <Btn variant="soft" onClick={() => { setRunning((r) => !r); }} disabled={left === 0 && !running}>
        {running ? "Pause" : left === 0 ? "Run again" : "Start"}
      </Btn>
      <Btn variant="ghost" onClick={() => { setRunning(false); setLeft(seconds); setElapsed(0); }}>Reset</Btn>
      {elapsed > 0 && <span className="text-[11px] tabular-nums text-[var(--muted)]">practiced {em}:{es}</span>}
    </div>
  );
}

// ---------- Section label ----------

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}
