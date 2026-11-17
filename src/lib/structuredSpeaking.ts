import type { ActiveTask, CoachedExercise } from "./types";

export interface StructuredStage {
  index: number;
  letter: string;
  label: string;
  durationSec: number;
  instruction: string;
  starterPhrase?: string;
}

export interface StructuredFrameworkInfo {
  isPrep: boolean;
  frameworkName: string;
  acronym: string;
  topicPrompt: string | null;
  ruleNote: string | null;
  totalDurationSec: number;
  stages: StructuredStage[];
  transitionPhrases: string[];
}

const TIMED_STAGE_RE = /\((\d+)\s*s\)/i;

/**
 * Returns true ONLY for structured timed speaking framework exercises (such as
 * PREP — Point · Reason · Example · Point, Executive Opinion, Clear Explanation,
 * 4-Beat Turning-Point Story, and Unscripted Talking-Head structures).
 * Regular sentences, paragraphs, passages, conversations, tongue twisters, and
 * fixed-script stories return false.
 */
export function isStructuredSpeakingExercise(
  ex: Pick<CoachedExercise, "structureSteps" | "materialType">
): boolean {
  const steps = ex.structureSteps;
  if (!steps || steps.length < 3) return false;
  const timedCount = steps.filter((s) => TIMED_STAGE_RE.test(s)).length;
  return timedCount >= 3;
}

export function isStructuredTask(
  task: Pick<ActiveTask, "structureSteps" | "mode"> | null | undefined
): boolean {
  if (!task?.structureSteps || task.structureSteps.length < 3) return false;
  return task.structureSteps.filter((s) => TIMED_STAGE_RE.test(s)).length >= 3;
}

const PREP_STARTERS = [
  "My main point is",
  "The key reason is",
  "For example, recently",
  "That is why",
];

function deriveLetter(label: string, fallbackIndex: number): string {
  const beatMatch = label.match(/^Beat\s*(\d+)/i);
  if (beatMatch) return beatMatch[1];
  const cleaned = label.replace(/^\d+[\.\)\-:\s]+/, "").trim();
  const ch = cleaned.match(/[A-Za-z\u0900-\u097F]/)?.[0];
  return ch ? ch.toUpperCase() : String(fallbackIndex + 1);
}

export function parseStructuredFramework(input: {
  id?: string;
  title: string;
  language?: "en" | "hi";
  whatToDo?: string;
  structureSteps: string[];
}): StructuredFrameworkInfo {
  const stages: StructuredStage[] = [];
  let topicPrompt: string | null = null;
  let ruleNote: string | null = null;

  for (const raw of input.structureSteps) {
    const trimmed = raw.trim();
    const timeMatch = trimmed.match(/^(.*?)\((\d+)\s*s\)\s*:\s*(.+)$/i);
    if (timeMatch) {
      const rawLabel = timeMatch[1].replace(/^\d+[\.\)\s]+/, "").trim();
      const durationSec = Math.max(5, Number(timeMatch[2]) || 10);
      const instruction = timeMatch[3].trim();
      const letter = deriveLetter(rawLabel, stages.length);
      // Extract quoted starter phrase if embedded (e.g. 'Think of it like...' or 'असली बात यह है कि...')
      const quoteMatch = instruction.match(/['"“]([^'"”]{4,60})['"”]/);
      const starterPhrase = quoteMatch
        ? quoteMatch[1].replace(/\.{2,}$/, "").trim()
        : undefined;
      stages.push({
        index: stages.length,
        letter,
        label: rawLabel,
        durationSec,
        instruction,
        starterPhrase,
      });
      continue;
    }

    if (/^rule\s*:/i.test(trimmed)) {
      ruleNote = trimmed.replace(/^rule\s*:\s*/i, "").trim();
    } else if (!topicPrompt) {
      topicPrompt = trimmed.replace(/^(topic|motion)\s*:\s*/i, "").trim();
    } else if (!ruleNote) {
      ruleNote = trimmed;
    }
  }

  // Fallback topic extraction from whatToDo if no standalone topic line
  if (!topicPrompt && input.whatToDo) {
    const m = input.whatToDo.match(/(?:Topic|Motion)\s*:\s*['"“]([^'"”]+)['"”]/i);
    if (m) topicPrompt = m[1].trim();
  }

  const letters = stages.map((s) => s.letter).join("");
  const isPrep =
    letters === "PREP" || /\bPREP\b/.test(input.title) || input.id === "cm-imp-beg-1";

  // Populate clean spoken starter phrases for PREP stages
  if (isPrep) {
    stages.forEach((st, i) => {
      if (!st.starterPhrase && PREP_STARTERS[i]) {
        st.starterPhrase = PREP_STARTERS[i];
      }
    });
  }

  const totalDurationSec = stages.reduce((acc, s) => acc + s.durationSec, 0);

  let frameworkName = "Structured Speaking Framework";
  if (isPrep) {
    frameworkName = "PREP — Point · Reason · Example · Point";
  } else if (/teach|explanation/i.test(input.title)) {
    frameworkName = "Hook · Analogy · Steps · Close";
  } else if (/executive|opinion|defend/i.test(input.title)) {
    frameworkName = "Position · Reasons · Concession · Close";
  } else if (/story/i.test(input.title)) {
    frameworkName = "4-Beat Turning-Point Story Arc";
  } else if (/youtube|talking-head/i.test(input.title)) {
    frameworkName =
      input.language === "hi"
        ? "Hindi On-Camera Flow — Hook · Idea · Example · Takeaway"
        : "On-Camera Flow — Hook · Key Point · Takeaway";
  }

  const transitionPhrases: string[] = isPrep
    ? [...PREP_STARTERS]
    : stages
        .map((s) => s.starterPhrase)
        .filter((p): p is string => Boolean(p));

  if (transitionPhrases.length === 0) {
    if (input.language === "hi") {
      transitionPhrases.push("मुख्य बात यह है कि", "उदाहरण के लिए", "तो निष्कर्ष यह है कि");
    } else if (/opinion|executive/i.test(input.title)) {
      transitionPhrases.push("My position is clear", "First", "Second", "To be fair", "My recommendation is");
    } else if (/teach|explanation/i.test(input.title)) {
      transitionPhrases.push("In one simple sentence", "Think of it like", "First", "Finally");
    } else if (/youtube/i.test(input.title)) {
      transitionPhrases.push("Have you ever noticed", "Here is the one tip", "Try this today");
    } else {
      transitionPhrases.push("Here is what shifted", "And that taught me");
    }
  }

  return {
    isPrep,
    frameworkName,
    acronym: isPrep ? "PREP" : letters,
    topicPrompt,
    ruleNote,
    totalDurationSec,
    stages,
    transitionPhrases,
  };
}
