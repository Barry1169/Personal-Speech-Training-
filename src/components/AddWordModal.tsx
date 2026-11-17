"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeWordEntry, normalizeWord } from "@/lib/pronunciation";
import { stopSpeaking } from "@/lib/tts";
import { useSingleWordRecorder, type SingleWordCapture } from "@/lib/useSingleWordRecorder";
import { useStore } from "@/lib/store";
import {
  SOUND_CATEGORY_LABELS,
  WORD_PROBLEM_TYPE_LABELS,
  langOf,
  type PersonalWord,
  type WordProblemType,
  type WordStatus,
} from "@/lib/types";
import { Btn, Chip, Field, Input, Modal, Textarea, WordDrillControls, WordPronunciation } from "./ui";

const PROBLEM_TYPE_ORDER: WordProblemType[] = [
  "pronunciation",
  "stammering",
  "consonant_cluster",
  "syllable",
  "unclear_articulation",
  "sound_substitution",
  "other",
];

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
  const {
    practiceLanguage,
    words,
    addWord,
    updateWord,
    getBlob,
    deleteBlob,
    setPracticeWordId,
  } = useStore();
  const wordLang = editingWord ? langOf(editingWord) : practiceLanguage;

  const initialPreview = useMemo(
    () => (initialWord ? analyzeWordEntry(initialWord, wordLang) : null),
    [initialWord, wordLang]
  );

  const [wordText, setWordText] = useState(editingWord?.word ?? initialWord);
  const [status, setStatus] = useState<WordStatus>(editingWord?.status ?? "difficult");
  const [problemType, setProblemType] = useState<WordProblemType | "">(editingWord?.problemType ?? "");
  const [problemTypeOther, setProblemTypeOther] = useState(editingWord?.problemTypeOther ?? "");
  const [difficultPart, setDifficultPart] = useState(editingWord?.difficultPart ?? "");
  const [customPronunciation, setCustomPronunciation] = useState(editingWord?.customPronunciation ?? "");
  const [notes, setNotes] = useState(editingWord?.notes ?? "");

  // Optional in-modal user recording of the word
  const [newRecording, setNewRecording] = useState<SingleWordCapture | null>(null);
  const [existingRecUrl, setExistingRecUrl] = useState<string | null>(null);
  const [removedExistingRec, setRemovedExistingRec] = useState(false);

  // Advanced optional customization (meaning, sentence, IPA, mouth cues)
  const [phonetic, setPhonetic] = useState(editingWord?.phonetic ?? initialPreview?.phonetic ?? "");
  const [ipa, setIpa] = useState(editingWord?.ipa ?? initialPreview?.ipa ?? "");
  const [meaning, setMeaning] = useState(editingWord?.meaning ?? initialPreview?.meaning ?? "");
  const [example, setExample] = useState(editingWord?.exampleSentence ?? initialPreview?.exampleSentence ?? "");
  const [tongue, setTongue] = useState(editingWord?.mouthGuide.tongue ?? initialPreview?.mouthGuide.tongue ?? "");
  const [lips, setLips] = useState(editingWord?.mouthGuide.lips ?? initialPreview?.mouthGuide.lips ?? "");
  const [airflow, setAirflow] = useState(
    editingWord?.mouthGuide.mouthAirflow ?? initialPreview?.mouthGuide.mouthAirflow ?? ""
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touchedCustom, setTouchedCustom] = useState(Boolean(editingWord));

  // Hydrate existing user recording when editing
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (editingWord?.userRecordingBlobKey && !removedExistingRec) {
      void getBlob(editingWord.userRecordingBlobKey).then((blob) => {
        if (!blob || cancelled) return;
        url = URL.createObjectURL(blob);
        setExistingRecUrl(url);
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [editingWord?.userRecordingBlobKey, getBlob, removedExistingRec]);

  const handleCapture = useCallback((cap: SingleWordCapture) => {
    setNewRecording(cap);
    setRemovedExistingRec(true);
  }, []);

  const recorder = useSingleWordRecorder(wordLang, handleCapture);

  const liveAnalysis = useMemo(() => {
    const trimmed = wordText.trim();
    return trimmed.length >= 1 ? analyzeWordEntry(trimmed, wordLang) : null;
  }, [wordText, wordLang]);

  const duplicate = useMemo(() => {
    if (editingWord) return null;
    const norm = normalizeWord(wordText);
    if (!norm) return null;
    return words.find((w) => w.normalized === norm && !w.clearedFromActive) ?? null;
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

  const handleRemoveRecording = () => {
    recorder.resetCapture();
    setNewRecording(null);
    setRemovedExistingRec(true);
    setExistingRecUrl(null);
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
    stopSpeaking();

    const cleanCustomPron = customPronunciation.trim() || undefined;
    const chosenProblem: WordProblemType | undefined = problemType || undefined;
    const chosenOther =
      chosenProblem === "other" ? problemTypeOther.trim() || undefined : undefined;
    const cleanDifficultPart = difficultPart.trim() || undefined;

    if (editingWord) {
      const sounds = liveAnalysis?.soundTags ?? editingWord.soundTags;
      let nextBlobKey = editingWord.userRecordingBlobKey;
      let nextBlobMime = editingWord.userRecordingMimeType;
      let nextBlobTranscript = editingWord.userRecordingTranscript;

      if (newRecording) {
        nextBlobKey = `wordrec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        nextBlobMime = newRecording.mimeType;
        nextBlobTranscript = newRecording.transcript || undefined;
      } else if (removedExistingRec) {
        if (editingWord.userRecordingBlobKey) {
          void deleteBlob(editingWord.userRecordingBlobKey);
        }
        nextBlobKey = undefined;
        nextBlobMime = undefined;
        nextBlobTranscript = undefined;
      }

      const effectivePhonetic =
        cleanCustomPron || phonetic.trim() || liveAnalysis?.phonetic || editingWord.phonetic;

      const updated: PersonalWord = {
        ...editingWord,
        word: clean,
        normalized: normalizeWord(clean),
        status,
        clearedFromActive: status === "mastered" ? editingWord.clearedFromActive : false,
        phonetic: effectivePhonetic,
        ipa: ipa.trim() || liveAnalysis?.ipa || editingWord.ipa,
        ipaSource:
          ipa.trim() && ipa.trim() !== liveAnalysis?.ipa
            ? "custom"
            : liveAnalysis?.ipaSource ?? editingWord.ipaSource,
        meaning: meaning.trim() || liveAnalysis?.meaning || editingWord.meaning,
        exampleSentence: example.trim() || liveAnalysis?.exampleSentence || editingWord.exampleSentence,
        mouthGuide: {
          tongue: tongue.trim() || liveAnalysis?.mouthGuide.tongue || editingWord.mouthGuide.tongue,
          lips: lips.trim() || liveAnalysis?.mouthGuide.lips || editingWord.mouthGuide.lips,
          mouthAirflow:
            airflow.trim() || liveAnalysis?.mouthGuide.mouthAirflow || editingWord.mouthGuide.mouthAirflow,
        },
        soundTags: sounds,
        problemType: chosenProblem,
        problemTypeOther: chosenOther,
        difficultPart: cleanDifficultPart,
        customPronunciation: cleanCustomPron,
        userRecordingBlobKey: nextBlobKey,
        userRecordingMimeType: nextBlobMime,
        userRecordingTranscript: nextBlobTranscript,
        notes: notes.trim() || undefined,
      };
      updateWord(updated, newRecording?.blob ?? null);
      onClose();
      if (practiceAfter) setPracticeWordId(updated.id);
      return;
    }

    const blobKey = newRecording
      ? `wordrec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    const res = addWord(clean, {
      language: wordLang,
      status,
      source,
      phonetic: phonetic.trim() || undefined,
      ipa: ipa.trim() || undefined,
      meaning: meaning.trim() || undefined,
      exampleSentence: example.trim() || undefined,
      problemType: chosenProblem,
      problemTypeOther: chosenOther,
      difficultPart: cleanDifficultPart,
      customPronunciation: cleanCustomPron,
      userRecordingBlob: newRecording?.blob ?? null,
      userRecordingBlobKey: blobKey,
      userRecordingMimeType: newRecording?.mimeType,
      userRecordingTranscript: newRecording?.transcript || undefined,
      notes: notes.trim() || undefined,
      mouthGuide: touchedCustom
        ? {
            tongue: tongue.trim() || undefined,
            lips: lips.trim() || undefined,
            mouthAirflow: airflow.trim() || undefined,
          }
        : undefined,
    });
    onClose();
    if (practiceAfter) setPracticeWordId(res.word.id);
  };

  const activeAudioUrl =
    newRecording?.audioUrl ?? (removedExistingRec ? null : existingRecUrl);
  const previewPhonetic = customPronunciation.trim() || phonetic || liveAnalysis?.phonetic || "";
  const previewIpa = ipa || liveAnalysis?.ipa || "";

  return (
    <div className="grid gap-4">
      {/* Row 1: Word + Status */}
      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
        <Field
          label="Word or short phrase"
          hint="Phonetic guide, IPA, mouth placement & example generate automatically."
        >
          <Input
            autoFocus
            value={wordText}
            onChange={(e) => handleWordChange(e.target.value)}
            placeholder={
              wordLang === "hi"
                ? "e.g. स्पष्ट, प्रयत्न, विश्वास, धैर्य…"
                : "e.g. intermediate, calmly, thorough, Wednesday…"
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

      {/* Duplicate guard */}
      {duplicate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--panel))] px-3.5 py-2.5 text-[12.5px]">
          <span>
            <strong>&ldquo;{duplicate.word}&rdquo;</strong> is already in your Word Bank ({duplicate.status},{" "}
            {duplicate.masteryScore}/100).
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

      {/* Compact live pronunciation preview + [0.7x] [1.0x] */}
      {liveAnalysis && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-[17px] font-bold text-[var(--ink)]">{liveAnalysis.word}</span>
              <WordPronunciation
                word={liveAnalysis.word}
                language={wordLang}
                phonetic={previewPhonetic}
                ipa={previewIpa}
              />
              {customPronunciation.trim() && <Chip tone="brand">Custom guide</Chip>}
            </div>
            <WordDrillControls word={wordText.trim()} language={wordLang} />
          </div>
          {liveAnalysis.soundTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {liveAnalysis.soundTags.map((s) => (
                <Chip key={s} tone="muted">
                  {SOUND_CATEGORY_LABELS[s].short} · {SOUND_CATEGORY_LABELS[s].phonemes}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Problem Type Selector */}
      <div>
        <span className="lbl">What makes this word tricky? (optional)</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PROBLEM_TYPE_ORDER.map((key) => {
            const selected = problemType === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setProblemType(selected ? "" : key)}
                className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  selected
                    ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_14%,var(--panel))] font-semibold text-[var(--brand)]"
                    : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                }`}
              >
                {WORD_PROBLEM_TYPE_LABELS[key]}
              </button>
            );
          })}
        </div>
        {problemType === "other" && (
          <div className="mt-2">
            <Input
              value={problemTypeOther}
              onChange={(e) => setProblemTypeOther(e.target.value)}
              placeholder="Describe the issue briefly (e.g., accent shift, vowel length)…"
            />
          </div>
        )}
      </div>

      {/* Difficult syllable/sound + Custom pronunciation guidance */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Difficult syllable / sound / part (optional)">
          <Input
            value={difficultPart}
            onChange={(e) => setDifficultPart(e.target.value)}
            placeholder="e.g. middle TH, silent D, ter-MEE…"
          />
        </Field>
        <Field label="Custom pronunciation guide (optional)">
          <Input
            value={customPronunciation}
            onChange={(e) => setCustomPronunciation(e.target.value)}
            placeholder="e.g. in·ter·MEE·dee·ut, WENZ·day…"
          />
        </Field>
      </div>

      {/* Optional user recording of the word */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Record Your Pronunciation (optional)
            </span>
            <p className="text-[11.5px] text-[var(--muted)]">
              Save a quick voice clip of how you say it now to track improvement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {recorder.recording ? (
              <Btn variant="danger" onClick={recorder.stop}>
                <span className="rec-dot" /> Stop
              </Btn>
            ) : (
              <Btn variant="soft" onClick={() => void recorder.start()}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <circle cx="6" cy="6" r="4.5" />
                </svg>
                {activeAudioUrl ? "Replace Recording" : "Record My Voice"}
              </Btn>
            )}
            {activeAudioUrl && !recorder.recording && (
              <Btn variant="ghost" onClick={handleRemoveRecording}>
                Remove
              </Btn>
            )}
          </div>
        </div>

        {recorder.recording && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-75"
              style={{ width: `${Math.max(6, Math.round(recorder.level * 100))}%` }}
            />
          </div>
        )}

        {activeAudioUrl && !recorder.recording && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
            <audio controls src={activeAudioUrl} className="h-8 w-60 max-w-full" />
            {(newRecording?.transcript || editingWord?.userRecordingTranscript) && (
              <span className="text-[11.5px] text-[var(--muted)]">
                Heard: &ldquo;{newRecording?.transcript || editingWord?.userRecordingTranscript}&rdquo;
              </span>
            )}
          </div>
        )}

        {recorder.error && <p className="mt-2 text-[11.5px] text-[var(--bad)]">{recorder.error}</p>}
      </div>

      {/* Optional personal notes */}
      <Field label="Notes (optional)">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Pause briefly before this word in meetings or YouTube intros"
        />
      </Field>

      {/* Collapsible advanced fields (meaning, example sentence, IPA, mouth guide) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-[12px] font-semibold text-[var(--brand)] hover:underline"
        >
          {showAdvanced
            ? "▾ Hide meaning, sentence, IPA & mouth cues"
            : "▸ More details (meaning, example sentence, IPA & mouth cues)"}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel2)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Pronunciation & Context Details
              </span>
              {liveAnalysis && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="text-[11.5px] font-semibold text-[var(--brand)] hover:underline"
                >
                  Reset to auto-detected
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Default syllable phonetic">
                <Input
                  value={phonetic}
                  onChange={(e) => {
                    setPhonetic(e.target.value);
                    setTouchedCustom(true);
                  }}
                  placeholder="in·ter·MEE·dee·ut"
                />
              </Field>
              <Field label="IPA notation">
                <Input
                  value={ipa}
                  onChange={(e) => {
                    setIpa(e.target.value);
                    setTouchedCustom(true);
                  }}
                  placeholder="/ˌɪn.tərˈmiː.di.ət/"
                />
              </Field>
            </div>

            <Field label="Meaning / definition">
              <Input
                value={meaning}
                onChange={(e) => {
                  setMeaning(e.target.value);
                  setTouchedCustom(true);
                }}
              />
            </Field>

            <Field label="Example practice sentence">
              <Textarea
                rows={2}
                value={example}
                onChange={(e) => {
                  setExample(e.target.value);
                  setTouchedCustom(true);
                }}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tongue placement">
                <Textarea
                  rows={2}
                  value={tongue}
                  onChange={(e) => {
                    setTongue(e.target.value);
                    setTouchedCustom(true);
                  }}
                />
              </Field>
              <Field label="Lip shape">
                <Textarea
                  rows={2}
                  value={lips}
                  onChange={(e) => {
                    setLips(e.target.value);
                    setTouchedCustom(true);
                  }}
                />
              </Field>
              <Field label="Mouth & airflow">
                <Textarea
                  rows={2}
                  value={airflow}
                  onChange={(e) => {
                    setAirflow(e.target.value);
                    setTouchedCustom(true);
                  }}
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-3">
        <Btn
          variant="ghost"
          onClick={() => {
            stopSpeaking();
            recorder.resetCapture();
            onClose();
          }}
        >
          Cancel
        </Btn>
        <Btn
          variant="soft"
          disabled={!wordText.trim() || Boolean(duplicate)}
          onClick={() => handleSubmit(false)}
        >
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
      onClose={() => {
        stopSpeaking();
        closeAddWord();
      }}
      title={
        addWordModal.editingWord
          ? `Edit "${addWordModal.editingWord.word}"`
          : "Add Word to Word Bank"
      }
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
