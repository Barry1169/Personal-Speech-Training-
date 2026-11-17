"use client";

import { useMemo, useState } from "react";
import { analyzeWordEntry, normalizeWord } from "@/lib/pronunciation";
import { speakSingle } from "@/lib/tts";
import { useStore } from "@/lib/store";
import { SOUND_CATEGORY_LABELS, langOf, type PersonalWord, type WordStatus } from "@/lib/types";
import { Btn, Chip, Field, Input, Modal, SectionLabel, Textarea } from "./ui";

function AddWordForm({
  initialWord,
  source,
  editingWord,
  onClose,
}: {
  initialWord: string;
  source: PersonalWord["source"];
  editingWord: PersonalWord | null;
  onClose: () => void;
}) {
  const { settings, practiceLanguage, words, addWord, updateWord, setPracticeWordId } = useStore();
  const wordLang = editingWord ? langOf(editingWord) : practiceLanguage;
  const preferredVoice = wordLang === "hi" ? settings.preferredVoiceHi : settings.preferredVoice;

  const initialPreview = useMemo(
    () => (initialWord ? analyzeWordEntry(initialWord, wordLang) : null),
    [initialWord, wordLang]
  );

  const [wordText, setWordText] = useState(editingWord?.word ?? initialWord);
  const [status, setStatus] = useState<WordStatus>(editingWord?.status ?? "difficult");
  const [phonetic, setPhonetic] = useState(editingWord?.phonetic ?? initialPreview?.phonetic ?? "");
  const [ipa, setIpa] = useState(editingWord?.ipa ?? initialPreview?.ipa ?? "");
  const [meaning, setMeaning] = useState(editingWord?.meaning ?? initialPreview?.meaning ?? "");
  const [example, setExample] = useState(editingWord?.exampleSentence ?? initialPreview?.exampleSentence ?? "");
  const [tongue, setTongue] = useState(editingWord?.mouthGuide.tongue ?? initialPreview?.mouthGuide.tongue ?? "");
  const [lips, setLips] = useState(editingWord?.mouthGuide.lips ?? initialPreview?.mouthGuide.lips ?? "");
  const [airflow, setAirflow] = useState(
    editingWord?.mouthGuide.mouthAirflow ?? initialPreview?.mouthGuide.mouthAirflow ?? ""
  );
  const [notes, setNotes] = useState(editingWord?.notes ?? "");
  const [showAdvanced, setShowAdvanced] = useState(Boolean(editingWord));
  const [touchedCustom, setTouchedCustom] = useState(Boolean(editingWord));

  const liveAnalysis = useMemo(() => {
    const trimmed = wordText.trim();
    return trimmed.length >= 2 ? analyzeWordEntry(trimmed, wordLang) : null;
  }, [wordText, wordLang]);

  const duplicate = useMemo(() => {
    if (editingWord) return null;
    const norm = normalizeWord(wordText);
    if (!norm) return null;
    return words.find((w) => w.normalized === norm) ?? null;
  }, [editingWord, wordText, words]);

  const handleWordChange = (val: string) => {
    setWordText(val);
    if (!touchedCustom && val.trim().length >= 2) {
      const a = analyzeWordEntry(val, wordLang);
      setPhonetic(a.phonetic);
      setIpa(a.ipa);
      setMeaning(a.meaning);
      setExample(a.exampleSentence);
      setTongue(a.mouthGuide.tongue);
      setLips(a.mouthGuide.lips);
      setAirflow(a.mouthGuide.mouthAirflow);
    }
  };

  const handleAutoFill = () => {
    if (!liveAnalysis) return;
    setPhonetic(liveAnalysis.phonetic);
    setIpa(liveAnalysis.ipa);
    setMeaning(liveAnalysis.meaning);
    setExample(liveAnalysis.exampleSentence);
    setTongue(liveAnalysis.mouthGuide.tongue);
    setLips(liveAnalysis.mouthGuide.lips);
    setAirflow(liveAnalysis.mouthGuide.mouthAirflow);
    setTouchedCustom(false);
  };

  const handleSubmit = (practiceAfter: boolean) => {
    const clean = wordText.trim();
    if (!clean) return;

    if (editingWord) {
      const sounds = liveAnalysis?.soundTags ?? editingWord.soundTags;
      const updated: PersonalWord = {
        ...editingWord,
        word: clean,
        normalized: normalizeWord(clean),
        status,
        phonetic: phonetic.trim() || liveAnalysis?.phonetic || editingWord.phonetic,
        ipa: ipa.trim() || liveAnalysis?.ipa || editingWord.ipa,
        ipaSource: ipa.trim() !== liveAnalysis?.ipa ? "custom" : liveAnalysis?.ipaSource ?? editingWord.ipaSource,
        meaning: meaning.trim() || liveAnalysis?.meaning || editingWord.meaning,
        exampleSentence: example.trim() || liveAnalysis?.exampleSentence || editingWord.exampleSentence,
        mouthGuide: {
          tongue: tongue.trim() || liveAnalysis?.mouthGuide.tongue || editingWord.mouthGuide.tongue,
          lips: lips.trim() || liveAnalysis?.mouthGuide.lips || editingWord.mouthGuide.lips,
          mouthAirflow:
            airflow.trim() || liveAnalysis?.mouthGuide.mouthAirflow || editingWord.mouthGuide.mouthAirflow,
        },
        soundTags: sounds,
        notes: notes.trim() || undefined,
      };
      updateWord(updated);
      onClose();
      if (practiceAfter) setPracticeWordId(updated.id);
      return;
    }

    const res = addWord(clean, {
      language: wordLang,
      status,
      source,
      phonetic: phonetic.trim() || undefined,
      ipa: ipa.trim() || undefined,
      meaning: meaning.trim() || undefined,
      exampleSentence: example.trim() || undefined,
      notes: notes.trim() || undefined,
      mouthGuide: {
        tongue: tongue.trim() || undefined,
        lips: lips.trim() || undefined,
        mouthAirflow: airflow.trim() || undefined,
      },
    });
    onClose();
    if (practiceAfter) setPracticeWordId(res.word.id);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field
          label="Difficult word or short phrase"
          hint="Type any word you stumble over — phonetics, IPA, mouth cues & example auto-populate."
        >
          <Input
            autoFocus
            value={wordText}
            onChange={(e) => handleWordChange(e.target.value)}
            placeholder={
              wordLang === "hi"
                ? "e.g. स्पष्ट, प्रयत्न, विश्वास, धैर्य, प्रभावशाली (Devanagari or Hinglish)…"
                : "e.g. thorough, rural, literally, strategy, subscribe…"
            }
          />
        </Field>
        <Field label="Category">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as WordStatus)}
            className="inp"
          >
            <option value="difficult">Difficult</option>
            <option value="learning">Learning</option>
            <option value="mastered">Mastered</option>
          </select>
        </Field>
      </div>

      {duplicate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--panel))] px-3.5 py-2.5 text-[12.5px]">
          <span>
            <strong>&ldquo;{duplicate.word}&rdquo;</strong> is already in your Word Bank ({duplicate.status}, {duplicate.masteryScore}/100 mastery).
          </span>
          <Btn
            variant="soft"
            onClick={() => {
              onClose();
              setPracticeWordId(duplicate.id);
            }}
          >
            Practice Now →
          </Btn>
        </div>
      )}

      {/* Live Pronunciation Coach Preview */}
      {liveAnalysis && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[18px] font-bold">{liveAnalysis.word}</span>
                <span className="rounded-md bg-[var(--panel)] px-2 py-0.5 text-[12.5px] font-semibold text-[var(--brand)]">
                  {phonetic || liveAnalysis.phonetic}
                </span>
                <span className="font-mono text-[12px] text-[var(--muted)]">{ipa || liveAnalysis.ipa}</span>
                <Chip tone={liveAnalysis.ipaSource === "dictionary" ? "good" : "muted"}>
                  {liveAnalysis.ipaSource === "dictionary" ? "Verified IPA" : "Estimated IPA (editable)"}
                </Chip>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {liveAnalysis.soundTags.map((s) => (
                  <Chip key={s} tone="brand">
                    {SOUND_CATEGORY_LABELS[s].short} · {SOUND_CATEGORY_LABELS[s].phonemes}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Btn
                variant="soft"
                onClick={() => speakSingle(wordText.trim(), 0.72, preferredVoice, wordLang)}
              >
                Hear slow
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => speakSingle(wordText.trim(), 1.0, preferredVoice, wordLang)}
              >
                Natural
              </Btn>
            </div>
          </div>

          <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3 text-[12px] leading-relaxed">
            <p>
              <strong className="text-[var(--muted)]">Meaning: </strong>
              {meaning || liveAnalysis.meaning}
            </p>
            <p>
              <strong className="text-[var(--muted)]">Example: </strong>
              &ldquo;{example || liveAnalysis.exampleSentence}&rdquo;
            </p>
            <div className="grid gap-1.5 rounded-lg bg-[var(--panel)] p-2.5 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">Tongue</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{tongue || liveAnalysis.mouthGuide.tongue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">Lips</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{lips || liveAnalysis.mouthGuide.lips}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">Mouth & Airflow</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                  {airflow || liveAnalysis.mouthGuide.mouthAirflow}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable custom editor */}
      <div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-[12px] font-semibold text-[var(--brand)] hover:underline"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Hide custom fields ▲" : "Customize phonetics, meaning, sentence & notes ▼"}
          </button>
          {showAdvanced && liveAnalysis && (
            <button
              type="button"
              className="text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={handleAutoFill}
            >
              Reset to auto-detected guide
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <SectionLabel>Custom Pronunciation Details</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phonetic respelling">
                <Input
                  value={phonetic}
                  onChange={(e) => {
                    setTouchedCustom(true);
                    setPhonetic(e.target.value);
                  }}
                  placeholder="e.g. THUR-oh"
                />
              </Field>
              <Field label="IPA notation">
                <Input
                  value={ipa}
                  onChange={(e) => {
                    setTouchedCustom(true);
                    setIpa(e.target.value);
                  }}
                  placeholder="e.g. /ˈθɜːr.oʊ/"
                />
              </Field>
            </div>
            <Field label="Meaning">
              <Input
                value={meaning}
                onChange={(e) => {
                  setTouchedCustom(true);
                  setMeaning(e.target.value);
                }}
                placeholder="Short definition or reminder"
              />
            </Field>
            <Field label="Example sentence">
              <Textarea
                rows={2}
                value={example}
                onChange={(e) => {
                  setTouchedCustom(true);
                  setExample(e.target.value);
                }}
                placeholder="Natural sentence using this word"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tongue cue">
                <Textarea
                  rows={2}
                  value={tongue}
                  onChange={(e) => {
                    setTouchedCustom(true);
                    setTongue(e.target.value);
                  }}
                />
              </Field>
              <Field label="Lips cue">
                <Textarea
                  rows={2}
                  value={lips}
                  onChange={(e) => {
                    setTouchedCustom(true);
                    setLips(e.target.value);
                  }}
                />
              </Field>
              <Field label="Mouth & airflow cue">
                <Textarea
                  rows={2}
                  value={airflow}
                  onChange={(e) => {
                    setTouchedCustom(true);
                    setAirflow(e.target.value);
                  }}
                />
              </Field>
            </div>
            <Field label="Personal note (optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Often stumble on this during YouTube intros"
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="soft" disabled={!wordText.trim() || Boolean(duplicate)} onClick={() => handleSubmit(false)}>
          {editingWord ? "Save Changes" : "Save to Word Bank"}
        </Btn>
        <Btn disabled={!wordText.trim() || Boolean(duplicate)} onClick={() => handleSubmit(true)}>
          {editingWord ? "Save & Practice →" : "Save & Practice Now →"}
        </Btn>
      </div>
    </div>
  );
}

export default function AddWordModal() {
  const { addWordModal, closeAddWord } = useStore();
  return (
    <Modal
      open={addWordModal.open}
      onClose={closeAddWord}
      title={addWordModal.editingWord ? `Edit "${addWordModal.editingWord.word}"` : "Add Word to Personal Pronunciation Bank"}
      wide
    >
      <AddWordForm
        key={`${addWordModal.editingWord?.id ?? "new"}-${addWordModal.initialWord}`}
        initialWord={addWordModal.initialWord}
        source={addWordModal.source}
        editingWord={addWordModal.editingWord}
        onClose={closeAddWord}
      />
    </Modal>
  );
}
