"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PracticeLanguage } from "@/lib/types";
import { parseStructuredFramework } from "@/lib/structuredSpeaking";
import { speakSingle, useActiveSpeech } from "@/lib/tts";
import { Btn, Chip } from "./ui";

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

/**
 * Interactive stage-by-stage timing & guidance widget strictly for PREP and
 * timed structured speaking framework exercises (never shown on ordinary reading passages).
 */
function StructuredSpeakingGuideInner({
  exerciseId,
  title,
  whatToDo,
  structureSteps,
  durationSec,
  language = "en",
}: {
  exerciseId?: string;
  title: string;
  whatToDo?: string;
  structureSteps: string[];
  durationSec?: number;
  language?: PracticeLanguage;
}) {
  const framework = useMemo(
    () =>
      parseStructuredFramework({
        id: exerciseId,
        title,
        language,
        whatToDo,
        structureSteps,
      }),
    [exerciseId, title, language, whatToDo, structureSteps]
  );
  const activeSpeech = useActiveSpeech();

  const [activeIdx, setActiveIdx] = useState(0);
  const [stageElapsed, setStageElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [completedFlash, setCompletedFlash] = useState(false);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stages = framework.stages;
  const currentStage = stages[activeIdx] ?? stages[0];
  const totalSec = framework.totalDurationSec || durationSec || 90;

  useEffect(() => {
    if (!running || stages.length === 0) return;
    ivRef.current = setInterval(() => {
      setStageElapsed((prev) => {
        const cur = stages[activeIdx];
        if (!cur) return prev;
        if (prev + 1 >= cur.durationSec) {
          if (activeIdx + 1 < stages.length) {
            setActiveIdx((i) => i + 1);
            return 0;
          }
          setRunning(false);
          setCompletedFlash(true);
          return cur.durationSec;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (ivRef.current) clearInterval(ivRef.current);
    };
  }, [running, activeIdx, stages]);

  // Auto-dismiss completion pill cleanly after 2 seconds
  useEffect(() => {
    if (!completedFlash) return;
    const t = setTimeout(() => setCompletedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [completedFlash]);

  if (stages.length === 0 || !currentStage) return null;

  const priorSec = stages.slice(0, activeIdx).reduce((sum, s) => sum + s.durationSec, 0);
  const totalElapsed = Math.min(totalSec, priorSec + stageElapsed);
  const totalPct = Math.min(100, Math.round((totalElapsed / Math.max(1, totalSec)) * 100));
  const stageLeft = Math.max(0, currentStage.durationSec - stageElapsed);
  const stagePct = Math.min(
    100,
    Math.round((stageElapsed / Math.max(1, currentStage.durationSec)) * 100)
  );

  const handleToggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (activeIdx === stages.length - 1 && stageElapsed >= currentStage.durationSec) {
      setActiveIdx(0);
      setStageElapsed(0);
    }
    setCompletedFlash(false);
    setRunning(true);
  };

  const handleReset = () => {
    setRunning(false);
    setActiveIdx(0);
    setStageElapsed(0);
    setCompletedFlash(false);
  };

  const selectStage = (idx: number) => {
    setActiveIdx(idx);
    setStageElapsed(0);
    setCompletedFlash(false);
  };

  const starterText = currentStage.starterPhrase;
  const colsClass =
    stages.length === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : stages.length === 3
      ? "sm:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="prep-shell space-y-3.5">
      {/* Header + interactive framework timer controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="brand">{framework.frameworkName}</Chip>
          <span className="text-[12px] font-semibold text-[var(--muted)]">
            {stages.length} timed sections · {formatClock(totalSec)} total
          </span>
          {completedFlash && (
            <span className="animate-pop rounded-full bg-[color-mix(in_srgb,var(--good)_15%,transparent)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--good)]">
              ✓ All stages complete
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Btn variant={running ? "soft" : "primary"} onClick={handleToggle}>
            {running
              ? "Pause Stages"
              : totalElapsed > 0 && stageLeft > 0
              ? "Resume Stages"
              : "Start Stage Timer"}
          </Btn>
          {(totalElapsed > 0 || activeIdx > 0) && (
            <Btn variant="ghost" onClick={handleReset}>
              Reset
            </Btn>
          )}
        </div>
      </div>

      {/* Topic banner if present */}
      {framework.topicPrompt && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[12.5px]">
          <span className="font-bold text-[var(--brand)]">Topic: </span>
          <span className="font-medium text-[var(--ink)]">{framework.topicPrompt}</span>
        </div>
      )}

      {/* Overall progress bar across framework */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
          style={{ width: `${totalPct}%` }}
        />
      </div>

      {/* Clickable stage cards (P · R · E · P or structured sequence) */}
      <div className={`grid gap-2.5 ${colsClass}`}>
        {stages.map((stage, idx) => {
          const isCurrent = idx === activeIdx;
          const isDone =
            idx < activeIdx ||
            (idx === activeIdx &&
              stageElapsed >= stage.durationSec &&
              !running &&
              totalElapsed > 0);
          return (
            <button
              key={stage.index}
              type="button"
              onClick={() => selectStage(idx)}
              aria-current={isCurrent ? "step" : undefined}
              className={`prep-stage text-left ${
                isCurrent ? "prep-stage-active" : isDone ? "prep-stage-done" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="prep-badge">{isDone && !isCurrent ? "✓" : stage.letter}</span>
                  <span className="text-[12.5px] font-bold text-[var(--ink)]">{stage.label}</span>
                </span>
                <span className="font-mono text-[11.5px] font-bold tabular-nums text-[var(--brand)]">
                  {isCurrent && (running || stageElapsed > 0)
                    ? formatClock(stageLeft)
                    : `${stage.durationSec}s`}
                </span>
              </div>

              <p className="mt-2 text-[11.5px] leading-snug text-[var(--muted)]">
                {stage.instruction}
              </p>

              {isCurrent && (running || stageElapsed > 0) && (
                <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
                    style={{ width: `${stagePct}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Focused active-stage cue + clickable voice playback */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12.5px]">
            <span className="font-bold text-[var(--brand)]">
              Stage {activeIdx + 1}/{stages.length} — {currentStage.label} ({formatClock(stageLeft)}):
            </span>{" "}
            <span className="text-[var(--ink)]">{currentStage.instruction}</span>
          </div>
          {activeIdx + 1 < stages.length && (
            <button
              type="button"
              onClick={() => selectStage(activeIdx + 1)}
              className="text-[11.5px] font-semibold text-[var(--brand)] hover:underline"
            >
              Next: {stages[activeIdx + 1].label} →
            </button>
          )}
        </div>

        {starterText && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2">
            <span className="text-[12px] text-[var(--muted)]">
              Opening phrase: <strong className="text-[var(--ink)]">&ldquo;{starterText}…&rdquo;</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              {([0.7, 1.0] as const).map((rate) => {
                const isPlaying = Boolean(
                  activeSpeech &&
                    activeSpeech.text === starterText &&
                    Math.abs(activeSpeech.rate - rate) < 0.05
                );
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => speakSingle(starterText, rate, undefined, language)}
                    className={`word-ctrl-btn ${isPlaying ? "word-ctrl-btn-active" : ""}`}
                    title={`Hear opening phrase at ${rate.toFixed(1)}x`}
                  >
                    ▶ {rate.toFixed(1)}x
                  </button>
                );
              })}
            </span>
          </div>
        )}

        {framework.ruleNote && (
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">Tip: {framework.ruleNote}</p>
        )}
      </div>
    </div>
  );
}

export function StructuredSpeakingGuide(props: {
  exerciseId?: string;
  title: string;
  whatToDo?: string;
  structureSteps: string[];
  durationSec?: number;
  language?: PracticeLanguage;
}) {
  return <StructuredSpeakingGuideInner key={`${props.exerciseId ?? ""}-${props.title}`} {...props} />;
}
