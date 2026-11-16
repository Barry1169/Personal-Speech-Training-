"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { compareWords, buildAnalysis, paceLabel, volumeLabel, type Comparison } from "@/lib/analytics";
import type { RecordingAnalysis } from "@/lib/types";
import { scoreSkills, topWeaknesses, recommendExercises, personalizedRoutine, compareRecordings, type SkillScore } from "@/lib/coach";
import { BUILTIN_EXERCISES } from "@/lib/program";
import { dayProgressLabel } from "@/lib/program";
import { type Recording, type SelfScores, type VolumeSample, EMPTY_SCORES, fmtDur, uid } from "@/lib/types";
import { Btn, Card, Chip, DotRating, SectionLabel, Textarea, VolumeTimeline, Input } from "./ui";

type Phase = "idle" | "recording" | "review";

export default function RecordView({ nav }: { nav: (v: string) => void }) {
  const { settings, setSettings, saveRecording, addLog, toast, recordings, exercises, getBlob } = useStore();

  const task = settings.task;
  const [script, setScript] = useState(task?.script ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState("");
  const [manual, setManual] = useState("");
  const [usingManual, setUsingManual] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [rec, setRec] = useState<Recording | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [tl, setTl] = useState<VolumeSample[]>([]);
  const [self, setSelf] = useState<SelfScores>(EMPTY_SCORES);
  const [srSupported, setSrSupported] = useState<boolean | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const srRef = useRef<any>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTs = useRef(0);
  const chunks = useRef<Blob[]>([]);
  const finals = useRef<string[]>([]);
  const recOn = useRef(false);
  const disposed = useRef(false);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSrSupported(!!SR);
    disposed.current = false;
    return () => {
      disposed.current = true;
      recOn.current = false;
      try { srRef.current?.stop(); } catch { /* noop */ }
      try {
        const mr = mrRef.current;
        if (mr) {
          mr.onstop = null; // do not finish()/setState after unmount
          if (mr.state !== "inactive") mr.stop();
        }
      } catch { /* noop */ }
      if (volIv.current) clearInterval(volIv.current);
      if (elapsedIv.current) clearInterval(elapsedIv.current);
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const stopAll = () => {
    recOn.current = false;
    try { srRef.current?.stop(); } catch { /* noop */ }
    if (volIv.current) { clearInterval(volIv.current); volIv.current = null; }
    if (elapsedIv.current) { clearInterval(elapsedIv.current); elapsedIv.current = null; }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
  };

  const start = async () => {
    setMicError(null);
    setAudioError(null);
    finals.current = [];
    chunks.current = [];
    setLive("");
    setManual("");
    setElapsed(0);
    setPhase("recording");
    setSelf(EMPTY_SCORES);
    try {
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Unsupported", "NotSupportedError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mrRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        finish(b);
      };
      mr.start(250);

      // volume sampler
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        if (ctx.state === "suspended") void ctx.resume();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        const samples: VolumeSample[] = [];
        setTl([]);
        volIv.current = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          samples.push({ t: Date.now() - startTs.current, r: rms });
          if (samples.length % 5 === 0) setTl([...samples]);
        }, 100);
      } catch { /* volume sampling unavailable */ }

      // speech-to-text
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        setUsingManual(false);
        const r = new SR();
        srRef.current = r;
        r.continuous = true;
        r.interimResults = true;
        r.lang = "en-US";
        r.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) finals.current.push(res[0].transcript);
            else interim += res[0].transcript;
          }
          setLive([...finals.current].join(" ") + " " + interim);
        };
        r.onend = () => {
          if (recOn.current) { try { r.start(); } catch { /* noop */ } }
        };
        r.onerror = () => { /* keep going */ };
        try { r.start(); } catch { /* noop */ }
      }
      startTs.current = Date.now();
      recOn.current = true;
      elapsedIv.current = setInterval(() => setElapsed(Math.round((Date.now() - startTs.current) / 1000)), 500);
    } catch (e) {
      setPhase("idle");
      stopAll();
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone permission was denied. Click the microphone icon in the browser address bar, allow access, then try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFound") {
        setMicError("No microphone was found on this device.");
      } else {
        setMicError(`Recording could not start (${name || "unsupported in this browser"}). Chrome or Edge on desktop are recommended.`);
      }
    }
  };

  const finish = (audio: Blob | null) => {
    if (disposed.current) return;
    const durationSec = Math.max(1, Math.round((Date.now() - startTs.current) / 1000));
    stopAll();
    const transcript = finals.current.join(" ").replace(/\s+/g, " ").trim();
    const cmp = script.trim() ? compareWords(script, transcript) : null;
    const samples = tlRef.current;
    const analysis = buildAnalysis(transcript, durationSec, samples, cmp);
    const r: Recording = {
      id: uid(),
      createdAt: Date.now(),
      title: title.trim() || `Session — ${dayProgressLabel(settings.currentDay)}`,
      mode: task?.mode ?? "manual",
      scriptText: script.trim() || null,
      transcript,
      durationSec,
      analysis,
      self: null,
      hasAudio: !!audio && audio.size > 0,
      mimeType: audio?.type ?? "audio/webm",
      dayLabel: dayProgressLabel(settings.currentDay),
    };
    setRec(r);
    setBlob(audio);
    if (audio && audio.size > 0) {
      const u = URL.createObjectURL(audio);
      setBlobUrl(u);
    } else {
      setAudioError("No audio was captured (recording was very short or the browser blocked it).");
    }
    if (!transcript) {
      setUsingManual(true);
      toast("No transcript captured — type what you said, or replay and listen.", "info");
    }
    setPhase("review");
  };

  // keep latest samples for finish()
  const tlRef = useRef<VolumeSample[]>([]);
  tlRef.current = tl;

  const stop = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    else finish(null);
  };

  const discard = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setBlob(null);
    setRec(null);
    setPhase("idle");
  };

  const save = async () => {
    if (!rec) return;
    const full: Recording = {
      ...rec,
      transcript: effectiveTranscript,
      analysis: liveAnalysis ?? rec.analysis,
      self: Object.values(self).some((v) => v > 0) ? self : null,
    };
    await saveRecording(full, blob);
    addLog({ seconds: rec.durationSec, mode: full.mode, completed: 0, scores: full.self, note: full.title });
    setSettings({ task: null });
    toast(`Recording saved (${fmtDur(rec.durationSec)})`);
    setRec({ ...full });
    // keep review visible; mark saved
    setSaved(true);
  };

  const [saved, setSaved] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const openHistory = (id: string) => setTargetId(id);

  // Effective transcript = manual text if the user switched to manual, else STT text.
  // Comparison + analysis recompute live so corrections re-score everything below.
  const effectiveTranscript = rec ? (usingManual ? manual.trim() : rec.transcript) : "";
  const liveCmp = useMemo<Comparison | null>(() => {
    if (!rec?.scriptText) return null;
    return compareWords(rec.scriptText, effectiveTranscript);
  }, [rec, effectiveTranscript]);
  const liveAnalysis = useMemo<RecordingAnalysis | null>(() => {
    if (!rec) return null;
    return buildAnalysis(effectiveTranscript, rec.durationSec, tl, liveCmp);
  }, [rec, effectiveTranscript, tl, liveCmp]);

  const download = () => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${rec?.title ?? "recording"}.webm`.replace(/\s+/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  const scores: SkillScore[] = useMemo(() => {
    if (!rec || !liveAnalysis) return [];
    return scoreSkills({ analysis: liveAnalysis, self: Object.values(self).some((v) => v > 0) ? self : null });
  }, [rec, liveAnalysis, self]);

  const weak = useMemo(() => topWeaknesses(scores, 3), [scores]);

  const recs = useMemo(() => {
    if (!rec) return [];
    return recommendExercises(weak, [...BUILTIN_EXERCISES, ...exercises]);
  }, [rec, weak, exercises]);

  const routine = useMemo(() => personalizedRoutine(weak), [weak]);

  const vsPrevious = useMemo(() => {
    if (!rec || !liveAnalysis || recordings.length === 0) return null;
    const prev = [...recordings].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (prev.id === rec.id) return null;
    return {
      label: "vs your earliest recording",
      lines: compareRecordings(prev, { ...rec, transcript: effectiveTranscript, analysis: liveAnalysis, self: Object.values(self).some((v) => v > 0) ? self : null }),
    };
  }, [rec, liveAnalysis, effectiveTranscript, recordings, self]);

  const pace = liveAnalysis ? paceLabel(liveAnalysis.wpm) : null;
  const liveWords = live ? live.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid content-start gap-5">
        {/* Task setup / capture */}
        <Card title={phase === "recording" ? "Recording…" : "Record & assess"}
          sub="Speak against a script for word-level comparison, or free-talk for pure stats. Everything is saved locally.">
          {phase !== "recording" && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                <label className="block">
                  <span className="lbl">Title</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Check-in — ${dayProgressLabel(settings.currentDay)}`} />
                </label>
              </div>
              <label className="block">
                <span className="lbl">Script to compare against <span className="normal-case text-[var(--muted)]">(optional)</span></span>
                <Textarea rows={4} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste a passage, your interview answers, or any text you want to read. Leave empty for free speaking." />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={start}>
                  <svg className="mr-1.5" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="4.5" r="3" /><path d="M2.5 10.2c1-1.7 6-1.7 7 0" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
                  Start recording
                </Btn>
                {task && (
                  <Btn variant="ghost" onClick={() => { setSettings({ task: null }); setScript(""); setTitle(""); }}>Clear imported task</Btn>
                )}
                <span className="ml-auto text-[11.5px] text-[var(--muted)]">
                  {srSupported === null ? "…" : srSupported
                    ? "Speech-to-text: available (live transcript)"
                    : "Speech-to-text: not supported in this browser — use the manual transcript after recording"}
                </span>
              </div>
              {micError && <p className="rounded-lg bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] px-3 py-2 text-[12.5px] text-[var(--bad)]">{micError}</p>}
            </div>
          )}

          {phase === "recording" && (
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="rec-dot" />
                <div>
                  <p className="font-display text-[17px] font-semibold tabular-nums">{fmtDur(elapsed)}</p>
                  <p className="text-[11.5px] text-[var(--muted)]">{liveWords} words transcribed so far</p>
                </div>
                <Btn variant="danger" onClick={stop} className="ml-auto">Stop</Btn>
              </div>
              <VolumeTimeline tl={tl} />
              <div className="rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">
                {usingManual ? "Listening… (no live transcript in this browser)" : live ? <span className="live-transcript">{live} <span className="caret">▍</span></span> : <span className="text-[var(--muted)]">Listening… start talking.</span>}
              </div>
            </div>
          )}
        </Card>

        {/* Review */}
        {phase === "review" && rec && (
          <>
            <Card title={rec.title} sub={`${rec.dayLabel} · ${fmtDur(rec.durationSec)}`}
              right={saved ? <Chip tone="good">Saved to history</Chip> : <Chip tone="warn">Not saved yet</Chip>}>
              <div className="grid gap-4">
                {blobUrl ? (
                  <div>
                    <SectionLabel>Replay</SectionLabel>
                    <audio controls src={blobUrl} className="mt-1 w-full" />
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[var(--bad)]">{audioError ?? "No audio available."}</p>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <SectionLabel>Transcript {srSupported && !usingManual && <span className="normal-case text-[var(--muted)]">(speech-to-text — editable)</span>}</SectionLabel>
                    {!usingManual && <button className="chip chip-muted cursor-pointer hover:chip-hover" onClick={() => { setManual(live); setUsingManual(true); }}>Switch to manual</button>}
                  </div>
                  {usingManual ? (
                    <Textarea rows={5} className="mt-1.5" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Type what you said (or what you clearly heard yourself saying). This powers the comparison below." />
                  ) : (
                    <div className="mt-1.5 whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">{rec.transcript || "No transcript captured."}</div>
                  )}
                  {usingManual && <p className="mt-1 text-[11.5px] text-[var(--muted)]">Updating the manual text re-runs the comparison and coach feedback below.</p>}
                </div>

                {rec.scriptText && (
                  <div>
                    <SectionLabel>Comparison with the script</SectionLabel>
                    {liveCmp && liveAnalysis?.coverage != null && (
                      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                        <Chip tone={liveAnalysis.coverage >= 90 ? "good" : liveAnalysis.coverage >= 70 ? "warn" : "bad"}>{liveAnalysis.coverage}% matched</Chip>{" "}
                        <span className="text-[var(--bad)]">{liveCmp.missingCount} missing</span> ·{" "}
                        <span className="text-[var(--accent)]">{liveCmp.extraCount} extra</span>
                      </p>
                    )}
                    <div className="mt-1.5 rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-[1.9]">
                      {liveCmp?.tokens.map((t, i) => (
                        <span key={i} className={
                          t.status === "missing" ? "diff-missing" :
                          t.status === "extra" ? "diff-extra" : ""
                        }>{t.word} </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--muted)]">
                      <strong className="text-[var(--ink)]">Honesty note:</strong> word-matching compares <em>what the speech-to-text engine heard</em>, not how you pronounced each word. A mis-transcription can show a word as “missing” even when you said it clearly — and vice versa. Use it as a map of gaps, not a pronunciation score.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Voice analysis" sub="Computed locally from your audio and transcript.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="stat"><span className="stat-label">Speaking speed</span><span className="stat-value text-[15px]">{pace?.label ?? "n/a"}</span></div>
                <div className="stat"><span className="stat-label">Filler words</span><span className="stat-value">{liveAnalysis?.fillerTotal ?? 0}</span>
                  <span className="stat-sub">{Object.entries(liveAnalysis?.fillers ?? {}).map(([k, v]) => `${k}×${v}`).join(", ") || "none detected"}</span></div>
                <div className="stat"><span className="stat-label">Long pauses</span><span className="stat-value">{liveAnalysis?.longPauses ?? 0}</span><span className="stat-sub">silence &gt; 1.2s (from your audio)</span></div>
                <div className="stat"><span className="stat-label">Volume</span><span className="stat-value text-[15px]">{volumeLabel(liveAnalysis?.volume?.cv ?? null)}</span>
                  <span className="stat-sub">{liveAnalysis?.volume ? `index ${liveAnalysis.volume.cv.toFixed(2)} · spoke ${Math.round(liveAnalysis.volume.activeRatio * 100)}% of time` : "no data"}</span></div>
              </div>
              {(liveAnalysis?.repeats.length ?? 0) > 0 && (
                <p className="mt-3 text-[12.5px] text-[var(--muted)]">Repeated words: <span className="text-[var(--ink)]">{liveAnalysis!.repeats.slice(0, 8).join(", ")}</span>{liveAnalysis!.repeats.length > 8 ? ` +${liveAnalysis!.repeats.length - 8} more` : ""}</p>
              )}
              <div className="mt-4">
                <SectionLabel>Volume timeline</SectionLabel>
                <div className="mt-1"><VolumeTimeline tl={tl} height={72} /></div>
              </div>
            </Card>

            <Card title="AI speech coach" sub="Rule-based feedback from your local analysis — no data leaves this device.">
              <div className="grid gap-4">
                <div>
                  <SectionLabel>Your three biggest weaknesses in this take</SectionLabel>
                  <div className="mt-2 grid gap-2">
                    {weak.map((w, i) => (
                      <div key={w.key} className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bad)] text-[11px] font-semibold text-white">{i + 1}</span>
                          <span className="text-[13.5px] font-semibold">{w.label}</span>
                          <span className="ml-auto text-[12px] tabular-nums text-[var(--muted)]">{w.score.toFixed(1)}/5</span>
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">{w.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionLabel>Recommended exercises</SectionLabel>
                  <div className="mt-2 grid gap-1.5">
                    {recs.map((r, i) => (
                      <button key={i} className="flex items-start gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2 text-left hover:chip-hover" onClick={() => nav("library")}>
                        <svg className="mt-0.5 shrink-0 text-[var(--brand)]" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 3.5l2 2 4-4M2 9.5l2 2 4-4" /><path d="M10 4h2M10 10h2" /></svg>
                        <span>
                          <span className="text-[13px] font-medium">{r.title}</span>
                          <span className="block text-[11.5px] text-[var(--muted)]">{r.reason}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionLabel>Personalized routine for today</SectionLabel>
                  <ol className="mt-2 grid gap-1.5">
                    {routine.map((s, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-[13px] leading-relaxed">
                        <span className="tabular-nums text-[var(--muted)]">{i + 1}.</span>
                        <span>{s.step} <span className="text-[11.5px] text-[var(--muted)]">~{s.minutes} min</span></span>
                      </li>
                    ))}
                  </ol>
                </div>
                {vsPrevious && (
                  <div>
                    <SectionLabel>{vsPrevious.label}</SectionLabel>
                    <ul className="mt-2 grid gap-1">
                      {vsPrevious.lines.map((l, i) => <li key={i} className="text-[12.5px] text-[var(--muted)]">{l}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Self-assessment" sub="Score how it felt and sounded to you, 1–5. These feed your skill trends.">
              <div className="grid gap-3">
                <DotRating label="Clarity" value={self.clarity} onChange={(v) => setSelf((s) => ({ ...s, clarity: v }))} />
                <DotRating label="Pronunciation" value={self.pronunciation} onChange={(v) => setSelf((s) => ({ ...s, pronunciation: v }))} />
                <DotRating label="Fluency" value={self.fluency} onChange={(v) => setSelf((s) => ({ ...s, fluency: v }))} />
                <DotRating label="Pacing" value={self.pacing} onChange={(v) => setSelf((s) => ({ ...s, pacing: v }))} />
                <DotRating label="Vocal control" value={self.vocalControl} onChange={(v) => setSelf((s) => ({ ...s, vocalControl: v }))} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={save} disabled={saved}>{saved ? "Save again (update)" : "Save recording"}</Btn>
                <Btn variant="soft" onClick={download} disabled={!blob}>Download audio</Btn>
                <Btn variant="ghost" onClick={discard}>Discard</Btn>
                {saved && <Btn variant="soft" onClick={() => nav("progress")}>See progress →</Btn>}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Side: recent recordings quick list */}
      <div className="grid content-start gap-5">
        <Card title="Recent recordings" sub={`${recordings.length} total`}>
          {recordings.length === 0 ? (
            <p className="text-[12.5px] text-[var(--muted)]">Nothing yet. Your first recording becomes the baseline for all future comparisons.</p>
          ) : (
            <div className="grid gap-2">
              {recordings.slice(0, 6).map((r) => (
                <button key={r.id} className="flex items-center gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2 text-left hover:chip-hover" onClick={() => openHistory(r.id)}>
                  <svg className="shrink-0 text-[var(--brand)]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="5.5" r="3.2" /><path d="M2.5 12c1.3-2 7.7-2 9 0" /></svg>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{r.title}</span>
                    <span className="text-[11px] tabular-nums text-[var(--muted)]">{fmtDur(r.durationSec)} · {r.analysis.wpm ?? "–"} wpm · {r.analysis.fillerTotal} fillers</span>
                  </span>
                </button>
              ))}
              <Btn variant="ghost" onClick={() => nav("progress")}>Full history →</Btn>
            </div>
          )}
        </Card>
        <Card title="How this assessment works">
          <ul className="grid gap-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
            <li><strong className="text-[var(--ink)]">Speech-to-text</strong> runs in your browser (Chrome/Edge). Accuracy varies — it is a word-level map, never a pronunciation grade.</li>
            <li><strong className="text-[var(--ink)]">Volume, pauses & pace</strong> come from your actual audio, sampled locally.</li>
            <li><strong className="text-[var(--ink)]">Self-scores</strong> are the only pronunciation signal, and they are treated as such.</li>
            <li><strong className="text-[var(--ink)]">Nothing is uploaded.</strong> Audio, transcripts, and scores live in this browser's IndexedDB.</li>
          </ul>
        </Card>
      </div>
      <HistoryBridge targetId={targetId} setTargetId={setTargetId} />
    </div>
  );
}

// Bridge component: loads a historical recording into the review panel.
function HistoryBridge({ targetId, setTargetId }: { targetId: string | null; setTargetId: (v: string | null) => void }) {
  const { recordings, getBlob } = useStore();
  const [loaded, setLoaded] = useState<Recording | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [tl, setTl] = useState<VolumeSample[]>([]);
  const [cmp, setCmp] = useState<Comparison | null>(null);
  useEffect(() => {
    if (!targetId) return;
    const r = recordings.find((x) => x.id === targetId);
    if (!r) return;
    setLoaded(r);
    setCmp(r.scriptText ? compareWords(r.scriptText, r.transcript) : null);
    setTl([]);
    if (r.hasAudio) {
      getBlob(r.id).then((b) => {
        if (b) { if (url) URL.revokeObjectURL(url); setUrl(URL.createObjectURL(b)); }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!loaded) return null;
  const scores = scoreSkills({ analysis: loaded.analysis, self: loaded.self });
  const weak3 = topWeaknesses(scores, 3);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4 backdrop-blur-[2px]" onMouseDown={() => setTargetId(null)}>
      <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-[var(--panel)] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <div>
            <h3 className="font-display text-[15px] font-semibold">{loaded.title}</h3>
            <p className="text-[11.5px] text-[var(--muted)]">{loaded.dayLabel} · {fmtDur(loaded.durationSec)} · {new Date(loaded.createdAt).toLocaleString()}</p>
          </div>
          <button className="icon-btn" onClick={() => setTargetId(null)}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4l8 8M12 4l-8 8" /></svg></button>
        </header>
        <div className="grid gap-4 p-5">
          {url && <audio controls src={url} className="w-full" />}
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">{loaded.transcript || "No transcript."}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="stat"><span className="stat-label">Speed</span><span className="stat-value text-[14px]">{loaded.analysis.wpm ?? "–"} wpm</span></div>
            <div className="stat"><span className="stat-label">Fillers</span><span className="stat-value">{loaded.analysis.fillerTotal}</span></div>
            <div className="stat"><span className="stat-label">Long pauses</span><span className="stat-value">{loaded.analysis.longPauses}</span></div>
            <div className="stat"><span className="stat-label">Volume</span><span className="stat-value text-[14px]">{volumeLabel(loaded.analysis.volume?.cv ?? null)}</span></div>
          </div>
          {loaded.self && (
            <div className="grid gap-2">
              <SectionLabel>Self-assessment</SectionLabel>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <DotRating label="Clarity" value={loaded.self.clarity} />
                <DotRating label="Pronunciation" value={loaded.self.pronunciation} />
                <DotRating label="Fluency" value={loaded.self.fluency} />
                <DotRating label="Pacing" value={loaded.self.pacing} />
                <DotRating label="Vocal control" value={loaded.self.vocalControl} />
              </div>
            </div>
          )}
          <div>
            <SectionLabel>Coach summary</SectionLabel>
            <ul className="mt-2 grid gap-1">
              {weak3.map((w) => <li key={w.key} className="text-[12.5px] text-[var(--muted)]"><strong className="text-[var(--ink)]">{w.label}</strong> ({w.score.toFixed(1)}/5) — {w.note}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
