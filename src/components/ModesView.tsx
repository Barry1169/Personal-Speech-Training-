"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { MODES, SCENARIOS, type ModeContent, type Scenario } from "@/lib/program";
import { Btn, Card, Chip, SectionLabel, Textarea } from "./ui";

function speak(text: string, rate: number) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* TTS unavailable */ }
}

function StopTTS() {
  return (
    <Btn variant="ghost" onClick={() => { try { window.speechSynthesis.cancel(); } catch { /* noop */ } }}>
      Stop voice
    </Btn>
  );
}

export default function ModesView({ nav }: { nav: (v: string) => void }) {
  const { settings, setSettings, toast } = useStore();
  const [active, setActive] = useState<ModeContent | Scenario | null>(null);
  const [randomTopic, setRandomTopic] = useState<string | null>(null);
  const [prepLeft, setPrepLeft] = useState<number | null>(null);
  const [prepRun, setPrepRun] = useState(0);
  const [topicText, setTopicText] = useState("");
  const prepIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (prepRun === 0) return;
    prepIv.current = setInterval(() => {
      setPrepLeft((p) => {
        if (p === null) return p;
        if (p <= 1) {
          if (prepIv.current) clearInterval(prepIv.current);
          toastRef.current("Prep time is up — go!", "info");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => { if (prepIv.current) clearInterval(prepIv.current); };
  }, [prepRun]);

  const isMode = (x: ModeContent | Scenario | null): x is ModeContent => !!x && "usesTTS" in x;

  const sendToRecorder = (title: string, script: string, mode: string) => {
    setSettings({ task: { title, mode, script } });
    toast("Task loaded in the Recorder", "info");
    nav("record");
  };

  const pickRandom = (sc: Scenario) => {
    const t = sc.prompts[Math.floor(Math.random() * sc.prompts.length)];
    setRandomTopic(t);
    setPrepLeft(30);
    setPrepRun((r) => r + 1);
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <button key={m.id} className={`mode-card ${active?.id === m.id ? "mode-card-active" : ""}`} onClick={() => setActive(m)}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold tracking-tight">{m.name}</span>
              <Chip tone="brand">{m.minutes} min</Chip>
            </div>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--accent)]">{m.tagline}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{m.description}</p>
          </button>
        ))}
      </div>

      {active && (
        <Card
          title={active.name}
          sub={isMode(active) ? active.tagline : active.tagline}
          right={<div className="flex gap-2">{isMode(active) && active.sentences && <StopTTS />}<Chip tone="accent">{active.minutes} min</Chip></div>}
        >
          {isMode(active) ? <ModeWorkspace mode={active} rate={settings.ttsRate} onSend={sendToRecorder} /> : (
            <ScenarioWorkspace
              sc={active}
              randomTopic={randomTopic}
              onRandom={() => pickRandom(active)}
              prepLeft={prepLeft}
              topicText={topicText}
              setTopicText={setTopicText}
              onSend={sendToRecorder}
            />
          )}
        </Card>
      )}

      <SectionLabel>Real-world speaking practice</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button key={s.id} className={`mode-card ${active?.id === s.id ? "mode-card-active" : ""}`} onClick={() => { setActive(s); setRandomTopic(null); }}>
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold tracking-tight">{s.name}</span>
              <Chip>{s.minutes} min</Chip>
            </div>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--accent)]">{s.tagline}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{s.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeWorkspace({ mode, rate, onSend }: { mode: ModeContent; rate: number; onSend: (t: string, s: string, m: string) => void }) {
  return (
    <div className="grid gap-4">
      {mode.sentences && (
        <div className="grid gap-2">
          {mode.sentences.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-[var(--panel2)] px-3 py-2.5">
              <button className="icon-btn mt-0.5 shrink-0" title="Play" onClick={() => speak(s, rate)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
              </button>
              <p className="flex-1 text-[13.5px] leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
      {mode.words && (
        <div className="flex flex-wrap gap-2">
          {mode.words.map((w, i) => (
            <span key={i} className="flex items-center gap-2 rounded-lg bg-[var(--panel2)] px-3 py-1.5 text-[13px]">
              {w}
              <button className="icon-btn" title="Play" onClick={() => speak(w.replace(/\s*\/\s*/g, ", " as string), rate)}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}
      {mode.topics && (
        <div className="grid gap-2 sm:grid-cols-2">
          {mode.topics.map((t, i) => (
            <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13px] leading-relaxed">{t}</div>
          ))}
        </div>
      )}
      {mode.passage && (
        <div className="grid gap-2">
          <button className="icon-btn w-fit" title="Play passage" onClick={() => speak(mode.passage!, rate)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
          </button>
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">{mode.passage}</p>
          {mode.paceGuidance && <p className="text-[12px] text-[var(--muted)]">{mode.paceGuidance}</p>}
        </div>
      )}
      {mode.script && (
        <div className="grid gap-2">
          <button className="icon-btn w-fit" title="Play script" onClick={() => speak(mode.script!.text, rate * 0.95)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
          </button>
          <p className="whitespace-pre-line rounded-lg bg-[var(--panel2)] p-3 text-[13.5px] leading-relaxed">{mode.script.text}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => onSend(`${mode.name} mode`, mode.script?.text ?? mode.passage ?? (mode.sentences ? mode.sentences.join("\n\n") : ""), mode.id)}>
          Start in Recorder
        </Btn>
        {mode.sentences && <p className="text-[12px] text-[var(--muted)]">Shadowing tip: play a sentence, pause, then record your repetition — the comparison shows your divergence.</p>}
      </div>
    </div>
  );
}

function ScenarioWorkspace({ sc, randomTopic, onRandom, prepLeft, topicText, setTopicText, onSend }: {
  sc: Scenario;
  randomTopic: string | null;
  onRandom: () => void;
  prepLeft: number | null;
  topicText: string;
  setTopicText: (v: string) => void;
  onSend: (t: string, s: string, m: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip tone="accent">Rules</Chip>
        {sc.rules.map((r, i) => <Chip key={i}>{r}</Chip>)}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sc.prompts.map((p, i) => (
          <div key={i} className="rounded-lg bg-[var(--panel2)] px-3 py-2.5 text-[13px] leading-relaxed">{p}</div>
        ))}
      </div>
      {sc.id === "impromptu" && (
        <div className="rounded-xl border border-dashed border-[var(--accent)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>Random challenge</SectionLabel>
            <Btn variant="soft" onClick={onRandom}>
              <svg className="mr-1.5" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 6a3 3 0 1 1-1-2.2M9 1.5V3.5H7" /></svg>
              Deal a topic
            </Btn>
          </div>
          {randomTopic && (
            <div className="mt-3">
              <p className="font-display text-[19px] font-semibold">{randomTopic}</p>
              {prepLeft !== null && prepLeft > 0 ? (
                <p className="mt-1 text-[13px] text-[var(--muted)]">Think: <span className="font-semibold tabular-nums text-[var(--accent)]">{prepLeft}s</span></p>
              ) : (
                <p className="mt-1 text-[13px] text-[var(--muted)]">Go — 90 seconds, zero fillers.</p>
              )}
            </div>
          )}
        </div>
      )}
      <div>
        <SectionLabel>Optional: your own notes / prompt</SectionLabel>
        <Textarea rows={2} className="mt-1.5" value={topicText} onChange={(e) => setTopicText(e.target.value)} placeholder="Paste your interview question or debate motion here (optional)." />
      </div>
      <Btn onClick={() => onSend(sc.name, [randomTopic ?? "", topicText].filter(Boolean).join("\n"), sc.id)}>
        Start in Recorder
      </Btn>
    </div>
  );
}
