"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { BUILTIN_EXERCISES } from "@/lib/program";
import { CATEGORIES, type Difficulty, type Exercise, fmtDur } from "@/lib/types";
import { speakSingle } from "@/lib/tts";
import { Btn, Card, Chip, Field, Input, Modal, Select, Textarea, Timer } from "./ui";

const emptyForm = {
  name: "", category: CATEGORIES[0] as string, difficulty: "beginner" as Difficulty,
  durationSec: 120, reps: 3, restSec: 10, instructions: "", materialText: "",
};

export default function LibraryView({ nav }: { nav?: (v: string) => void }) {
  const { settings, setSettings, exercises, addExercise, updateExercise, deleteExercise, toggleFavorite, toast } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [diff, setDiff] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);
  const [confirmDel, setConfirmDel] = useState<Exercise | null>(null);

  const all = useMemo(() => [...exercises, ...BUILTIN_EXERCISES], [exercises]);
  const list = useMemo(() => all.filter((e) => {
    if (cat !== "all" && e.category !== cat) return false;
    if (diff !== "all" && e.difficulty !== diff) return false;
    if (favOnly && !settings.favorites.includes(e.id)) return false;
    if (q) {
      const needle = q.toLowerCase();
      return (
        e.name.toLowerCase().includes(needle) ||
        e.instructions.toLowerCase().includes(needle) ||
        e.material.some((m) => m.toLowerCase().includes(needle)) ||
        e.category.includes(needle)
      );
    }
    return true;
  }), [all, cat, diff, favOnly, q, settings.favorites]);

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4.2" /><path d="M9.5 9.5L13 13" /></svg>
            <Input className="pl-9" placeholder="Search exercises, instructions, material…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[170px]">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={diff} onChange={(e) => setDiff(e.target.value)} className="w-[140px]">
            <option value="all">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
          <button className={`chip cursor-pointer ${favOnly ? "chip-brand" : "chip-muted"} hover:chip-hover`} onClick={() => setFavOnly((f) => !f)}>
            ★ Favorites only
          </button>
          <Btn onClick={() => setEditing("new")} className="ml-auto">
            <svg className="mr-1.5" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2v8M2 6h8" /></svg>
            New exercise
          </Btn>
        </div>
        <p className="mt-2 text-[12px] text-[var(--muted)]">
          {list.length} of {all.length} exercises · {exercises.length} of your own · built-ins come from the 12-week program.
          Got a drill from ChatGPT or a coach? Paste it into “New exercise” — your existing progress and data are never touched.
        </p>
      </Card>

      <Card>
        {list.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--muted)]">No exercises match. Try clearing the search or filters.</p>
        ) : (
          <div className="grid gap-2">
            {list.map((e) => (
              <div key={e.id} className="xcard">
                <div className="flex w-full items-center gap-3">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetail(e)}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold">{e.name}</span>
                        <Chip tone={e.builtin ? "muted" : "brand"}>{e.builtin ? "program" : "yours"}</Chip>
                        <Chip tone={e.difficulty === "beginner" ? "good" : e.difficulty === "intermediate" ? "warn" : "bad"}>{e.difficulty}</Chip>
                        <Chip>{e.category}</Chip>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">{e.instructions}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 hidden text-[11.5px] tabular-nums text-[var(--muted)] sm:block">{fmtDur(e.durationSec)} ×{e.reps}</span>
                    <button
                      className={`icon-btn ${settings.favorites.includes(e.id) ? "text-[var(--accent)]" : ""}`}
                      onClick={() => toggleFavorite(e.id)}
                      title="Toggle favorite"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill={settings.favorites.includes(e.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
                        <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
                      </svg>
                    </button>
                    {!e.builtin && (
                      <>
                        <button className="icon-btn" onClick={() => setEditing(e)} title="Edit"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9.5 2.5l2 2L4.5 11.5l-2.6.6.6-2.6z" /></svg></button>
                        <button className="icon-btn hover:text-[var(--bad)]" onClick={() => setConfirmDel(e)} title="Delete"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M3.5 3.5l.7 8h5.6l.7-8M5.8 6v3.5M8.2 6v3.5" /></svg></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""}>
        {detail && (
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Chip tone={detail.difficulty === "beginner" ? "good" : detail.difficulty === "intermediate" ? "warn" : "bad"}>{detail.difficulty}</Chip>
              <Chip>{detail.category}</Chip>
              <Chip>⏱ {fmtDur(detail.durationSec)} × {detail.reps} reps</Chip>
              {detail.restSec > 0 && <Chip>rest {detail.restSec}s</Chip>}
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{detail.instructions}</p>
            {detail.material.length > 0 && (
              <div>
                <p className="section-label">Material</p>
                <div className="mt-1.5 grid gap-1.5">
                  {detail.material.map((m, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-[var(--panel2)] px-3 py-2 text-[13.5px] leading-relaxed">
                      <span>{m}</span>
                      <button
                        type="button"
                        className="icon-btn shrink-0"
                        title="Hear model audio"
                        onClick={() => speakSingle(m, settings.ttsRate, settings.preferredVoice)}
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2.5v9l7-4.5z" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Timer resetKey={detail.id} seconds={detail.durationSec} />
              {nav && (
                <Btn
                  variant="primary"
                  onClick={() => {
                    setSettings({
                      task: {
                        title: detail.name,
                        mode: detail.category,
                        script: detail.material.join("\n"),
                      },
                    });
                    toast(`Loaded "${detail.name}" in Recorder`, "info");
                    setDetail(null);
                    nav("record");
                  }}
                >
                  Practice in Recorder
                </Btn>
              )}
              <Btn variant="soft" onClick={() => toggleFavorite(detail.id)} className="ml-auto">
                {settings.favorites.includes(detail.id) ? "★ Favorited" : "☆ Favorite"}
              </Btn>
              {!detail.builtin && <Btn variant="ghost" onClick={() => { setEditing(detail); setDetail(null); }}>Edit</Btn>}
            </div>
          </div>
        )}
      </Modal>

      {/* Add / edit modal */}
      <EditModal
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        initial={editing === "new" || !editing ? null : editing}
        onClose={() => setEditing(null)}
        onSave={(f) => {
          const payload = {
            name: f.name.trim(), category: f.category, difficulty: f.difficulty,
            durationSec: f.durationSec, reps: f.reps, restSec: f.restSec,
            instructions: f.instructions.trim(),
            material: f.materialText.split("\n").map((s) => s.trim()).filter(Boolean),
          };
          if (!payload.name) return;
          if (editing === "new") addExercise(payload);
          else if (editing) updateExercise({ ...editing, ...payload });
          setEditing(null);
        }}
      />

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete exercise?">
        {confirmDel && (
          <div className="grid gap-4">
            <p className="text-[13.5px] text-[var(--muted)]">
              Delete <strong className="text-[var(--ink)]">“{confirmDel.name}”</strong>? This only removes the exercise — your logs, recordings, and scores are untouched.
            </p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { deleteExercise(confirmDel.id); setConfirmDel(null); }}>Delete</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EditModal({ open, initial, onClose, onSave }: {
  open: boolean;
  initial: Exercise | null;
  onClose: () => void;
  onSave: (f: typeof emptyForm) => void;
}) {
  const [f, setF] = useState(() => initial ? {
    name: initial.name, category: initial.category, difficulty: initial.difficulty,
    durationSec: initial.durationSec, reps: initial.reps, restSec: initial.restSec,
    instructions: initial.instructions, materialText: initial.material.join("\n"),
  } : emptyForm);

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit exercise" : "New exercise"} wide>
      <div className="grid gap-4">
        <Field label="Name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. TH Precision Round" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Category">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Level">
            <Select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as Difficulty })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <Field label="Duration (s)"><Input type="number" min={10} step={10} value={f.durationSec} onChange={(e) => setF({ ...f, durationSec: Math.max(10, Number(e.target.value) || 10) })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reps"><Input type="number" min={0} value={f.reps} onChange={(e) => setF({ ...f, reps: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Rest (s)"><Input type="number" min={0} step={5} value={f.restSec} onChange={(e) => setF({ ...f, restSec: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          </div>
        </div>
        <Field label="Instructions" hint="Exactly what to do — say it to yourself out loud once to check it makes sense.">
          <Textarea rows={3} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Say each word 3 times slowly, then at speed. Exaggerate mouth placement on the first pass." />
        </Field>
        <Field label="Practice material" hint="One line per item — tongue twisters, word lists, sentences, or any text the exercise uses.">
          <Textarea rows={5} value={f.materialText} onChange={(e) => setF({ ...f, materialText: e.target.value })} placeholder={"thick thief thought the thicket was thick\nthirty-three thieves thrilled the throne\nThink, this, thought, three"} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(f)} disabled={!f.name.trim()}>{initial ? "Save changes" : "Add to library"}</Btn>
        </div>
      </div>
    </Modal>
  );
}
