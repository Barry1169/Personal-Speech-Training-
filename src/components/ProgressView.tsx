"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SKILL_LABELS, weeklyReport, milestoneRecordings, compareRecordings } from "@/lib/coach";
import { paceLabel, volumeLabel } from "@/lib/analytics";
import { type Recording, fmtDur, type SkillKey } from "@/lib/types";
import { BarChart, Btn, Card, Chip, LineChart, Modal, Stat, VolumeTimeline } from "./ui";

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
  const { stats, badges, skillAverages, logs, recordings, settings, deleteRecording, getBlob, exportJSON, toast } = useStore();
  const [play, setPlay] = useState<{ rec: Recording; url: string | null } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Recording | null>(null);

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

  const skillSeries = useMemo(() => {
    const recs = [...recordings].filter((r) => r.self).slice(-14).sort((a, b) => a.createdAt - b.createdAt);
    const keys: SkillKey[] = ["clarity", "pronunciation", "fluency", "pacing", "vocalControl"];
    return {
      labels: recs.map((r) => new Date(r.createdAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })),
      series: keys.map((k) => ({ name: SKILL_LABELS[k], color: SKILL_COLORS[k], points: recs.map((r) => r.self![k] || null) })),
    };
  }, [recordings]);

  const wpmSeries = useMemo(() => {
    const recs = [...recordings].filter((r) => r.analysis.wpm != null).slice(-14).sort((a, b) => a.createdAt - b.createdAt);
    return {
      labels: recs.map((r) => new Date(r.createdAt).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })),
      points: recs.map((r) => r.analysis.wpm),
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

  const weakest = useMemo(() => {
    const entries = Object.entries(skillAverages).filter(([, v]) => v != null) as [string, number][];
    if (!entries.length) return null;
    entries.sort((a, b) => a[1] - b[1]);
    return { key: entries[0][0] as SkillKey, value: entries[0][1] };
  }, [skillAverages]);

  const report = useMemo(() => weeklyReport(recordings, logs, skillAverages as Record<SkillKey, number | null>), [recordings, logs, skillAverages]);

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
    if (!b) { toast("No audio stored for this recording", "err"); return; }
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${r.title.replace(/\s+/g, "-")}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  const exportLogsCsv = () => {
    const rows = [["date", "seconds", "mode", "exercises_completed", "clarity", "pronunciation", "fluency", "pacing", "vocal_control"]];
    for (const l of [...logs].sort((a, b) => a.ts - b.ts)) {
      rows.push([l.date, String(l.seconds), l.mode, String(l.completed), String(l.scores?.clarity ?? ""), String(l.scores?.pronunciation ?? ""), String(l.scores?.fluency ?? ""), String(l.scores?.pacing ?? ""), String(l.scores?.vocalControl ?? "")]);
    }
    downloadText(`speechcoach-logs-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
    toast("Logs CSV downloaded");
  };

  const exportRecsCsv = () => {
    const rows = [["date", "title", "mode", "duration_s", "wpm", "fillers", "long_pauses", "repeats", "volume_cv", "coverage_pct", "clarity", "pronunciation", "fluency", "pacing", "vocal_control"]];
    for (const r of [...recordings].sort((a, b) => a.createdAt - b.createdAt)) {
      rows.push([
        new Date(r.createdAt).toISOString().slice(0, 10), `"${r.title.replace(/"/g, "'")}"`, r.mode, String(r.durationSec),
        String(r.analysis.wpm ?? ""), String(r.analysis.fillerTotal), String(r.analysis.longPauses),
        `"${r.analysis.repeats.join("; ")}"`, String(r.analysis.volume ? r.analysis.volume.cv.toFixed(3) : ""),
        String(r.analysis.coverage ?? ""), String(r.self?.clarity ?? ""), String(r.self?.pronunciation ?? ""), String(r.self?.fluency ?? ""), String(r.self?.pacing ?? ""), String(r.self?.vocalControl ?? ""),
      ]);
    }
    downloadText(`speechcoach-recordings-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.join(",")).join("\n"), "text/csv");
    toast("Recordings CSV downloaded");
  };

  return (
    <div className="grid gap-5">
      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Practice time" value={fmtDur(stats.totalSec)} sub={`${stats.sessionCount} sessions`} />
        <Stat label="Current streak" value={`${stats.currentStreak}d`} sub={`best ${stats.bestStreak}d`} tone="accent" />
        <Stat label="Days practiced" value={stats.daysPracticed} sub="all-time" />
        <Stat label="Recordings" value={stats.recordingCount} sub="in history" />
        <Stat label="Best score avg" value={stats.bestAvgScore > 0 ? `${stats.bestAvgScore.toFixed(1)}/5` : "–"} sub="self-assessment" tone="brand" />
        <Stat label="Peak pace" value={stats.maxWpm > 0 ? `${stats.maxWpm}` : "–"} sub="wpm" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Daily practice — last 14 days" sub={`Daily goal: ${settings.dailyGoalMin} min — bars at or above it turn solid green.`}>
          <BarChart data={last14} goal={settings.dailyGoalMin} unit="m" />
        </Card>
        <Card title="Skills over time" sub="Self-assessment per recording (1–5). New recordings extend the lines.">
          {skillSeries.series.every((s) => s.points.every((p) => p == null)) ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">Score your first recording's self-assessment to start the trend lines.</p>
          ) : (
            <LineChart series={skillSeries.series} labels={skillSeries.labels} yMax={5} />
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Speaking speed (wpm)" sub="From your recordings — aim for the 120–150 band.">
          {wpmSeries.points.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">No pace data yet — record something with a few minutes of speech.</p>
          ) : (
            <LineChart series={[{ name: "wpm", color: SKILL_COLORS.pacing, points: wpmSeries.points }]} labels={wpmSeries.labels} yMax={200} />
          )}
        </Card>

        <Card title="Weakness tracker" sub="Your lowest current average skill, all-time.">
          {weakest ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${SKILL_COLORS[weakest.key]} 15%, transparent)`, color: SKILL_COLORS[weakest.key] }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 14l3.5-4 3 2.5L15 5M15 5h-4M15 5v4" /></svg>
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{SKILL_LABELS[weakest.key]}</p>
                  <p className="text-[12px] tabular-nums text-[var(--muted)]">{weakest.value.toFixed(1)}/5 all-time average</p>
                </div>
              </div>
              <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
                Routing: {weakest.key === "fluency" && "Fluency mode + Silent Beat drill from the Library."}
                {weakest.key === "pacing" && "Pacing drills in the Library (Speed Ladder, Slow-Down) and the pacing section of Today."}
                {weakest.key === "clarity" && "Articulation drills (S/Z, T/D/N, B/P/V/W) + slow reading at 90 wpm."}
                {weakest.key === "pronunciation" && "Pronunciation mode, Minimal Pairs Sprint, and shadowing sentences."}
                {weakest.key === "vocalControl" && "Breathing Trainer before every session + the Volume Consistency Check exercise."}
                Revisit after ~5 more recordings; averages are noisy early on.
              </p>
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-[var(--muted)]">Complete one self-assessment to activate the weakness tracker.</p>
          )}
        </Card>
      </div>

      <Card title="Recording history" sub={`${recordings.length} recordings — playback, analysis, download, or delete. All local.`}>
        {recordings.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--muted)]">No recordings yet. The Record page is where your history begins.</p>
        ) : (
          <div className="grid gap-2">
            {recordings.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2.5">
                <button className="icon-btn" onClick={() => openPlay(r)} title="Play">
                  {r.hasAudio ? (
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.2" /><path d="M7 4.5V7l1.8 1" /></svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{r.title}</p>
                  <p className="text-[11px] tabular-nums text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleDateString()} · {fmtDur(r.durationSec)} · {paceLabel(r.analysis.wpm).label} · fillers {r.analysis.fillerTotal} · pauses {r.analysis.longPauses} · {r.analysis.volume ? volumeLabel(r.analysis.volume.cv) : "no volume data"}
                    {r.analysis.coverage != null && ` · coverage ${r.analysis.coverage}%`}
                  </p>
                </div>
                {r.self && (
                  <Chip tone="brand">
                    {Object.values(r.self).filter((v) => v > 0).length > 0
                      ? `${(Object.values(r.self).filter((v) => v > 0).reduce((a, b) => a + b, 0) / Object.values(r.self).filter((v) => v > 0).length).toFixed(1)}/5`
                      : "unrated"}
                  </Chip>
                )}
                <div className="flex items-center gap-1">
                  <button className="icon-btn" title="Download" onClick={() => downloadRec(r)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 2v7M4.5 6.5L7 9l2.5-2.5M2.5 11.5h9" /></svg></button>
                  <button className="icon-btn hover:text-[var(--bad)]" title="Delete" onClick={() => setConfirmDel(r)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M3.5 3.5l.7 8h5.6l.7-8" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Milestone comparison" sub="Automatic Day 1 vs Day 7 vs Day 30 (and beyond) from your recording dates.">
          {milestones.length < 2 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted)]">Record on at least two dates at least a few days apart and the coach will line them up here.</p>
          ) : (
            <div className="grid gap-3">
              {milestones.map((m) => (
                <div key={m.rec.id} className="flex items-center gap-3">
                  <Chip tone="brand">{m.label}</Chip>
                  <span className="truncate text-[12.5px] text-[var(--muted)]">{m.rec.title} · {new Date(m.rec.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              <div className="mt-1 grid gap-1.5 rounded-lg bg-[var(--panel2)] p-3">
                {milestoneLines.map((l, i) => <p key={i} className="text-[12.5px] leading-relaxed text-[var(--muted)]">{l}</p>)}
              </div>
            </div>
          )}
        </Card>

        <Card title="Achievement badges" sub="Earned from your real logged activity.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {badges.map((b) => (
              <div key={b.id} className={`rounded-lg border p-2.5 ${b.earned ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]" : "border-[var(--line)] opacity-55"}`}>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill={b.earned ? "var(--brand)" : "none"} stroke={b.earned ? "var(--brand)" : "var(--muted)"} strokeWidth="1.3">
                    <circle cx="7" cy="5.5" r="3.8" /><path d="M4.5 8.5L3.5 12l3.5-1.5L10.5 12l-1-3.5" />
                  </svg>
                  <span className="text-[12px] font-semibold leading-tight">{b.name}</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-[var(--muted)]">{b.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Weekly report" sub="Generated from the last 7 days.">
          <pre className="whitespace-pre-wrap rounded-lg bg-[var(--panel2)] p-3 font-mono text-[12px] leading-relaxed">{report}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="soft" onClick={() => { navigator.clipboard?.writeText(report); toast("Report copied to clipboard"); }}>Copy</Btn>
            <Btn variant="soft" onClick={() => downloadText(`speechcoach-weekly-report-${new Date().toISOString().slice(0, 10)}.md`, report, "text/markdown")}>Download .md</Btn>
          </div>
        </Card>

        <Card title="Export progress reports" sub="Take your data anywhere — it is yours.">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div><p className="text-[13px] font-medium">Practice logs (CSV)</p><p className="text-[11.5px] text-[var(--muted)]">Every session: date, minutes, mode, scores</p></div>
              <Btn variant="soft" onClick={exportLogsCsv}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div><p className="text-[13px] font-medium">Recording analysis (CSV)</p><p className="text-[11.5px] text-[var(--muted)]">WPM, fillers, pauses, volume, coverage, self-scores</p></div>
              <Btn variant="soft" onClick={exportRecsCsv}>Export</Btn>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <div><p className="text-[13px] font-medium">Full JSON backup</p><p className="text-[11.5px] text-[var(--muted)]">Everything incl. audio — for the Data page import</p></div>
              <Btn variant="soft" onClick={() => exportJSON(true)}>Export</Btn>
            </div>
          </div>
        </Card>
      </div>

      {/* Playback modal */}
      <Modal open={!!play} onClose={closePlay} title={play?.rec.title ?? ""} wide>
        {play && (
          <div className="grid gap-4">
            {play.url ? <audio controls src={play.url} className="w-full" /> : <p className="text-[13px] text-[var(--muted)]">No audio stored for this recording (it was saved without audio).</p>}
            <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">{play.rec.transcript || "No transcript captured."}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Speed" value={`${play.rec.analysis.wpm ?? "–"} wpm`} />
              <Stat label="Fillers" value={play.rec.analysis.fillerTotal} />
              <Stat label="Long pauses" value={play.rec.analysis.longPauses} />
              <Stat label="Volume" value={volumeLabel(play.rec.analysis.volume?.cv ?? null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="soft" onClick={() => downloadRec(play.rec)}>Download audio</Btn>
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
              <Btn variant="danger" onClick={async () => { await deleteRecording(confirmDel.id); setConfirmDel(null); toast("Recording deleted", "info"); }}>Delete</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
