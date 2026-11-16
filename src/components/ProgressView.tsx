"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SKILL_LABELS, weeklyReport, milestoneRecordings, compareRecordings } from "@/lib/coach";
import { getRecordingAssessment, monthlyReport } from "@/lib/adaptiveCoach";
import { paceLabel, volumeLabel } from "@/lib/analytics";
import { fmtDur, type Recording, type SkillKey } from "@/lib/types";
import {
  BarChart,
  Btn,
  Card,
  Chip,
  LineChart,
  Modal,
  ScoreBar,
  SectionLabel,
  Stat,
  TrainingCalendar,
} from "./ui";

const SKILL_COLORS: Record<string, string> = {
  clarity: "#1f7a68",
  pronunciation: "#c2711d",
  fluency: "#7a5cc4",
  pacing: "#3a6ea5",
  vocalControl: "#b3452f",
};

function downloadText(name: string, text: string, mime = "text/plain") {
  const u = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export default function ProgressView() {
  const {
    stats,
    badges,
    skillAverages,
    skillStandings,
    improvement,
    commonMistakes,
    logs,
    recordings,
    debriefs,
    settings,
    deleteRecording,
    getBlob,
    exportJSON,
    toast,
  } = useStore();

  const [play, setPlay] = useState<{ rec: Recording; url: string | null } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Recording | null>(null);
  const [reportKind, setReportKind] = useState<"weekly" | "monthly">("weekly");

  const last14 = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      const secs = logs.filter((l) => l.date === key).reduce((a, l) => a + l.seconds, 0);
      out.push({ label: d.getDate().toString(), value: secs / 60 });
    }
    return out;
  }, [logs]);

  const overallSeries = useMemo(() => {
    const recs = [...recordings].slice(0, 14).sort((a, b) => a.createdAt - b.createdAt);
    return {
      labels: recs.map((r) => new Date(r.createdAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })),
      points: recs.map((r) => getRecordingAssessment(r).overallScore),
    };
  }, [recordings]);

  const skillSeries = useMemo(() => {
    const recs = [...recordings].filter((r) => r.self).slice(0, 14).sort((a, b) => a.createdAt - b.createdAt);
    const keys: SkillKey[] = ["clarity", "pronunciation", "fluency", "pacing", "vocalControl"];
    return {
      labels: recs.map((r) => new Date(r.createdAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })),
      series: keys.map((k) => ({ name: SKILL_LABELS[k], color: SKILL_COLORS[k], points: recs.map((r) => r.self![k] || null) })),
    };
  }, [recordings]);

  const wpmSeries = useMemo(() => {
    const recs = [...recordings].filter((r) => r.analysis.wpm != null).slice(0, 14).sort((a, b) => a.createdAt - b.createdAt);
    return {
      labels: recs.map((r) => new Date(r.createdAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })),
      points: recs.map((r) => r.analysis.wpm),
    };
  }, [recordings]);

  const latestVsPrev = useMemo(() => {
    if (recordings.length < 2) return null;
    const latest = recordings[0];
    const prev = recordings[1];
    const aLatest = getRecordingAssessment(latest);
    const aPrev = getRecordingAssessment(prev);
    return {
      latest,
      prev,
      scoreDelta: aLatest.overallScore - aPrev.overallScore,
      latestScore: aLatest.overallScore,
      prevScore: aPrev.overallScore,
      lines: compareRecordings(prev, latest),
    };
  }, [recordings]);

  const milestones = useMemo(() => milestoneRecordings(recordings), [recordings]);
  const milestoneLines = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i < milestones.length; i++) {
      out.push(`${milestones[i - 1].label} → ${milestones[i].label}: ${compareRecordings(milestones[i - 1].rec, milestones[i].rec).join(" ")}`);
    }
    return out;
  }, [milestones]);

  const rankedStandings = useMemo(
    () => [...skillStandings].filter((s) => s.score != null).sort((a, b) => (b.score as number) - (a.score as number)),
    [skillStandings]
  );

  const reportText = useMemo(
    () =>
      reportKind === "weekly"
        ? weeklyReport(recordings, logs, skillAverages as Record<SkillKey, number | null>)
        : monthlyReport(recordings, logs, skillAverages as Record<SkillKey, number | null>),
    [reportKind, recordings, logs, skillAverages]
  );

  const openPlay = async (r: Recording) => {
    let url: string | null = null;
    if (r.hasAudio) {
      const b = await getBlob(r.id);
      if (b) url = URL.createObjectURL(b);
    }
    setPlay({ rec: r, url });
  };

  const closePlay = () => {
    if (play?.url) URL.revokeObjectURL(play.url);
    setPlay(null);
  };

  const downloadRec = async (r: Recording) => {
    const b = await getBlob(r.id);
    if (!b) {
      toast("No audio stored for this recording", "err");
      return;
    }
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${r.title.replace(/\s+/g, "-")}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  const exportLogsCsv = () => {
    const rows = [["date", "seconds", "mode", "exercises_completed", "overall_score", "clarity", "pronunciation", "fluency", "pacing", "vocal_control"]];
    for (const l of [...logs].sort((a, b) => a.ts - b.ts)) {
      rows.push([
        l.date,
        String(l.seconds),
        l.mode,
        String(l.completed),
        String(l.overallScore ?? ""),
        String(l.scores?.clarity ?? ""),
        String(l.scores?.pronunciation ?? ""),
        String(l.scores?.fluency ?? ""),
        String(l.scores?.pacing ?? ""),
        String(l.scores?.vocalControl ?? ""),
      ]);
    }
    downloadText(`speechcoach-logs-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
    toast("Logs CSV downloaded");
  };

  const exportRecsCsv = () => {
    const rows = [
      [
        "date",
        "title",
        "mode",
        "duration_s",
        "overall_100",
        "wpm",
        "fillers",
        "long_pauses",
        "pitch_semitones",
        "repeats",
        "volume_cv",
        "coverage_pct",
        "clarity",
        "pronunciation",
        "fluency",
        "pacing",
        "vocal_control",
      ],
    ];
    for (const r of [...recordings].sort((a, b) => a.createdAt - b.createdAt)) {
      const a = getRecordingAssessment(r);
      rows.push([
        new Date(r.createdAt).toISOString().slice(0, 10),
        `"${r.title.replace(/"/g, "'")}"`,
        r.mode,
        String(r.durationSec),
        String(a.overallScore),
        String(r.analysis.wpm ?? ""),
        String(r.analysis.fillerTotal),
        String(r.analysis.longPauses),
        String(r.analysis.pitch ? r.analysis.pitch.semitoneRange : ""),
        `"${r.analysis.repeats.join("; ")}"`,
        String(r.analysis.volume ? r.analysis.volume.cv.toFixed(3) : ""),
        String(r.analysis.coverage ?? ""),
        String(r.self?.clarity ?? ""),
        String(r.self?.pronunciation ?? ""),
        String(r.self?.fluency ?? ""),
        String(r.self?.pacing ?? ""),
        String(r.self?.vocalControl ?? ""),
      ]);
    }
    downloadText(`speechcoach-recordings-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
    toast("Recordings CSV downloaded");
  };

  return (
    <div className="grid gap-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Practice time" value={fmtDur(stats.totalSec)} sub={`${stats.sessionCount} sessions`} />
        <Stat label="Current streak" value={`${stats.currentStreak}d`} sub={`best ${stats.bestStreak}d`} tone="accent" />
        <Stat label="Days practiced" value={stats.daysPracticed} sub="all-time" />
        <Stat label="Recordings" value={stats.recordingCount} sub="in history" />
        <Stat
          label="Speaking score"
          value={improvement.currentAvg != null ? `${improvement.currentAvg}/100` : "–"}
          sub={
            improvement.delta != null && improvement.recordingCount >= 2
              ? `${improvement.delta >= 0 ? "+" : ""}${improvement.delta} pts vs baseline`
              : "recent average"
          }
          tone="brand"
        />
        <Stat label="Peak pace" value={stats.maxWpm > 0 ? `${stats.maxWpm}` : "–"} sub="wpm" />
      </div>

      {/* Overall Score (/100) + Training Calendar */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Overall speaking score over time (0–100)" sub="Weighted composite of measured pace, fluency, pauses, clarity, expression, and self-checked pronunciation.">
          {overallSeries.points.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">
              Record your first practice session to start tracking your overall score curve.
            </p>
          ) : (
            <LineChart
              series={[{ name: "Overall / 100", color: "#1f7a68", points: overallSeries.points }]}
              labels={overallSeries.labels}
              yMax={100}
            />
          )}
        </Card>

        <Card title="Training calendar" sub="Click any date to inspect total minutes and completed sessions.">
          <TrainingCalendar logs={logs} goalMin={settings.dailyGoalMin} />
        </Card>
      </div>

      {/* Strongest vs Weakest Areas + Most Common Mistakes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Strongest & weakest speaking areas" sub="Running 0–100 averages across your recorded takes.">
          {rankedStandings.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted)]">
              Complete at least one recording to see your strengths and weaknesses breakdown.
            </p>
          ) : (
            <div className="grid gap-3">
              {rankedStandings.map((s, idx) => (
                <div key={s.skill} className="grid gap-1">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.label}</span>
                      {idx === 0 && <Chip tone="good">Strongest</Chip>}
                      {idx === rankedStandings.length - 1 && rankedStandings.length > 1 && <Chip tone="bad">Focus area</Chip>}
                    </div>
                    <span className="font-display font-bold tabular-nums">{s.score}/100</span>
                  </div>
                  <ScoreBar value={s.score ?? 0} />
                  <p className="text-[11px] text-[var(--muted)]">{s.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Most common mistakes" sub="Patterns spotted across your saved recordings.">
          {recordings.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted)]">
              Save recordings and your coach will surface recurring fillers, repeated words, pace habits, and commonly missed words.
            </p>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--panel2)] p-3">
                  <SectionLabel>Pace tendency</SectionLabel>
                  <p className="mt-1 text-[13.5px] font-semibold">{commonMistakes.paceTendency.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{commonMistakes.paceTendency.detail}</p>
                </div>
                <div className="rounded-lg bg-[var(--panel2)] p-3">
                  <SectionLabel>Pause &amp; breath habit</SectionLabel>
                  <p className="mt-1 text-[13.5px] font-semibold">{commonMistakes.pauseTendency.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{commonMistakes.pauseTendency.detail}</p>
                </div>
              </div>

              <div className="rounded-lg bg-[var(--panel2)] p-3">
                <SectionLabel>Top recurring filler words</SectionLabel>
                {commonMistakes.topFillers.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {commonMistakes.topFillers.map((f) => (
                      <Chip key={f.word} tone="warn">“{f.word}” ×{f.count}</Chip>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-[var(--good)]">Clean record — no recurring filler words detected.</p>
                )}
              </div>

              {commonMistakes.topMissedWords.length > 0 && (
                <div className="rounded-lg bg-[var(--panel2)] p-3">
                  <SectionLabel>Frequently missed / rough script words</SectionLabel>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {commonMistakes.topMissedWords.map((w) => (
                      <Chip key={w.word} tone="bad">{w.word} ×{w.count}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {commonMistakes.topRepeats.length > 0 && (
                <div className="rounded-lg bg-[var(--panel2)] p-3">
                  <SectionLabel>Repeated / restarted words</SectionLabel>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {commonMistakes.topRepeats.map((r) => (
                      <Chip key={r.word} tone="accent">{r.word} ×{r.count}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Latest vs Previous Attempt + Daily Minutes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Daily practice — last 14 days" sub={`Daily goal: ${settings.dailyGoalMin} min — bars at or above it turn solid teal.`}>
          <BarChart data={last14} goal={settings.dailyGoalMin} unit="m" />
        </Card>

        <Card title="Latest vs previous attempt" sub="Direct side-by-side comparison of your two most recent takes.">
          {!latestVsPrev ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">
              Save at least 2 recordings to compare your latest performance directly against your previous attempt.
            </p>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--panel2)] p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Previous → Latest</p>
                  <p className="font-display text-[20px] font-bold">
                    {latestVsPrev.prevScore} → {latestVsPrev.latestScore} / 100
                  </p>
                </div>
                <Chip tone={latestVsPrev.scoreDelta > 0 ? "good" : latestVsPrev.scoreDelta < 0 ? "warn" : "muted"}>
                  {latestVsPrev.scoreDelta >= 0 ? `+${latestVsPrev.scoreDelta}` : latestVsPrev.scoreDelta} pts
                </Chip>
              </div>
              <div className="text-[12px] text-[var(--muted)]">
                <p>Previous: <strong className="text-[var(--ink)]">{latestVsPrev.prev.title}</strong> ({new Date(latestVsPrev.prev.createdAt).toLocaleDateString()})</p>
                <p>Latest: <strong className="text-[var(--ink)]">{latestVsPrev.latest.title}</strong> ({new Date(latestVsPrev.latest.createdAt).toLocaleDateString()})</p>
              </div>
              <ul className="grid gap-1 rounded-lg bg-[var(--panel2)] p-3">
                {latestVsPrev.lines.map((l, i) => (
                  <li key={i} className="text-[12.5px] text-[var(--ink)]">{l}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Preserved Skill Trends & WPM */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Self-assessment skills over time" sub="Listening self-check ratings (1–5) per recording.">
          {skillSeries.series.every((s) => s.points.every((p) => p == null)) ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">
              Score your first recording&apos;s self-assessment to start the 5-skill trend lines.
            </p>
          ) : (
            <LineChart series={skillSeries.series} labels={skillSeries.labels} yMax={5} />
          )}
        </Card>

        <Card title="Speaking speed (WPM)" sub="From your recordings — aim for the 120–150 band.">
          {wpmSeries.points.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">
              No pace data yet — record something with at least 10 seconds of speech.
            </p>
          ) : (
            <LineChart
              series={[{ name: "wpm", color: SKILL_COLORS.pacing, points: wpmSeries.points }]}
              labels={wpmSeries.labels}
              yMax={200}
            />
          )}
        </Card>
      </div>

      {/* Recording History (Preserved + 100-point badge) */}
      <Card title="Recording history" sub={`${recordings.length} recordings — playback, analysis, download, or delete. All local.`}>
        {recordings.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--muted)]">
            No recordings yet. The Record page or Guided Daily Session is where your history begins.
          </p>
        ) : (
          <div className="grid gap-2">
            {recordings.map((r) => {
              const a = getRecordingAssessment(r);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2.5">
                  <button className="icon-btn" onClick={() => void openPlay(r)} title="Play">
                    {r.hasAudio ? (
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.2" /><path d="M7 4.5V7l1.8 1" /></svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.title}</p>
                    <p className="text-[11px] tabular-nums text-[var(--muted)]">
                      {new Date(r.createdAt).toLocaleDateString()} · {fmtDur(r.durationSec)} · {paceLabel(r.analysis.wpm).label} · fillers {r.analysis.fillerTotal} · pauses {r.analysis.longPauses}
                      {r.analysis.pitch ? ` · pitch ${r.analysis.pitch.semitoneRange.toFixed(1)}st` : ""}
                      {r.analysis.coverage != null && ` · match ${r.analysis.coverage}%`}
                    </p>
                  </div>
                  <Chip tone={a.overallScore >= 80 ? "good" : a.overallScore >= 60 ? "brand" : "warn"}>
                    {a.overallScore}/100
                  </Chip>
                  <div className="flex items-center gap-1">
                    <button className="icon-btn" title="Download" onClick={() => void downloadRec(r)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 2v7M4.5 6.5L7 9l2.5-2.5M2.5 11.5h9" /></svg>
                    </button>
                    <button className="icon-btn hover:text-[var(--bad)]" title="Delete" onClick={() => setConfirmDel(r)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M3.5 3.5l.7 8h5.6l.7-8" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Coach Debrief History */}
      {debriefs.length > 0 && (
        <Card title="Daily coaching debrief history" sub="How your personal coach evaluated your sessions and evolved your plan.">
          <div className="grid gap-2.5">
            {debriefs.slice(0, 6).map((d) => (
              <div key={d.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="brand">{d.date}</Chip>
                  {d.avgOverallScore != null && <Chip tone="good">{d.avgOverallScore}/100</Chip>}
                  <Chip tone="warn">Focus: {d.biggestWeakness.label}</Chip>
                  <span className="ml-auto text-[11px] text-[var(--muted)]">{fmtDur(d.durationSec)}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink)]">{d.summary}</p>
                <p className="mt-1 text-[11.5px] text-[var(--brand)]">{d.planChangeNote}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Milestones & Achievements */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Milestone comparison" sub="Automatic Day 1 vs Day 7 vs Day 30 (and beyond) from your recording dates.">
          {milestones.length < 2 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted)]">
              Record on at least two dates a few days apart and the coach will line them up here.
            </p>
          ) : (
            <div className="grid gap-3">
              {milestones.map((m) => (
                <div key={m.rec.id} className="flex items-center gap-3">
                  <Chip tone="brand">{m.label}</Chip>
                  <span className="truncate text-[12.5px] text-[var(--muted)]">
                    {m.rec.title} · {new Date(m.rec.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              <div className="mt-1 grid gap-1.5 rounded-lg bg-[var(--panel2)] p-3">
                {milestoneLines.map((l, i) => (
                  <p key={i} className="text-[12.5px] leading-relaxed text-[var(--muted)]">
                    {l}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Personal milestones & achievements" sub="Grounded in real logged practice — never hollow gamification.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-lg border p-2.5 ${
                  b.earned
                    ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]"
                    : "border-[var(--line)] opacity-55"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill={b.earned ? "var(--brand)" : "none"} stroke={b.earned ? "var(--brand)" : "var(--muted)"} strokeWidth="1.3">
                    <circle cx="7" cy="5.5" r="3.8" />
                    <path d="M4.5 8.5L3.5 12l3.5-1.5L10.5 12l-1-3.5" />
                  </svg>
                  <span className="text-[12px] font-semibold leading-tight">{b.name}</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-[var(--muted)]">{b.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly & Monthly Reports + Exports */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title={reportKind === "weekly" ? "Weekly coaching report" : "Monthly coaching report"}
          sub={reportKind === "weekly" ? "Generated from the last 7 days." : "Generated from the last 30 days."}
          right={
            <div className="inline-flex rounded-lg border border-[var(--line)] p-0.5 text-[11px]">
              {(["weekly", "monthly"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setReportKind(k)}
                  className={`rounded-md px-2.5 py-1 font-semibold capitalize ${
                    reportKind === k ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          }
        >
          <pre className="whitespace-pre-wrap rounded-lg bg-[var(--panel2)] p-3 font-mono text-[12px] leading-relaxed">
            {reportText}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn
              variant="soft"
              onClick={() => {
                void navigator.clipboard?.writeText(reportText);
                toast("Report copied to clipboard");
              }}
            >
              Copy
            </Btn>
            <Btn
              variant="soft"
              onClick={() =>
                downloadText(
                  `speechcoach-${reportKind}-report-${new Date().toISOString().slice(0, 10)}.md`,
                  reportText,
                  "text/markdown"
                )
              }
            >
              Download .md
            </Btn>
          </div>
        </Card>

        <Card title="Export progress reports" sub="Take your data anywhere — it is yours.">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Practice logs (CSV)</p>
                <p className="text-[11.5px] text-[var(--muted)]">Every session: date, minutes, mode, scores</p>
              </div>
              <Btn variant="soft" onClick={exportLogsCsv}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Recording analysis (CSV)</p>
                <p className="text-[11.5px] text-[var(--muted)]">Overall /100, WPM, fillers, pauses, pitch, volume, self-scores</p>
              </div>
              <Btn variant="soft" onClick={exportRecsCsv}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium">Full JSON backup</p>
                <p className="text-[11.5px] text-[var(--muted)]">Everything incl. audio, profile, plan, and debriefs</p>
              </div>
              <Btn variant="soft" onClick={() => void exportJSON(true)}>Export</Btn>
            </div>
          </div>
        </Card>
      </div>

      {/* Playback modal */}
      <Modal open={!!play} onClose={closePlay} title={play?.rec.title ?? ""} wide>
        {play && (
          <div className="grid gap-4">
            {play.url ? (
              <audio controls src={play.url} className="w-full" />
            ) : (
              <p className="text-[13px] text-[var(--muted)]">No audio stored for this recording.</p>
            )}
            <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">
              {play.rec.transcript || "No transcript captured."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Overall" value={`${getRecordingAssessment(play.rec).overallScore}/100`} tone="brand" />
              <Stat label="Speed" value={`${play.rec.analysis.wpm ?? "–"} wpm`} />
              <Stat label="Fillers" value={play.rec.analysis.fillerTotal} />
              <Stat label="Volume" value={volumeLabel(play.rec.analysis.volume?.cv ?? null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="soft" onClick={() => void downloadRec(play.rec)}>Download audio</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete recording?">
        {confirmDel && (
          <div className="grid gap-4">
            <p className="text-[13.5px] text-[var(--muted)]">
              Delete <strong className="text-[var(--ink)]">“{confirmDel.title}”</strong> and its audio? Your practice logs from this session stay in the history.
            </p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn>
              <Btn
                variant="danger"
                onClick={async () => {
                  await deleteRecording(confirmDel.id);
                  setConfirmDel(null);
                  toast("Recording deleted", "info");
                }}
              >
                Delete
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
