"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import {
  buildAnalysis,
  compareWords,
  computeDetailedAssessment,
  paceLabel,
  volumeLabel,
  type Comparison,
} from "@/lib/analytics";
import { detectPitchHz } from "@/lib/pitch";
import { getRecordingAssessment } from "@/lib/adaptiveCoach";
import {
  scoreSkills,
  topWeaknesses,
  recommendExercises,
  personalizedRoutine,
  compareRecordings,
  type SkillScore,
} from "@/lib/coach";
import { BUILTIN_EXERCISES, dayProgressLabel } from "@/lib/program";
import { getMaterialsForLanguage } from "@/lib/materials";
import { isStructuredTask } from "@/lib/structuredSpeaking";
import {
  EMPTY_SCORES,
  PRACTICE_LANGUAGE_META,
  fmtDur,
  uid,
  type CoachedExercise,
  type Exercise,
  type PitchSample,
  type PracticeLanguage,
  type Recording,
  type RecordingAnalysis,
  type SelfScores,
  type VolumeSample,
} from "@/lib/types";
import { speakSingle, stopSpeaking } from "@/lib/tts";
import { Btn, Card, Chip, DotRating, Input, MicHelperBanner, PitchContour, SectionLabel, Select, Textarea, VoiceWaveBars, VolumeTimeline } from "./ui";
import { AnnotatedScript } from "./CoachedText";
import { StructuredSpeakingGuide } from "./StructuredSpeakingGuide";
import AssessmentReport from "./AssessmentReport";

type Phase = "idle" | "recording" | "review";

export default function RecordView({ nav }: { nav: (v: string) => void }) {
  const { settings, practiceLanguage, setSettings, saveRecording, addLog, toast, recordings, exercises, openAddWord } = useStore();

  const task = settings.task;
  const draft = settings.recorderDraft;
  const recLang: PracticeLanguage = task?.language ?? practiceLanguage;

  // Prefer newly loaded task if newer than manual draft; otherwise preserve user's persisted script & title
  const initialScript = useMemo(() => {
    if (task && (!draft || (task.loadedAt ?? 0) > draft.updatedAt)) {
      return task.script ?? "";
    }
    if (draft && (draft.script || draft.title)) {
      return draft.script;
    }
    return task?.script ?? "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialTitle = useMemo(() => {
    if (task && (!draft || (task.loadedAt ?? 0) > draft.updatedAt)) {
      return task.title ?? "";
    }
    if (draft && (draft.script || draft.title)) {
      return draft.title;
    }
    return task?.title ?? "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [script, setScriptState] = useState(initialScript);
  const [title, setTitleState] = useState(initialTitle);
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState("");
  const [manual, setManual] = useState("");
  const [usingManual, setUsingManual] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Refs prevent stale closures inside MediaRecorder.onstop and preserve user edits across renders
  const scriptRef = useRef(script);
  const titleRef = useRef(title);
  const taskRef = useRef(task);
  const recLangRef = useRef(recLang);
  const lastLoadedAtRef = useRef<number>(task?.loadedAt ?? 0);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftRef = useRef<NonNullable<typeof settings.recorderDraft> | null>(null);

  useEffect(() => {
    scriptRef.current = script;
  }, [script]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    taskRef.current = task;
    recLangRef.current = recLang;
  }, [task, recLang]);

  const persistDraft = useCallback(
    (nextTitle: string, nextScript: string, taskLoadedAt?: number | null) => {
      const payload = {
        title: nextTitle,
        script: nextScript,
        language: recLangRef.current,
        taskLoadedAt:
          taskLoadedAt !== undefined ? taskLoadedAt : taskRef.current?.loadedAt ?? null,
        updatedAt: Date.now(),
      };
      pendingDraftRef.current = payload;
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        pendingDraftRef.current = null;
        setSettings({ recorderDraft: payload });
      }, 200);
    },
    [setSettings]
  );

  const updateScript = useCallback(
    (nextScript: string) => {
      scriptRef.current = nextScript;
      setScriptState(nextScript);
      persistDraft(titleRef.current, nextScript);
    },
    [persistDraft]
  );

  const updateTitle = useCallback(
    (nextTitle: string) => {
      titleRef.current = nextTitle;
      setTitleState(nextTitle);
      persistDraft(nextTitle, scriptRef.current);
    },
    [persistDraft]
  );

  // Sync ONLY when the user explicitly loads a different/fresh exercise (new loadedAt timestamp)
  useEffect(() => {
    if (!task) return;
    const stamp = task.loadedAt ?? 0;
    if (stamp > 0 && stamp !== lastLoadedAtRef.current) {
      lastLoadedAtRef.current = stamp;
      const nextScript = task.script ?? "";
      const nextTitle = task.title ?? "";
      scriptRef.current = nextScript;
      titleRef.current = nextTitle;
      setScriptState(nextScript);
      setTitleState(nextTitle);
      setSettings({
        recorderDraft: {
          title: nextTitle,
          script: nextScript,
          language: task.language ?? recLangRef.current,
          taskLoadedAt: stamp,
          updatedAt: stamp,
        },
      });
    }
  }, [task, setSettings]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
      if (pendingDraftRef.current) {
        const flush = pendingDraftRef.current;
        pendingDraftRef.current = null;
        setSettings({ recorderDraft: flush });
      }
    };
  }, [setSettings]);

  // All coached + library exercises available to load directly into the Script box
  const coachedMaterials = useMemo(
    () => getMaterialsForLanguage(practiceLanguage),
    [practiceLanguage]
  );
  const libraryExercises = useMemo(
    () => [...exercises, ...BUILTIN_EXERCISES].filter((e) => e.material.length > 0),
    [exercises]
  );

  const handlePickExercise = (value: string) => {
    if (!value) return;
    stopSpeaking();
    const now = Date.now();
    if (value.startsWith("cm:")) {
      const id = value.slice(3);
      const ex: CoachedExercise | undefined = coachedMaterials.find((m) => m.id === id);
      if (!ex) return;
      lastLoadedAtRef.current = now;
      scriptRef.current = ex.plainText;
      titleRef.current = ex.title;
      setScriptState(ex.plainText);
      setTitleState(ex.title);
      setSettings({
        task: {
          title: ex.title,
          mode: ex.materialType === "impromptu" ? "impromptu" : ex.materialType,
          language: ex.language ?? practiceLanguage,
          script: ex.plainText,
          romanizedText: ex.romanizedText,
          exerciseId: ex.id,
          targetWpm: ex.targetWpm,
          annotatedText: ex.annotatedText,
          structureSteps: ex.structureSteps,
          loadedAt: now,
          coaching: {
            whatToDo: ex.whatToDo,
            howToSpeak: ex.howToSpeak,
            emphasisWords: ex.emphasisWords,
            pauseNotes: ex.pauseNotes,
            mistakesToAvoid: ex.mistakesToAvoid,
          },
        },
        recorderDraft: {
          title: ex.title,
          script: ex.plainText,
          language: ex.language ?? practiceLanguage,
          taskLoadedAt: now,
          updatedAt: now,
        },
      });
      toast(`Loaded "${ex.title}"`, "info");
      return;
    }
    if (value.startsWith("lib:")) {
      const id = value.slice(4);
      const ex: Exercise | undefined = libraryExercises.find((e) => e.id === id);
      if (!ex) return;
      const combined = ex.material.map((m) => m.replace(/\*\*(.+?)\*\*/g, "$1")).join("\n");
      const exLang: PracticeLanguage = ex.language === "hi" ? "hi" : "en";
      lastLoadedAtRef.current = now;
      scriptRef.current = combined;
      titleRef.current = ex.name;
      setScriptState(combined);
      setTitleState(ex.name);
      setSettings({
        task: {
          title: ex.name,
          mode: ex.category,
          language: exLang,
          exerciseId: ex.id,
          script: combined,
          loadedAt: now,
        },
        recorderDraft: {
          title: ex.name,
          script: combined,
          language: exLang,
          taskLoadedAt: now,
          updatedAt: now,
        },
      });
      toast(`Loaded "${ex.name}"`, "info");
    }
  };

  const handleClearScript = () => {
    stopSpeaking();
    pendingDraftRef.current = null;
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    lastLoadedAtRef.current = 0;
    scriptRef.current = "";
    titleRef.current = "";
    setScriptState("");
    setTitleState("");
    setSettings({ task: null, recorderDraft: null });
    toast("Script cleared", "info", 1800);
  };

  const handleResetToExercise = () => {
    if (!task) return;
    const orig = task.script ?? "";
    const origTitle = task.title ?? "";
    scriptRef.current = orig;
    titleRef.current = origTitle;
    setScriptState(orig);
    setTitleState(origTitle);
    persistDraft(origTitle, orig, task.loadedAt ?? null);
    toast("Restored original exercise script", "info", 1800);
  };

  const [rec, setRec] = useState<Recording | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [tl, setTl] = useState<VolumeSample[]>([]);
  const [pitches, setPitches] = useState<PitchSample[]>([]);
  const [self, setSelf] = useState<SelfScores>(EMPTY_SCORES);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previousAttemptScore, setPreviousAttemptScore] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

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
  const tlRef = useRef<VolumeSample[]>([]);
  const pitchRef = useRef<PitchSample[]>([]);

  const srSupported = useMemo(() => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      recOn.current = false;
      try {
        srRef.current?.stop();
      } catch {
        /* noop */
      }
      try {
        const mr = mrRef.current;
        if (mr) {
          mr.onstop = null;
          if (mr.state !== "inactive") mr.stop();
        }
      } catch {
        /* noop */
      }
      if (volIv.current) clearInterval(volIv.current);
      if (elapsedIv.current) clearInterval(elapsedIv.current);
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const stopAll = () => {
    recOn.current = false;
    try {
      srRef.current?.stop();
    } catch {
      /* noop */
    }
    if (volIv.current) {
      clearInterval(volIv.current);
      volIv.current = null;
    }
    if (elapsedIv.current) {
      clearInterval(elapsedIv.current);
      elapsedIv.current = null;
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* noop */
    }
    audioCtxRef.current = null;
  };

  const finish = (audio: Blob | null) => {
    if (disposed.current) return;
    const durationSec = Math.max(1, Math.round((Date.now() - startTs.current) / 1000));
    stopAll();
    const activeScript = scriptRef.current.trim();
    const activeTitle = titleRef.current.trim();
    const activeTask = taskRef.current;
    const activeLang = recLangRef.current;

    const transcript = finals.current.join(" ").replace(/\s+/g, " ").trim();
    const cmp = activeScript ? compareWords(activeScript, transcript) : null;
    const samples = [...tlRef.current];
    const pSamples = [...pitchRef.current];
    setTl(samples);
    setPitches(pSamples);
    const analysis = buildAnalysis(transcript, durationSec, samples, cmp, pSamples, activeLang);
    const targetWpm = activeTask?.targetWpm ?? (activeLang === "hi" ? 115 : 130);
    const assessment = computeDetailedAssessment({
      analysis,
      self: null,
      script: activeScript || null,
      transcript,
      comparison: cmp,
      durationSec,
      targetWpm,
    });
    const r: Recording = {
      id: uid(),
      createdAt: Date.now(),
      title: activeTitle || `Session — ${dayProgressLabel(settings.currentDay)}`,
      mode: activeTask?.mode ?? "manual",
      language: activeLang,
      scriptText: activeScript || null,
      transcript,
      durationSec,
      analysis,
      self: null,
      assessment,
      exerciseId: activeTask?.exerciseId ?? null,
      targetWpm,
      hasAudio: !!audio && audio.size > 0,
      mimeType: audio?.type ?? "audio/webm",
      dayLabel: dayProgressLabel(settings.currentDay),
    };
    setRec(r);
    setBlob(audio);
    setSaved(false);
    if (audio && audio.size > 0) {
      const u = URL.createObjectURL(audio);
      setBlobUrl(u);
    } else {
      setBlobUrl(null);
      setAudioError("No audio was captured (recording was very short or the browser blocked it).");
    }
    if (!transcript) {
      setUsingManual(true);
      toast("No transcript captured — type what you said, or replay and listen.", "info");
    }
    setPhase("review");
  };

  const start = async () => {
    stopSpeaking();
    setMicError(null);
    setAudioError(null);
    finals.current = [];
    chunks.current = [];
    tlRef.current = [];
    pitchRef.current = [];
    setTl([]);
    setPitches([]);
    setLive("");
    setManual("");
    setElapsed(0);
    setSaved(false);
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
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        finish(b);
      };
      mr.start(250);

      // Volume + Real F0 Pitch sampler
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        if (ctx.state === "suspended") void ctx.resume();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        volIv.current = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          const tNow = Date.now() - startTs.current;
          tlRef.current.push({ t: tNow, r: rms });
          const f0 = detectPitchHz(buf, ctx.sampleRate);
          if (f0) pitchRef.current.push({ t: tNow, hz: f0.hz, clarity: f0.clarity });
          if (tlRef.current.length % 5 === 0) {
            setTl([...tlRef.current]);
            setPitches([...pitchRef.current]);
          }
        }, 100);
      } catch {
        /* volume/pitch sampling unavailable */
      }

      // Speech-to-text
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SR) {
        setUsingManual(false);
        const r = new SR();
        srRef.current = r;
        r.continuous = true;
        r.interimResults = true;
        r.lang = PRACTICE_LANGUAGE_META[recLang].bcp47;
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
          if (recOn.current) {
            try {
              r.start();
            } catch {
              /* noop */
            }
          }
        };
        r.onerror = () => {
          /* keep going */
        };
        try {
          r.start();
        } catch {
          /* noop */
        }
      }
      startTs.current = Date.now();
      recOn.current = true;
      elapsedIv.current = setInterval(() => setElapsed(Math.round((Date.now() - startTs.current) / 1000)), 500);
    } catch (e) {
      setPhase("idle");
      stopAll();
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone permission was denied. Allow microphone access in your browser address bar, or run SpeechCoach locally / on your deployed site.");
        toast("Microphone blocked in this frame — use Manual Check here, or run locally for live mic.", "err");
      } else if (name === "NotFoundError" || name === "DevicesNotFound") {
        setMicError("No microphone was found on this device. You can still use Manual Transcript Practice below.");
        toast("No microphone found — Manual Transcript Practice is available below.", "err");
      } else {
        setMicError(`Recording could not start (${name || "unsupported in this browser"}). Run on localhost:3000 or your deployed URL in Chrome/Edge.`);
        toast("Recording unavailable here — use Manual Transcript Check below.", "err");
      }
    }
  };

  const stop = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    else finish(null);
  };

  const openManualSession = () => {
    const curScript = scriptRef.current.trim();
    const curTitle = titleRef.current.trim();
    const durationSec = Math.max(20, Math.round((Math.max(30, curScript.split(/\s+/).length) / 125) * 60));
    const blank: Recording = {
      id: uid(),
      createdAt: Date.now(),
      title: curTitle || `Manual Check — ${dayProgressLabel(settings.currentDay)}`,
      mode: task?.mode ?? "manual",
      language: recLang,
      scriptText: curScript || null,
      transcript: "",
      durationSec,
      analysis: buildAnalysis("", durationSec, [], null, undefined, recLang),
      self: null,
      exerciseId: task?.exerciseId ?? null,
      targetWpm: task?.targetWpm ?? (recLang === "hi" ? 115 : 130),
      hasAudio: false,
      mimeType: "audio/webm",
      dayLabel: dayProgressLabel(settings.currentDay),
    };
    setRec(blank);
    setBlob(null);
    setBlobUrl(null);
    setTl([]);
    setPitches([]);
    setManual(curScript);
    setUsingManual(true);
    setSaved(false);
    setPhase("review");
  };

  const discard = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setBlob(null);
    setRec(null);
    setSaved(false);
    setPhase("idle");
  };

  const effectiveTranscript = useMemo(
    () => (rec ? (usingManual ? manual.trim() : rec.transcript) : ""),
    [rec, usingManual, manual]
  );

  const liveCmp = useMemo<Comparison | null>(() => {
    if (!rec?.scriptText) return null;
    return compareWords(rec.scriptText, effectiveTranscript);
  }, [rec, effectiveTranscript]);

  const liveAnalysis = useMemo<RecordingAnalysis | null>(() => {
    if (!rec) return null;
    return buildAnalysis(effectiveTranscript, rec.durationSec, tl, liveCmp, pitches, recLang);
  }, [rec, effectiveTranscript, tl, liveCmp, pitches, recLang]);

  const hasAnySelf = useMemo(
    () => Object.values(self).some((v) => (v ?? 0) > 0),
    [self]
  );

  const liveAssessment = useMemo(() => {
    if (!rec || !liveAnalysis) return null;
    return computeDetailedAssessment({
      analysis: liveAnalysis,
      self: hasAnySelf ? self : null,
      script: rec.scriptText,
      transcript: effectiveTranscript,
      comparison: liveCmp,
      durationSec: rec.durationSec,
      targetWpm: rec.targetWpm ?? 130,
    });
  }, [rec, liveAnalysis, hasAnySelf, self, effectiveTranscript, liveCmp]);

  const save = async () => {
    if (!rec || !liveAnalysis || !liveAssessment) return;
    const full: Recording = {
      ...rec,
      transcript: effectiveTranscript,
      analysis: liveAnalysis,
      self: hasAnySelf ? self : null,
      assessment: liveAssessment,
    };
    await saveRecording(full, blob);
    addLog({
      language: recLang,
      seconds: rec.durationSec,
      mode: full.mode,
      completed: 1,
      scores: full.self,
      overallScore: liveAssessment.overallScore,
      note: full.title,
    });
    // Keep the loaded/edited script and task intact so the user never loses their script after saving!
    toast(`Recording saved — ${liveAssessment.overallScore}/100 (${fmtDur(rec.durationSec)})`);
    setRec(full);
    setSaved(true);
  };

  const retryFullExercise = () => {
    if (liveAssessment) setPreviousAttemptScore(liveAssessment.overallScore);
    void start();
  };

  const practiceSentence = (sentTitle: string, sentText: string) => {
    if (liveAssessment) setPreviousAttemptScore(liveAssessment.overallScore);
    updateTitle(sentTitle);
    updateScript(sentText);
    setPhase("idle");
    toast(`Loaded "${sentTitle}" — press Record My Voice to practice it cleanly.`, "info");
  };

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
    return scoreSkills({ analysis: liveAnalysis, self: hasAnySelf ? self : null });
  }, [rec, liveAnalysis, hasAnySelf, self]);

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
      label: "vs your earliest recording (Day 1 baseline)",
      lines: compareRecordings(prev, {
        ...rec,
        transcript: effectiveTranscript,
        analysis: liveAnalysis,
        self: hasAnySelf ? self : null,
      }),
    };
  }, [rec, liveAnalysis, effectiveTranscript, recordings, hasAnySelf, self]);

  const pace = liveAnalysis ? paceLabel(liveAnalysis.wpm) : null;
  const liveWords = live ? live.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
      <div className="grid content-start gap-5">
        {/* Task setup / capture */}
        <Card
          title={phase === "recording" ? "Recording…" : "Record & assess"}
          sub="Speak against a script for word & sentence comparison, or free-talk for pure acoustic & fluency scoring."
          right={
            <Btn variant="soft" onClick={() => openAddWord("", "exercise")}>
              + Add My Word
            </Btn>
          }
        >
          {phase !== "recording" && (
            <div className="grid gap-3.5">
              {/* Interactive PREP / Structured Speaking Guide — ONLY when active exercise uses a timed speaking framework */}
              {isStructuredTask(task) && task?.structureSteps && (
                <StructuredSpeakingGuide
                  title={task.title}
                  structureSteps={task.structureSteps}
                  durationSec={
                    coachedMaterials.find((m) => m.id === task.exerciseId)?.durationSec ?? 90
                  }
                  language={recLang}
                />
              )}

              {/* Show coaching cues banner if task came from Coached Materials */}
              {task?.annotatedText && script.trim() === (task.script ?? "").trim() && (
                <div className="rounded-xl border border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_5%,var(--panel2))] p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Chip tone="brand">
                      {recLang === "hi" ? "Hindi Cues · हिन्दी" : "Active Coach Cues"} · target ~
                      {task.targetWpm ?? (recLang === "hi" ? 115 : 130)} WPM
                    </Chip>
                    {script.trim() && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          className="word-ctrl-btn"
                          onClick={() =>
                            speakSingle(
                              script.trim(),
                              0.7,
                              recLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice,
                              recLang
                            )
                          }
                        >
                          ▶ 0.7x
                        </button>
                        <button
                          type="button"
                          className="word-ctrl-btn"
                          onClick={() =>
                            speakSingle(
                              script.trim(),
                              1.0,
                              recLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice,
                              recLang
                            )
                          }
                        >
                          ▶ 1.0x
                        </button>
                      </div>
                    )}
                  </div>
                  <AnnotatedScript text={task.annotatedText} showCues language={recLang} />
                  {task.romanizedText && (settings.showHindiRomanized ?? true) && (
                    <p className="mt-2 rounded-lg bg-[var(--panel)] p-2.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                      <strong className="text-[var(--ink)]">Romanized guide: </strong>
                      {task.romanizedText}
                    </p>
                  )}
                </div>
              )}

              {/* Exercise Loader + Title Row */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">Load practice exercise (optional)</span>
                  <Select
                    aria-label="Load practice exercise"
                    value={
                      task?.exerciseId
                        ? coachedMaterials.some((m) => m.id === task.exerciseId)
                          ? `cm:${task.exerciseId}`
                          : libraryExercises.some((e) => e.id === task.exerciseId)
                          ? `lib:${task.exerciseId}`
                          : ""
                        : ""
                    }
                    onChange={(e) => handlePickExercise(e.target.value)}
                  >
                    <option value="">— Select an exercise or write your own script —</option>
                    <optgroup
                      label={
                        practiceLanguage === "hi"
                          ? "Hindi Coached Materials"
                          : "Coached Speaking Materials"
                      }
                    >
                      {coachedMaterials.map((m) => (
                        <option key={m.id} value={`cm:${m.id}`}>
                          {m.title} ({m.difficulty})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Exercise Library (Drills & Passages)">
                      {libraryExercises.map((e) => (
                        <option key={e.id} value={`lib:${e.id}`}>
                          {e.name} ({e.category})
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                </label>

                <label className="block">
                  <span className="lbl">Title</span>
                  <Input
                    value={title}
                    onChange={(e) => updateTitle(e.target.value)}
                    placeholder={`Check-in — ${dayProgressLabel(settings.currentDay)}`}
                  />
                </label>
              </div>

              {/* Persistent Script Box — stays visible & editable, never cleared unless user clicks Clear */}
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="record-script-input" className="lbl !mb-0">
                    Script to compare against{" "}
                    <span className="normal-case font-normal text-[var(--muted)]">
                      (stays saved while you record &amp; review)
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-[11.5px]">
                    {script.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          speakSingle(
                            script.trim(),
                            settings.ttsRate || 0.9,
                            recLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice,
                            recLang
                          )
                        }
                        className="font-semibold text-[var(--brand)] hover:underline"
                      >
                        ▶ Hear script
                      </button>
                    )}
                    {task?.script && script !== task.script && (
                      <button
                        type="button"
                        onClick={handleResetToExercise}
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        Restore original
                      </button>
                    )}
                    {(script || title || task) && (
                      <button
                        type="button"
                        onClick={handleClearScript}
                        className="font-semibold text-[var(--muted)] hover:text-[var(--bad)]"
                      >
                        Clear script
                      </button>
                    )}
                  </div>
                </div>
                <Textarea
                  id="record-script-input"
                  rows={4}
                  value={script}
                  onChange={(e) => updateScript(e.target.value)}
                  placeholder="Select an exercise above, paste a passage, or type any lines to read aloud. Leave empty for free speaking."
                />
              </div>

              {/* Primary Record My Voice Action Row — placed ABOVE any coaching tip */}
              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={start}>
                  <svg className="mr-1" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="6" cy="4.5" r="3" />
                    <path d="M2.5 10.2c1-1.7 6-1.7 7 0" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  </svg>
                  Record My Voice
                </Btn>
                <Btn variant="ghost" onClick={openManualSession}>
                  Manual transcript check
                </Btn>
                {(script || title || task) && (
                  <Btn variant="ghost" onClick={handleClearScript}>
                    Reset
                  </Btn>
                )}
                <span className="ml-auto text-[11.5px] text-[var(--muted)]">
                  {srSupported === null
                    ? "…"
                    : srSupported
                    ? "Live audio + F0 pitch + speech-to-text ready"
                    : "Audio + F0 pitch ready (manual transcript supported)"}
                </span>
              </div>

              {task?.coaching && (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3.5 py-2.5 text-[12px] text-[var(--muted)]">
                  <strong className="text-[var(--ink)]">Coach Briefing: </strong>
                  {task.coaching.howToSpeak}
                </div>
              )}

              <MicHelperBanner error={micError} onManual={openManualSession} />
            </div>
          )}

          {phase === "recording" && (
            <div className="animate-pop grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rec-dot" />
                <div>
                  <p className="font-display text-[17px] font-semibold tabular-nums">{fmtDur(elapsed)}</p>
                  <p className="text-[11.5px] text-[var(--muted)]">
                    {liveWords} words transcribed · {pitches.length} voiced pitch frames captured
                  </p>
                </div>
                <VoiceWaveBars level={tl[tl.length - 1]?.r ?? 0.03} />
                <Btn variant="danger" onClick={stop} className="ml-auto">
                  Stop &amp; Score
                </Btn>
              </div>

              {/* Structured Speaking Stage Guide during recording (ONLY for structured framework exercises) */}
              {isStructuredTask(task) && task?.structureSteps && (
                <StructuredSpeakingGuide
                  title={task.title}
                  structureSteps={task.structureSteps}
                  durationSec={
                    coachedMaterials.find((m) => m.id === task.exerciseId)?.durationSec ?? 90
                  }
                  language={recLang}
                />
              )}

              {/* ALWAYS keep the user's loaded/edited script visible while recording! */}
              {task?.annotatedText && script.trim() === (task.script ?? "").trim() ? (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-3.5">
                  <SectionLabel>Reading Script</SectionLabel>
                  <div className="mt-1.5">
                    <AnnotatedScript text={task.annotatedText} showCues language={recLang} />
                  </div>
                </div>
              ) : script.trim() ? (
                <div className="rounded-xl border border-[var(--brand)] bg-[var(--panel2)] p-4">
                  <SectionLabel>{title.trim() || "Reading Script"}</SectionLabel>
                  <p className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.9] text-[var(--ink)]">
                    {script}
                  </p>
                </div>
              ) : null}

              <VolumeTimeline tl={tl} />
              <div className="rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">
                {usingManual ? (
                  "Listening… (no live transcript in this browser)"
                ) : live ? (
                  <span className="live-transcript">
                    {live} <span className="caret">▍</span>
                  </span>
                ) : (
                  <span className="text-[var(--muted)]">Listening… start speaking clearly.</span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Review */}
        {phase === "review" && rec && liveAnalysis && liveAssessment && (
          <>
            {/* Explainable 100-Point Assessment Report */}
            <AssessmentReport
              assessment={liveAssessment}
              analysis={liveAnalysis}
              previousScore={previousAttemptScore}
              onRetryExercise={retryFullExercise}
              onPracticeText={practiceSentence}
            />

            {/* Replay + Transcript + Script Diff */}
            <Card
              title={rec.title}
              sub={`${rec.dayLabel} · ${fmtDur(rec.durationSec)}`}
              right={saved ? <Chip tone="good">Saved to history</Chip> : <Chip tone="warn">Not saved yet</Chip>}
            >
              <div className="grid gap-4">
                {blobUrl ? (
                  <div>
                    <SectionLabel>Replay your take</SectionLabel>
                    <audio controls src={blobUrl} className="mt-1 w-full" />
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[var(--muted)]">{audioError ?? "Manual text check (no audio blob)."}</p>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <SectionLabel>
                      Transcript {srSupported && !usingManual && <span className="normal-case text-[var(--muted)]">(speech-to-text — editable)</span>}
                    </SectionLabel>
                    <button
                      className="chip chip-muted cursor-pointer hover:chip-hover"
                      onClick={() => {
                        if (!usingManual) setManual(live || rec.transcript);
                        setUsingManual((v) => !v);
                      }}
                    >
                      {usingManual ? "Use auto transcript" : "Edit / switch to manual"}
                    </button>
                  </div>
                  {usingManual ? (
                    <Textarea
                      rows={4}
                      className="mt-1.5"
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      placeholder="Type or correct what you said. Every score and word diff updates immediately."
                    />
                  ) : (
                    <div className="mt-1.5 whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">
                      {rec.transcript || "No transcript captured."}
                    </div>
                  )}
                </div>

                {rec.scriptText && (
                  <div>
                    <SectionLabel>Word-by-word comparison with the script</SectionLabel>
                    {liveCmp && liveAnalysis.coverage != null && (
                      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                        <Chip tone={liveAnalysis.coverage >= 90 ? "good" : liveAnalysis.coverage >= 70 ? "warn" : "bad"}>
                          {liveAnalysis.coverage}% matched
                        </Chip>{" "}
                        <span className="text-[var(--bad)]">{liveCmp.missingCount} missing</span> ·{" "}
                        <span className="text-[var(--accent)]">{liveCmp.extraCount} extra</span>
                      </p>
                    )}
                    <div className="mt-1.5 rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-[1.9]">
                      {liveCmp?.tokens.map((t, i) => (
                        <span
                          key={i}
                          className={
                            t.status === "missing" ? "diff-missing" : t.status === "extra" ? "diff-extra" : ""
                          }
                        >
                          {t.word}{" "}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--muted)]">
                      <strong className="text-[var(--ink)]">Honesty note:</strong> word-matching compares{" "}
                      <em>what the speech-to-text engine heard</em>, not clinical pronunciation accuracy. Use it as a map of gaps, and verify pronunciation by listening to your replay.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Acoustic Signal Visualizers */}
            <Card title="Measured acoustic telemetry" sub="Computed locally from your PCM audio buffer — never estimated or random.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="stat">
                  <span className="stat-label">Speaking speed</span>
                  <span className="stat-value text-[15px]">{pace?.label ?? "n/a"}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Filler words</span>
                  <span className="stat-value">{liveAnalysis.fillerTotal}</span>
                  <span className="stat-sub">
                    {Object.entries(liveAnalysis.fillers)
                      .map(([k, v]) => `${k}×${v}`)
                      .join(", ") || "none detected"}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Pause cadence</span>
                  <span className="stat-value">
                    {liveAnalysis.pauses
                      ? `${liveAnalysis.pauses.naturalCount + liveAnalysis.pauses.deliberateCount} / ${liveAnalysis.pauses.longCount}`
                      : liveAnalysis.longPauses}
                  </span>
                  <span className="stat-sub">clean phrasing / &gt;1.5s long</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Volume &amp; Pitch</span>
                  <span className="stat-value text-[15px]">{volumeLabel(liveAnalysis.volume?.cv ?? null)}</span>
                  <span className="stat-sub">
                    {liveAnalysis.pitch
                      ? `${liveAnalysis.pitch.medianHz} Hz · ${liveAnalysis.pitch.semitoneRange.toFixed(1)} st span`
                      : liveAnalysis.volume
                      ? `CV ${liveAnalysis.volume.cv.toFixed(2)}`
                      : "no audio"}
                  </span>
                </div>
              </div>
              {liveAnalysis.repeats.length > 0 && (
                <p className="mt-3 text-[12.5px] text-[var(--muted)]">
                  Repeated words:{" "}
                  <span className="text-[var(--ink)]">{liveAnalysis.repeats.slice(0, 8).join(", ")}</span>
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <SectionLabel>Volume timeline</SectionLabel>
                  <div className="mt-1">
                    <VolumeTimeline tl={tl} height={68} />
                  </div>
                </div>
                <div>
                  <SectionLabel>Vocal pitch contour (F0)</SectionLabel>
                  <div className="mt-1">
                    <PitchContour samples={pitches} height={68} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Self-Assessment & Save */}
            <Card
              title="Listening self-assessment & save"
              sub="Replay your audio and rate honestly 1–5. Pronunciation requires your ear so we never fake phoneme scores."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DotRating label="Pronunciation" value={self.pronunciation} onChange={(v) => setSelf((s) => ({ ...s, pronunciation: v }))} />
                <DotRating label="Clarity" value={self.clarity} onChange={(v) => setSelf((s) => ({ ...s, clarity: v }))} />
                <DotRating label="Fluency" value={self.fluency} onChange={(v) => setSelf((s) => ({ ...s, fluency: v }))} />
                <DotRating label="Pacing" value={self.pacing} onChange={(v) => setSelf((s) => ({ ...s, pacing: v }))} />
                <DotRating label="Vocal control" value={self.vocalControl} onChange={(v) => setSelf((s) => ({ ...s, vocalControl: v }))} />
                <DotRating label="Expression" value={self.expression ?? 0} onChange={(v) => setSelf((s) => ({ ...s, expression: v }))} />
                <DotRating label="Breathing" value={self.breathing ?? 0} onChange={(v) => setSelf((s) => ({ ...s, breathing: v }))} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => void save()}>{saved ? "Update saved recording" : "Save recording"}</Btn>
                <Btn variant="soft" onClick={retryFullExercise}>
                  Record another take
                </Btn>
                <Btn variant="soft" onClick={download} disabled={!blob}>
                  Download audio
                </Btn>
                <Btn variant="ghost" onClick={discard}>
                  Discard
                </Btn>
                {saved && (
                  <Btn variant="soft" onClick={() => nav("progress")}>
                    See progress →
                  </Btn>
                )}
              </div>
            </Card>

            {/* Rule-based Coaching Recommendations & Routine (preserved) */}
            <Card title="Recommended follow-up drills" sub="Deterministic coaching plan based on this recording.">
              <div className="grid gap-4">
                <div>
                  <SectionLabel>Targeted library exercises</SectionLabel>
                  <div className="mt-2 grid gap-1.5">
                    {recs.map((r, i) => (
                      <button
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2 text-left hover:chip-hover"
                        onClick={() => nav("library")}
                      >
                        <svg className="mt-0.5 shrink-0 text-[var(--brand)]" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M2 3.5l2 2 4-4M2 9.5l2 2 4-4" />
                        </svg>
                        <span>
                          <span className="text-[13px] font-medium">{r.title}</span>
                          <span className="block text-[11.5px] text-[var(--muted)]">{r.reason}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionLabel>Suggested mini-routine</SectionLabel>
                  <ol className="mt-2 grid gap-1.5">
                    {routine.map((s, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-[13px] leading-relaxed">
                        <span className="tabular-nums text-[var(--muted)]">{i + 1}.</span>
                        <span>
                          {s.step} <span className="text-[11.5px] text-[var(--muted)]">~{s.minutes} min</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                {vsPrevious && (
                  <div>
                    <SectionLabel>{vsPrevious.label}</SectionLabel>
                    <ul className="mt-2 grid gap-1">
                      {vsPrevious.lines.map((l, i) => (
                        <li key={i} className="text-[12.5px] text-[var(--muted)]">
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Side: recent recordings + methodology */}
      <div className="grid content-start gap-5">
        <Card title="Recent recordings" sub={`${recordings.length} total`}>
          {recordings.length === 0 ? (
            <p className="text-[12.5px] text-[var(--muted)]">
              Nothing yet. Your first recording becomes the baseline for all future comparisons.
            </p>
          ) : (
            <div className="grid gap-2">
              {recordings.slice(0, 6).map((r) => {
                const a = getRecordingAssessment(r);
                return (
                  <button
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2 text-left hover:chip-hover"
                    onClick={() => setTargetId(r.id)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] font-display text-[12px] font-bold text-[var(--brand)]">
                      {a.overallScore}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">{r.title}</span>
                      <span className="text-[11px] tabular-nums text-[var(--muted)]">
                        {fmtDur(r.durationSec)} · {r.analysis.wpm ?? "–"} wpm · {r.analysis.fillerTotal} fillers
                      </span>
                    </span>
                  </button>
                );
              })}
              <Btn variant="ghost" onClick={() => nav("progress")}>
                Full history →
              </Btn>
            </div>
          )}
        </Card>
        <Card title="Honest assessment methodology">
          <ul className="grid gap-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
            <li>
              <strong className="text-[var(--ink)]">Directly measured:</strong> WPM speed, filler words, repeated words, pause durations, volume steadiness (CV &amp; dB), and fundamental vocal pitch range (F0 in semitones).
            </li>
            <li>
              <strong className="text-[var(--ink)]">STT word alignment:</strong> runs locally in Chrome/Edge and maps missed words — never misrepresented as clinical pronunciation grading.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Listening self-check:</strong> your own ear completes the Pronunciation score after audio replay.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Private by design:</strong> audio, transcripts, and scores remain in this browser&apos;s IndexedDB.
            </li>
          </ul>
        </Card>
      </div>

      <HistoryBridge targetId={targetId} setTargetId={setTargetId} />
    </div>
  );
}

// Loads a historical recording into a review modal (strict React 19 clean effect)
function HistoryBridge({
  targetId,
  setTargetId,
}: {
  targetId: string | null;
  setTargetId: (v: string | null) => void;
}) {
  const { recordings, getBlob } = useStore();
  const [url, setUrl] = useState<string | null>(null);

  const loaded = useMemo(
    () => (targetId ? recordings.find((x) => x.id === targetId) ?? null : null),
    [targetId, recordings]
  );

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (loaded?.hasAudio) {
      void getBlob(loaded.id).then((b) => {
        if (!active || !b) return;
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [loaded, getBlob]);

  if (!loaded || typeof document === "undefined") return null;
  const assessment = getRecordingAssessment(loaded);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={() => setTargetId(null)}
    >
      <div
        className="modal-pop max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3.5">
          <div>
            <h3 className="font-display text-[15px] font-semibold">{loaded.title}</h3>
            <p className="text-[11.5px] text-[var(--muted)]">
              {loaded.dayLabel} · {fmtDur(loaded.durationSec)} · {new Date(loaded.createdAt).toLocaleString()}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={() => setTargetId(null)} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>
        <div className="grid gap-4 p-5">
          {url && <audio controls src={url} className="w-full" />}
          <AssessmentReport assessment={assessment} analysis={loaded.analysis} compact />
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13px] leading-relaxed">
            {loaded.transcript || "No transcript captured."}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
