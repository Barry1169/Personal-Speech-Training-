import type { CoachedExercise, PracticeMaterialType, Difficulty } from "./types";

/**
 * Calibrated ~72-word diagnostic reading passage for Initial Assessment.
 * Includes key articulation contrasts (TH, S/Z, R/L, final T/D clusters),
 * clear breath boundaries, and natural stress points so baseline metrics are meaningful.
 */
export const DIAGNOSTIC_EXERCISE: CoachedExercise = {
  id: "diag-baseline",
  title: "Initial Speaking Baseline Check",
  materialType: "paragraph",
  difficulty: "beginner",
  skills: ["clarity", "pronunciation", "pacing", "pausesBreathing", "expression"],
  durationSec: 60,
  reps: 1,
  targetWpm: 125,
  category: "reading",
  whatToDo:
    "Read this short paragraph aloud once in your natural speaking voice so your coach can measure your starting pace, pause rhythm, volume steadiness, and pitch variety.",
  howToSpeak:
    "Sit or stand tall, relax your shoulders, and speak at a comfortable conversational volume — as if speaking to one person seated six feet away. Aim for calm clarity rather than speed.",
  emphasisWords: ["clear", "calm", "every", "steady", "listen", "confident"],
  pauseNotes:
    "Take a relaxed nasal breath at every ∧ mark, a brief half-second beat at |, and a full pause at ‖ before starting the next sentence.",
  mistakesToAvoid: [
    "Do not try to sound artificially fast or theatrical — we want your honest baseline.",
    "Do not restart if you stumble on a word; keep moving calmly to the end.",
    "Avoid holding your breath through two sentences in a row.",
  ],
  annotatedText:
    "∧ Good speaking is not about talking **fast** | or using complicated words. ‖ ∧ It starts with a **calm** breath | and the decision to let **every** thought land clearly. ‖ ∧ When I slow down slightly | and finish the ends of my words, | people do not have to work hard to **listen**. ‖ ∧ Today I am setting my starting baseline: | a **steady** voice, | clear phrasing, | and the daily habit of becoming a **confident** speaker. ‖",
  plainText:
    "Good speaking is not about talking fast or using complicated words. It starts with a calm breath and the decision to let every thought land clearly. When I slow down slightly and finish the ends of my words, people do not have to work hard to listen. Today I am setting my starting baseline: a steady voice, clear phrasing, and the daily habit of becoming a confident speaker.",
};

export const COACHED_MATERIALS: CoachedExercise[] = [
  // ======================== 1. SHORT SENTENCES ========================
  {
    id: "cm-sent-beg-1",
    title: "Crisp Endings — Five Everyday Sentences",
    materialType: "short_sentence",
    difficulty: "beginner",
    skills: ["pronunciation", "clarity", "pausesBreathing"],
    durationSec: 120,
    reps: 2,
    targetWpm: 110,
    category: "clarity",
    whatToDo:
      "Read each short sentence aloud twice: once slowly (~95 WPM) focusing on final consonants (T, D, K, S), then once at a relaxed conversational pace (~115 WPM).",
    howToSpeak:
      "Keep your jaw loose and your volume even from the first word to the last. Drop your pitch slightly on the final word of every sentence so each thought sounds finished.",
    emphasisWords: ["nine", "exact", "ready", "clearly", "finish"],
    pauseNotes:
      "Take a clean breath ∧ before each sentence and hold a full one-second silence ‖ after every period before starting the next line.",
    mistakesToAvoid: [
      "Swallowing the final -t, -d, or -s at the end of sentences (e.g., 'nex' instead of 'next').",
      "Trailing off in volume on the last two words.",
      "Chaining all five sentences together without pausing between them.",
    ],
    annotatedText:
      "∧ The meeting starts at **nine** sharp. ‖ ∧ Please send the **exact** draft before lunch. ‖ ∧ We checked the list | and everything is **ready**. ‖ ∧ Take a slow breath | and speak **clearly**. ‖ ∧ Good speakers always **finish** their final word. ‖",
    plainText:
      "The meeting starts at nine sharp. Please send the exact draft before lunch. We checked the list and everything is ready. Take a slow breath and speak clearly. Good speakers always finish their final word.",
  },
  {
    id: "cm-sent-int-1",
    title: "Meaning Through Stress — Contrast Sentences",
    materialType: "short_sentence",
    difficulty: "intermediate",
    skills: ["expression", "clarity", "pacing"],
    durationSec: 150,
    reps: 2,
    targetWpm: 125,
    category: "pitch",
    whatToDo:
      "Deliver each sentence so the listener can hear the contrast immediately without seeing the text. Lift pitch and slow down slightly on each highlighted word.",
    howToSpeak:
      "Keep the non-bold words light and connected; reserve your vocal lift and crisp articulation for the contrast pair in each sentence.",
    emphasisWords: ["plan", "delay", "listen", "react", "simple", "easy", "steady", "loud", "clarity", "speed"],
    pauseNotes:
      "Use the | micro-pause right before the contrasting clause ('not...', 'before...') so the contrast snaps cleanly.",
    mistakesToAvoid: [
      "Stressing every word equally — if everything is loud, nothing stands out.",
      "Raising your pitch like a question at the end of a declarative statement.",
      "Rushing straight over the comma without a beat.",
    ],
    annotatedText:
      "∧ We need a clear **plan**, | not another **delay**. ‖ ∧ Strong leaders **listen** first | and **react** second. ‖ ∧ The habit is **simple**, | even when it is not **easy**. ‖ ∧ Authority sounds **steady**, | never **loud**. ‖ ∧ Always choose **clarity** | over **speed**. ‖",
    plainText:
      "We need a clear plan, not another delay. Strong leaders listen first and react second. The habit is simple, even when it is not easy. Authority sounds steady, never loud. Always choose clarity over speed.",
  },
  {
    id: "cm-sent-adv-1",
    title: "Executive Precision — Complex Articulation Lines",
    materialType: "short_sentence",
    difficulty: "advanced",
    skills: ["pronunciation", "projection", "expression"],
    durationSec: 150,
    reps: 2,
    targetWpm: 135,
    category: "pronunciation",
    whatToDo:
      "Deliver these multi-syllable, consonant-cluster sentences with poised boardroom authority — crisp articulation without sounding stiff or robotic.",
    howToSpeak:
      "Project steadily from the lower ribs. Treat multi-syllable words ('specifically', 'responsibility', 'consistently') as smooth rhythmic waves with one clear stressed syllable.",
    emphasisWords: ["specifically", "measurable", "responsibility", "transparent", "consistently"],
    pauseNotes:
      "Pause cleanly at every | clause break and anchor a calm nasal inhale ∧ before each new statement.",
    mistakesToAvoid: [
      "Compressing middle syllables ('specif-ly' or 'responsbility').",
      "Speeding up to get through difficult consonant clusters.",
      "Sounding tense in the throat on projected lines.",
    ],
    annotatedText:
      "∧ Let us define **specifically** | what makes this outcome **measurable**. ‖ ∧ Taking **responsibility** early | builds trust faster than any apology. ‖ ∧ When our updates stay **transparent**, | tough decisions become easier to align around. ‖ ∧ Reliability means showing up **consistently**, | especially when schedules get tight. ‖",
    plainText:
      "Let us define specifically what makes this outcome measurable. Taking responsibility early builds trust faster than any apology. When our updates stay transparent, tough decisions become easier to align around. Reliability means showing up consistently, especially when schedules get tight.",
  },

  // ======================== 2. PARAGRAPHS ========================
  {
    id: "cm-para-beg-1",
    title: "Calm Authority — The Power of a Measured Pace",
    materialType: "paragraph",
    difficulty: "beginner",
    skills: ["pacing", "pausesBreathing", "clarity"],
    durationSec: 150,
    reps: 2,
    targetWpm: 115,
    category: "reading",
    whatToDo:
      "Read this 90-word paragraph aloud twice. On Pass 1 focus purely on stopping at every breath mark; on Pass 2 add gentle vocal lift on the bold words.",
    howToSpeak:
      "Speak at ~115 WPM with warm, unhurried energy. Imagine explaining a helpful insight to a friend over coffee across a quiet table.",
    emphasisWords: ["hurry", "trust", "breath", "space", "weight", "calm"],
    pauseNotes:
      "Breathe quietly at every ∧. Pause half a second at | and a full beat at ‖. Never carry over to the next sentence on leftover air.",
    mistakesToAvoid: [
      "Starting calmly and gradually accelerating faster by the third sentence.",
      "Audible gasps through the mouth instead of silent nasal inhales.",
      "Flattening the final sentence instead of landing it with quiet weight.",
    ],
    annotatedText:
      "∧ Most people speed up when they feel nervous | because they think listeners are in a **hurry**. ‖ ∧ In reality, | rushing makes an audience feel anxious, | while a steady pace builds immediate **trust**. ‖ ∧ When you pause for one calm **breath** between thoughts, | you give your listeners **space** to picture what you mean. ‖ ∧ A short sentence spoken slowly | carries far more **weight** than a long speech delivered in panic. ‖ ∧ Today I choose a **calm** rhythm | and let every idea arrive on time. ‖",
    plainText:
      "Most people speed up when they feel nervous because they think listeners are in a hurry. In reality, rushing makes an audience feel anxious, while a steady pace builds immediate trust. When you pause for one calm breath between thoughts, you give your listeners space to picture what you mean. A short sentence spoken slowly carries far more weight than a long speech delivered in panic. Today I choose a calm rhythm and let every idea arrive on time.",
  },
  {
    id: "cm-para-int-1",
    title: "Project Update — Clear Structured Briefing",
    materialType: "paragraph",
    difficulty: "intermediate",
    skills: ["projection", "pacing", "clarity", "fluency"],
    durationSec: 180,
    reps: 2,
    targetWpm: 130,
    category: "reading",
    whatToDo:
      "Deliver this workplace status briefing standing up as if addressing a team of eight colleagues. Keep numbers and action verbs crisp.",
    howToSpeak:
      "Use medium-firm projection, brisk-but-controlled 130 WPM pace, and crisp downward pitch on the three numbered points ('First', 'Second', 'Finally').",
    emphasisWords: ["ahead", "First", "forty", "Second", "Thursday", "Finally", "feedback"],
    pauseNotes:
      "Hold a clear beat ‖ right before 'First', 'Second', and 'Finally' so listeners feel the structure effortlessly.",
    mistakesToAvoid: [
      "Mumbling numbers like 'forty percent' or dates like 'Thursday afternoon'.",
      "Adding 'uh' or 'so' before transition words.",
      "Letting volume drop in the middle of the second point.",
    ],
    annotatedText:
      "∧ Quick update on our launch schedule: | we are currently two days **ahead** of plan. ‖ ∧ **First**, | our onboarding redesign cut setup time by **forty** percent in user testing. ‖ ∧ **Second**, | the engineering team will lock the final release build by **Thursday** afternoon. ‖ ∧ **Finally**, | we need two volunteers to review customer **feedback** during launch week. ‖ ∧ If anything blocks your section today, | flag it right after this meeting | so we keep the whole team moving smoothly. ‖",
    plainText:
      "Quick update on our launch schedule: we are currently two days ahead of plan. First, our onboarding redesign cut setup time by forty percent in user testing. Second, the engineering team will lock the final release build by Thursday afternoon. Finally, we need two volunteers to review customer feedback during launch week. If anything blocks your section today, flag it right after this meeting so we keep the whole team moving smoothly.",
  },
  {
    id: "cm-para-adv-1",
    title: "Persuasive Argument — Making an Idea Stick",
    materialType: "paragraph",
    difficulty: "advanced",
    skills: ["expression", "projection", "pausesBreathing", "pacing"],
    durationSec: 180,
    reps: 2,
    targetWpm: 135,
    category: "reading",
    whatToDo:
      "Deliver this persuasive paragraph using intentional tempo contrast: slightly brisker on setup clauses, 25% slower on the concluding claim.",
    howToSpeak:
      "Anchor your posture, engage vocal warmth on the rhetorical question, then shift into grounded, downward-inflected certainty on the final two sentences.",
    emphasisWords: ["remember", "data", "moment", "clarity", "respect", "unforgettable"],
    pauseNotes:
      "Pause a full second ‖ after the opening question so the listener mentally answers before you deliver the punchline.",
    mistakesToAvoid: [
      "Answering your own question so quickly that the tension evaporates.",
      "Reading long clauses on one monotone pitch level.",
      "Rushing the final word 'unforgettable' instead of slowing into it.",
    ],
    annotatedText:
      "∧ Why do we forget ninety percent of presentations | before the afternoon ends? ‖ ∧ Rarely because the **data** was wrong. ‖ ∧ We forget them | because nobody slowed down long enough | to mark the single **moment** that mattered. ‖ ∧ When a speaker pairs sharp **clarity** with unhurried timing, | the audience feels genuine **respect** for their attention. ‖ ∧ You do not need dramatic tricks to command a room. ‖ ∧ Say one true thing cleanly, | pause before it lands, | and your message becomes **unforgettable**. ‖",
    plainText:
      "Why do we forget ninety percent of presentations before the afternoon ends? Rarely because the data was wrong. We forget them because nobody slowed down long enough to mark the single moment that mattered. When a speaker pairs sharp clarity with unhurried timing, the audience feels genuine respect for their attention. You do not need dramatic tricks to command a room. Say one true thing cleanly, pause before it lands, and your message becomes unforgettable.",
  },

  // ======================== 3. LONG READING PASSAGES ========================
  {
    id: "cm-pass-beg-1",
    title: "Sustained Clarity — Building a Daily Craft",
    materialType: "long_passage",
    difficulty: "beginner",
    skills: ["pausesBreathing", "pacing", "clarity", "projection"],
    durationSec: 210,
    reps: 1,
    targetWpm: 118,
    category: "reading",
    whatToDo:
      "Read this full ~165-word passage in one continuous recording without stopping. Your goal is steady breath endurance and consistent volume from the opening line to the final period.",
    howToSpeak:
      "Keep an unhurried ~115–125 WPM rhythm. Think of yourself as an audiobook narrator who wants every listener to feel calm, awake, and engaged.",
    emphasisWords: ["craft", "quiet", "habit", "recording", "honest", "notice", "belongs"],
    pauseNotes:
      "Take a full, unhurried breath ∧ at every paragraph shift and period. Let the comma pauses | stay light (0.4s) so sentences stay cohesive.",
    mistakesToAvoid: [
      "Starting strong in paragraph one and losing vocal energy in paragraph two.",
      "Running out of breath mid-sentence because you skipped an earlier ∧ breath point.",
      "Restarting a sentence if you misread a single word — keep flowing smoothly.",
    ],
    annotatedText:
      "∧ Every voice we admire was built like a **craft**, | not won in a lottery. ‖ ∧ Behind every effortless speaker | are hundreds of **quiet** minutes spent practicing alone, | listening closely, | and fixing one small habit at a time. ‖\n\n∧ At first, | hearing your own **recording** can feel uncomfortable. ‖ ∧ You notice every pause, | every rushed ending, | and every word that drifted slightly off target. ‖ ∧ Yet that discomfort is simply **honest** feedback — | the exact same mirror a musician uses when tuning an instrument. ‖\n\n∧ Stay with the **habit** for two steady weeks | and something subtle shifts. ‖ ∧ You begin to **notice** your breath before you speak, | not after you run out of air. ‖ ∧ Your pace settles into a lane where thinking and speaking move together. ‖ ∧ Slowly, | the voice you hear on playback | starts sounding like the person you always knew you were. ‖ ∧ That voice **belongs** to you, | and today is one more brick in building it. ‖",
    plainText:
      "Every voice we admire was built like a craft, not won in a lottery. Behind every effortless speaker are hundreds of quiet minutes spent practicing alone, listening closely, and fixing one small habit at a time. At first, hearing your own recording can feel uncomfortable. You notice every pause, every rushed ending, and every word that drifted slightly off target. Yet that discomfort is simply honest feedback — the exact same mirror a musician uses when tuning an instrument. Stay with the habit for two steady weeks and something subtle shifts. You begin to notice your breath before you speak, not after you run out of air. Your pace settles into a lane where thinking and speaking move together. Slowly, the voice you hear on playback starts sounding like the person you always knew you were. That voice belongs to you, and today is one more brick in building it.",
  },
  {
    id: "cm-pass-int-1",
    title: "Long-Form Flow — The Architecture of Good Listening",
    materialType: "long_passage",
    difficulty: "intermediate",
    skills: ["expression", "pausesBreathing", "pacing", "clarity"],
    durationSec: 240,
    reps: 1,
    targetWpm: 130,
    category: "reading",
    whatToDo:
      "Read this ~185-word essay passage aloud with vocal contrast across its three paragraphs: curious in paragraph 1, analytical in paragraph 2, warm and decisive in paragraph 3.",
    howToSpeak:
      "Maintain ~125–140 WPM with clear pitch peaks on bold concepts and relaxed downward closes at every period.",
    emphasisWords: ["half", "rehearsing", "curiosity", "mirror", "pacing", "generous", "heard"],
    pauseNotes:
      "Give paragraph transitions a generous 1.2-second breath pause ‖ ∧ so the listener hears the chapter shift cleanly.",
    mistakesToAvoid: [
      "Reading all three paragraphs with the exact same tone and speed.",
      "Dropping consonant endings during longer compound sentences.",
      "Rushing over the transition phrases ('When you pause...', 'In the end...').",
    ],
    annotatedText:
      "∧ People often assume that great communication is mostly about speaking well. ‖ ∧ Yet speaking is only **half** of the room. ‖ ∧ Think about the last time someone truly held your attention: | they were not simply **rehearsing** their next line | while waiting for you to stop talking. ‖\n\n∧ Real vocal presence grows out of active **curiosity**. ‖ ∧ When you actually track the other person's meaning, | your tone naturally shifts from performance to conversation. ‖ ∧ Your sentences shorten. ‖ ∧ Your emphasis lands where it helps the listener, | not where it sounds impressive. ‖ ∧ Even your **pacing** adjusts like a quiet **mirror**, | slowing down when an idea is unfamiliar | and brightening when energy rises. ‖\n\n∧ In the end, | practicing your voice is a **generous** act. ‖ ∧ You polish your consonants, | steady your breath, | and trim away filler words | so the people across from you never have to strain. ‖ ∧ Speak with that intention, | and people will remember not only what you said, | but how clearly they felt **heard**. ‖",
    plainText:
      "People often assume that great communication is mostly about speaking well. Yet speaking is only half of the room. Think about the last time someone truly held your attention: they were not simply rehearsing their next line while waiting for you to stop talking. Real vocal presence grows out of active curiosity. When you actually track the other person's meaning, your tone naturally shifts from performance to conversation. Your sentences shorten. Your emphasis lands where it helps the listener, not where it sounds impressive. Even your pacing adjusts like a quiet mirror, slowing down when an idea is unfamiliar and brightening when energy rises. In the end, practicing your voice is a generous act. You polish your consonants, steady your breath, and trim away filler words so the people across from you never have to strain. Speak with that intention, and people will remember not only what you said, but how clearly they felt heard.",
  },
  {
    id: "cm-pass-adv-1",
    title: "Keynote Delivery — Designing for Attention",
    materialType: "long_passage",
    difficulty: "advanced",
    skills: ["projection", "expression", "pacing", "pausesBreathing", "pronunciation"],
    durationSec: 240,
    reps: 1,
    targetWpm: 138,
    category: "reading",
    whatToDo:
      "Deliver this ~195-word keynote excerpt standing up with full room projection. Practice shaping rhythmic triads and holding deliberate dramatic pauses.",
    howToSpeak:
      "Open with warm conversational ease, build firm energy through the middle triad, then drop volume and speed slightly on the final reflection to pull listeners in.",
    emphasisWords: ["noisy", "scarce", "structure", "rhythm", "restraint", "signal", "silence"],
    pauseNotes:
      "Mark the rhythmic triad ('structure | rhythm | restraint') with crisp micro-pauses and take a deep quiet breath ∧ before the closing paragraph.",
    mistakesToAvoid: [
      "Shouting instead of supporting projection with deeper breath.",
      "Rushing the three-part list so the words blur together.",
      "Keeping intense volume on the quiet closing insight.",
    ],
    annotatedText:
      "∧ We live in the most **noisy** era in human history, | where every screen competes for three seconds of glance. ‖ ∧ Because noise is abundant, | genuine attention has become extraordinarily **scarce**. ‖ ∧ When a room gives you five minutes of their focus, | they are handing you something fragile and valuable. ‖\n\n∧ Earning that focus rests on three vocal disciplines: | **structure**, | **rhythm**, | and **restraint**. ‖ ∧ Structure lets listeners see the map before you walk the road. ‖ ∧ Rhythm keeps the ear awake through contrast — | crisp pace on examples, | deliberate slow-downs on conclusions. ‖ ∧ Restraint means resisting the urge to fill every quiet second with nervous chatter, | trusting that a clear **signal** beats constant volume. ‖\n\n∧ Next time you step into a difficult conversation | or stand before a skeptical room, | resist the impulse to talk faster. ‖ ∧ Plant your feet, | drop your shoulders, | and let one second of calm **silence** introduce your opening sentence. ‖ ∧ The moment you stop fighting for attention, | the room quietly hands it to you. ‖",
    plainText:
      "We live in the most noisy era in human history, where every screen competes for three seconds of glance. Because noise is abundant, genuine attention has become extraordinarily scarce. When a room gives you five minutes of their focus, they are handing you something fragile and valuable. Earning that focus rests on three vocal disciplines: structure, rhythm, and restraint. Structure lets listeners see the map before you walk the road. Rhythm keeps the ear awake through contrast — crisp pace on examples, deliberate slow-downs on conclusions. Restraint means resisting the urge to fill every quiet second with nervous chatter, trusting that a clear signal beats constant volume. Next time you step into a difficult conversation or stand before a skeptical room, resist the impulse to talk faster. Plant your feet, drop your shoulders, and let one second of calm silence introduce your opening sentence. The moment you stop fighting for attention, the room quietly hands it to you.",
  },

  // ======================== 4. STORYTELLING EXERCISES ========================
  {
    id: "cm-story-beg-1",
    title: "Mini Story — The Missed Train",
    materialType: "storytelling",
    difficulty: "beginner",
    skills: ["expression", "pausesBreathing", "pacing"],
    durationSec: 180,
    reps: 2,
    targetWpm: 120,
    category: "storytelling",
    whatToDo:
      "Read this short story aloud with visual emotion: brisk urgency during the dash to the platform, a quiet drop at the closed doors, and warmth at the unexpected turning point.",
    howToSpeak:
      "Let your voice paint the scene. Slightly higher energy on 'ran down the stairs', soften and slow right after 'closed', and smile subtly while reading the final two sentences.",
    emphasisWords: ["thirty", "closed", "bench", "older", "sketching", "slowed"],
    pauseNotes:
      "Hold a full dramatic beat ‖ right after 'shut right in front of me.' so the listener feels the stop.",
    mistakesToAvoid: [
      "Reading the tense dash and the quiet conversation at the exact same speed.",
      "Skipping the pause before the turning point.",
      "Sounding monotonous on dialogue.",
    ],
    annotatedText:
      "∧ Last winter | I arrived at the station with **thirty** seconds to spare. ‖ ∧ I ran down the stairs, | heard the warning chime, | and watched the silver doors slide **closed** | right in front of me. ‖ ∧ My shoulders dropped. ‖ ∧ The next train was forty minutes away, | so I sat on a cold wooden **bench** | feeling annoyed at myself. ‖ ∧ Two minutes later, | an **older** man beside me noticed my sigh | and showed me the notebook he was **sketching** in. ‖ ∧ We talked about travel, | architecture, | and why missed schedules sometimes protect us. ‖ ∧ When the next train finally arrived, | my frustration was gone — | because missing that rush was the only reason my afternoon **slowed** down enough to notice someone else. ‖",
    plainText:
      "Last winter I arrived at the station with thirty seconds to spare. I ran down the stairs, heard the warning chime, and watched the silver doors slide closed right in front of me. My shoulders dropped. The next train was forty minutes away, so I sat on a cold wooden bench feeling annoyed at myself. Two minutes later, an older man beside me noticed my sigh and showed me the notebook he was sketching in. We talked about travel, architecture, and why missed schedules sometimes protect us. When the next train finally arrived, my frustration was gone — because missing that rush was the only reason my afternoon slowed down enough to notice someone else.",
  },
  {
    id: "cm-story-int-1",
    title: "Turning-Point Story — The Blank Slide",
    materialType: "storytelling",
    difficulty: "intermediate",
    skills: ["expression", "confidence", "pausesBreathing", "fluency"],
    durationSec: 210,
    reps: 1,
    targetWpm: 128,
    category: "storytelling",
    whatToDo:
      "Pass 1: Read the story aloud with clear emotional shift between panic and poise. Pass 2 (optional): Retell it in your own words using the 4-beat arc (Scene → Problem → Turn → Lesson).",
    howToSpeak:
      "Use genuine pitch contrast — lean forward with conversational intimacy on the quote, and drop your pitch firmly on the final lesson.",
    emphasisWords: ["black", "twenty", "breathing", "whiteboard", "drew", "connection"],
    pauseNotes:
      "Pause a full second ‖ after 'went completely black.' and another beat before delivering the closing lesson.",
    mistakesToAvoid: [
      "Rushing straight through the awkward silence moment instead of letting it breathe.",
      "Delivering the quoted line in the same voice as the narration.",
      "Using filler words if you try the retell pass.",
    ],
    annotatedText:
      "∧ Three minutes into my first major client presentation, | the projector flickered | and went completely **black**. ‖ ∧ **Twenty** executives looked up from their notebooks | straight at me. ‖ ∧ My first instinct was to apologize repeatedly | and fumble with cables. ‖ ∧ Instead, | I heard a mentor's advice about **breathing** first. ‖ ∧ I stepped away from the laptop, | picked up a marker, | and walked to the **whiteboard**. ‖ ∧ “Let's skip the slides,” | I said calmly, | “and sketch the three numbers that actually decide this quarter.” ‖ ∧ As I **drew** each box, | people started leaning forward and asking sharper questions than they ever had with slides. ‖ ∧ That morning taught me a lasting lesson: | slides are decoration, | but clear human **connection** is the whole presentation. ‖",
    plainText:
      "Three minutes into my first major client presentation, the projector flickered and went completely black. Twenty executives looked up from their notebooks straight at me. My first instinct was to apologize repeatedly and fumble with cables. Instead, I heard a mentor's advice about breathing first. I stepped away from the laptop, picked up a marker, and walked to the whiteboard. Let's skip the slides, I said calmly, and sketch the three numbers that actually decide this quarter. As I drew each box, people started leaning forward and asking sharper questions than they ever had with slides. That morning taught me a lasting lesson: slides are decoration, but clear human connection is the whole presentation.",
    structureSteps: [
      "Scene: First major presentation, 3 minutes in",
      "Problem: Projector goes black in front of 20 executives",
      "Turn: Breathe, ditch the cables, draw 3 boxes on the whiteboard",
      "Lesson: Slides are decoration; clear human connection wins",
    ],
  },
  {
    id: "cm-story-adv-1",
    title: "Your Own 90-Second Turning-Point Story",
    materialType: "storytelling",
    difficulty: "advanced",
    skills: ["confidence", "expression", "fluency", "pausesBreathing"],
    durationSec: 180,
    reps: 1,
    targetWpm: 130,
    category: "storytelling",
    whatToDo:
      "Spend 30 seconds picking a real moment when a small mistake or surprise changed your mind. Then record a 90-second story with zero notes using the 4-beat arc below.",
    howToSpeak:
      "Open straight in the scene (no 'So today I want to tell you about...'). Slow down 20% at the turning point and leave a clean 1-second pause right before your one-sentence takeaway.",
    emphasisWords: ["specific sensory detail", "the exact turning moment", "one-sentence takeaway"],
    pauseNotes:
      "Place a deliberate 1-second silent beat right before your final lesson sentence so it echoes cleanly.",
    mistakesToAvoid: [
      "Over-explaining background context for the first 45 seconds.",
      "Filling thinking gaps with 'um', 'like', or 'you know' instead of silent beats.",
      "Rambling past the lesson — once you land the closing sentence, stop cleanly.",
    ],
    annotatedText:
      "∧ **Beat 1 — Drop into the scene (15s):** | Name the place, the time, and one vivid detail. ‖ ∧ **Beat 2 — Show the tension (25s):** | What went wrong or felt uncertain? ‖ ∧ **Beat 3 — The turning point (30s):** | Slow down here | — what decision or realization shifted everything? ‖ ∧ **Beat 4 — Pause & land the point (20s):** | Hold one calm second of silence, | then deliver one crisp takeaway sentence | and stop. ‖",
    plainText: "",
    structureSteps: [
      "Beat 1 (15s): Drop directly into the place, time, and one sensory detail",
      "Beat 2 (25s): Describe the tension or obstacle clearly",
      "Beat 3 (30s): Slow down on the exact turning moment or decision",
      "Beat 4 (20s): Pause 1 full second, deliver one crisp takeaway, then stop",
    ],
  },

  // ======================== 5. TONGUE TWISTERS ========================
  {
    id: "cm-tt-beg-1",
    title: "Sibilant & Plosive Builder — Slow to Crisp",
    materialType: "tongue_twister",
    difficulty: "beginner",
    skills: ["pronunciation", "clarity", "pacing"],
    durationSec: 120,
    reps: 4,
    targetWpm: 105,
    category: "pronunciation",
    whatToDo:
      "Speak all three lines slowly at first (~85 WPM) with exaggerated lip and tongue precision. Then repeat a second pass at comfortable speed (~110 WPM) without losing a single consonant.",
    howToSpeak:
      "Keep your jaw relaxed and let the tip of the tongue and lips do quick, light taps — never clench your jaw or force loudness.",
    emphasisWords: ["seven", "silver", "crispy", "fresh", "proper", "copper"],
    pauseNotes:
      "Take a fresh nasal inhale ∧ before each twister and pause a full second ‖ between lines so tension never compounds.",
    mistakesToAvoid: [
      "Racing for speed on Rep 1 — speed without clarity trains sloppy muscle memory.",
      "Blurring 'S' and 'SH' together on 'sells' and 'shells'.",
      "Letting 'proper copper' turn into 'popper topper'.",
    ],
    annotatedText:
      "∧ **Seven** **silver** swans swam silently southward. ‖ ∧ **Fresh** **crispy** crusts crack cleanly. ‖ ∧ A **proper** **copper** coffee pot | poured **proper** **copper** coffee. ‖",
    plainText:
      "Seven silver swans swam silently southward. Fresh crispy crusts crack cleanly. A proper copper coffee pot poured proper copper coffee.",
  },
  {
    id: "cm-tt-int-1",
    title: "TH, L/R & V/W Articulation Gauntlet",
    materialType: "tongue_twister",
    difficulty: "intermediate",
    skills: ["pronunciation", "clarity", "fluency"],
    durationSec: 150,
    reps: 3,
    targetWpm: 115,
    category: "pronunciation",
    whatToDo:
      "Focus on the three classic trouble contrasts: TH (tongue gently between teeth), R vs L (curl vs ridge tap), and V vs W (teeth-on-lip vs rounded lips). Record one clean pass.",
    howToSpeak:
      "Treat each twister like a precise percussion pattern. If you stumble twice on one sound, drop speed by 30% on that phrase alone.",
    emphasisWords: ["thirty-three", "red", "yellow", "very", "wet", "vivid"],
    pauseNotes:
      "Reset your tongue and take a quiet breath ∧ before every new line ‖.",
    mistakesToAvoid: [
      "Turning 'thirty-three' into 'tirty-tree' or 'sirty-sree'.",
      "Letting 'red lorry, yellow lorry' merge into 'yewwo wowwy'.",
      "Using rounded W lips when pronouncing V in 'very' or 'vivid'.",
    ],
    annotatedText:
      "∧ **Thirty-three** thoughtful thinkers | thanked three thorough teachers. ‖ ∧ **Red** lorry, | **yellow** lorry, | **red** lorry, | **yellow** lorry. ‖ ∧ **Very** **wet** weather | washed **vivid** velvet vests westward. ‖",
    plainText:
      "Thirty-three thoughtful thinkers thanked three thorough teachers. Red lorry, yellow lorry, red lorry, yellow lorry. Very wet weather washed vivid velvet vests westward.",
  },
  {
    id: "cm-tt-adv-1",
    title: "Precision Endurance — Rapid Articulation Medley",
    materialType: "tongue_twister",
    difficulty: "advanced",
    skills: ["pronunciation", "clarity", "pacing", "fluency"],
    durationSec: 150,
    reps: 3,
    targetWpm: 125,
    category: "pronunciation",
    whatToDo:
      "Deliver all three high-density consonant drills cleanly in a single take at ~120–130 WPM. Every syllable and word ending must stay distinct on playback.",
    howToSpeak:
      "Keep breath steady from your belly so rapid tongue movements stay effortless and light rather than tense.",
    emphasisWords: ["bitter", "butter", "sixth", "sheik", "amidst", "mists"],
    pauseNotes:
      "Breathe deeply ∧ before each line and break the long lines at the | marks.",
    mistakesToAvoid: [
      "Dropping the -st / -sts clusters in 'mists', 'frosts', 'fists', 'posts'.",
      "Compressing 'sixth' into 'six'.",
      "Rushing faster on line 3 as breath runs low.",
    ],
    annotatedText:
      "∧ Betty bought a bit of **butter**, | but the **butter** Betty bought | was a bit too **bitter**. ‖ ∧ The **sixth** sick **sheik's** **sixth** sheep's sick. ‖ ∧ **Amidst** the **mists** and coldest frosts, | with barest wrists and stoutest boasts, | he thrusts his fists against the posts | and still insists he sees the ghosts. ‖",
    plainText:
      "Betty bought a bit of butter, but the butter Betty bought was a bit too bitter. The sixth sick sheik's sixth sheep's sick. Amidst the mists and coldest frosts, with barest wrists and stoutest boasts, he thrusts his fists against the posts and still insists he sees the ghosts.",
  },

  // ======================== 6. CONVERSATION EXERCISES ========================
  {
    id: "cm-conv-beg-1",
    title: "Warm Introductions & Natural Follow-Ups",
    materialType: "conversation",
    difficulty: "beginner",
    skills: ["confidence", "expression", "clarity"],
    durationSec: 150,
    reps: 2,
    targetWpm: 125,
    category: "conversation",
    whatToDo:
      "Practice speaking your side of a friendly introduction aloud. Notice how your pitch rises gently on open questions and stays warm and grounded on statements.",
    howToSpeak:
      "Smile lightly before pressing record — subtle facial warmth immediately softens vocal tone. Speak as if genuinely pleased to meet the listener.",
    emphasisWords: ["great", "working", "curious", "brought", "enjoying"],
    pauseNotes:
      "Pause 1 full second ‖ after each turn to imagine the other person replying before moving to your next conversational response.",
    mistakesToAvoid: [
      "Sounding stiff or reciting your introduction like a memorized resume.",
      "Speaking too softly on your own name or greeting.",
      "Asking questions with a flat downward tone that sounds uninterested.",
    ],
    annotatedText:
      "∧ Hi, | it is really **great** to meet you! ‖ ∧ Lately I have been **working** on sharpening my communication skills | and taking on new projects at work. ‖ ∧ I am **curious** — | what **brought** you to this event today? ‖ ∧ That sounds fascinating. ‖ ∧ How long have you been **enjoying** that kind of work, | and what has surprised you most about it? ‖",
    plainText:
      "Hi, it is really great to meet you! Lately I have been working on sharpening my communication skills and taking on new projects at work. I am curious — what brought you to this event today? That sounds fascinating. How long have you been enjoying that kind of work, and what has surprised you most about it?",
  },
  {
    id: "cm-conv-int-1",
    title: "Disagreeing Politely in a Team Discussion",
    materialType: "conversation",
    difficulty: "intermediate",
    skills: ["confidence", "pacing", "expression", "fluency"],
    durationSec: 180,
    reps: 2,
    targetWpm: 128,
    category: "conversation",
    whatToDo:
      "Deliver this calm, respectful pushback as if speaking to a colleague in a live meeting. Validate first, pause cleanly, then offer your alternative without apologizing unnecessarily.",
    howToSpeak:
      "Keep your tone collaborative and unhurried (~125 WPM). Avoid defensive sharpness on 'however' or 'instead' — steady warmth makes disagreement feel safe and credible.",
    emphasisWords: ["appreciate", "concern", "timeline", "propose", "test", "confidence"],
    pauseNotes:
      "Hold a clear beat | after 'makes sense' and a calm breath ∧ before 'Here is what I propose' so your alternative lands with poise.",
    mistakesToAvoid: [
      "Using nervous qualifiers like 'sorry, I might be wrong, um, basically...'.",
      "Speeding up during the disagreement because of social discomfort.",
      "Ending your proposal with upward 'question' inflection that undercuts certainty.",
    ],
    annotatedText:
      "∧ I really **appreciate** how clearly you laid out that option, | and the goal makes complete sense. ‖ ∧ My one **concern** is the **timeline** | if we roll it out to everyone on day one. ‖ ∧ Here is what I **propose** instead: | let us run a focused **test** with ten percent of users next week. ‖ ∧ That gives us real numbers by Friday | and lets the whole team launch with genuine **confidence**. ‖ ∧ How does that middle path sound to you? ‖",
    plainText:
      "I really appreciate how clearly you laid out that option, and the goal makes complete sense. My one concern is the timeline if we roll it out to everyone on day one. Here is what I propose instead: let us run a focused test with ten percent of users next week. That gives us real numbers by Friday and lets the whole team launch with genuine confidence. How does that middle path sound to you?",
  },
  {
    id: "cm-conv-adv-1",
    title: "Handling a Tough Follow-Up Question Under Pressure",
    materialType: "conversation",
    difficulty: "advanced",
    skills: ["confidence", "fluency", "projection", "pausesBreathing"],
    durationSec: 180,
    reps: 2,
    targetWpm: 130,
    category: "conversation",
    whatToDo:
      "Practice answering a challenging stakeholder question directly without stalling, hedging, or filler sounds. Deliver the scripted response first, then try improvising your own version.",
    howToSpeak:
      "Take a deliberate one-second breath BEFORE your first word. Speak clearly at ~128 WPM, land the headline answer in sentence one, then give two concise reasons.",
    emphasisWords: ["direct", "short", "two", "already", "Friday", "transparent"],
    pauseNotes:
      "Pause ‖ after the headline answer so the room hears that you didn't dodge the question.",
    mistakesToAvoid: [
      "Filling the opening second with 'Um, well, that's a great question, so basically...'.",
      "Talking faster when defending a missed target.",
      "Over-explaining after you have already given the clear next step.",
    ],
    annotatedText:
      "∧ That is a fair question, | so let me give you the **direct** answer. ‖ ∧ We fell **short** of our original target by eight percent this month. ‖ ∧ There were **two** root causes: | slower vendor delivery | and an underestimated testing cycle. ‖ ∧ We have **already** put a backup supplier in place | and tightened our weekly checkpoints. ‖ ∧ By **Friday**, | you will have a revised forecast | with **transparent** weekly milestones so there are no surprises going forward. ‖",
    plainText:
      "That is a fair question, so let me give you the direct answer. We fell short of our original target by eight percent this month. There were two root causes: slower vendor delivery and an underestimated testing cycle. We have already put a backup supplier in place and tightened our weekly checkpoints. By Friday, you will have a revised forecast with transparent weekly milestones so there are no surprises going forward.",
  },

  // ======================== 7. IMPROMPTU SPEAKING TOPICS ========================
  {
    id: "cm-imp-beg-1",
    title: "60-Second Everyday Topic — PREP Framework",
    materialType: "impromptu",
    difficulty: "beginner",
    skills: ["fluency", "confidence", "pacing"],
    durationSec: 120,
    reps: 1,
    targetWpm: 120,
    category: "impromptu",
    whatToDo:
      "Topic: 'What is one simple daily habit that improves your day, and why?' Take 20 seconds to choose your habit, then speak continuously for 60 seconds using PREP (Point → Reason → Example → Point).",
    howToSpeak:
      "Speak at a relaxed conversational pace (~115–130 WPM). Whenever your mind searches for the next phrase, pause silently for 1 second instead of saying 'um' or 'like'.",
    emphasisWords: ["your chosen habit", "the main reason", "one specific moment"],
    pauseNotes:
      "Take one calm breath ∧ between each of the 4 PREP steps so your thinking stays ahead of your mouth.",
    mistakesToAvoid: [
      "Starting with 'Um, so I guess I'll talk about...'",
      "Restarting a sentence when you stumble — keep moving forward.",
      "Stopping after 20 seconds; add a concrete everyday example to reach 60 seconds cleanly.",
    ],
    annotatedText:
      "∧ **P — Point (10s):** | State your habit in one clean sentence. ‖ ∧ **R — Reason (15s):** | Explain why it makes a real difference. ‖ ∧ **E — Example (25s):** | Share one specific morning or day when it helped you. ‖ ∧ **P — Point (10s):** | Close calmly by restating the main benefit | and stop. ‖",
    plainText: "",
    structureSteps: [
      "Topic: One simple daily habit that improves your day, and why",
      "Point (10s): State your habit clearly in one sentence",
      "Reason (15s): Give the primary reason it helps",
      "Example (25s): Share one specific moment from your week",
      "Point (10s): Restate your takeaway firmly and stop",
    ],
  },
  {
    id: "cm-imp-int-1",
    title: "90-Second Clear Explanation — Teach Something Simply",
    materialType: "impromptu",
    difficulty: "intermediate",
    skills: ["fluency", "clarity", "confidence", "pausesBreathing"],
    durationSec: 150,
    reps: 1,
    targetWpm: 128,
    category: "impromptu",
    whatToDo:
      "Topic: 'Explain a tool, concept, or skill you use often so a smart 12-year-old understands it clearly.' Take 30 seconds to pick your topic, then record a 90-second explanation with zero jargon.",
    howToSpeak:
      "Warm, steady teacher energy (~125–135 WPM). Use short sentences and pause clearly before your everyday analogy.",
    emphasisWords: ["what problem it solves", "everyday analogy", "one simple summary"],
    pauseNotes:
      "Pause 0.8s after introducing your analogy so the listener can visualize it.",
    mistakesToAvoid: [
      "Using filler hedges ('basically', 'sort of', 'kind of', 'actually').",
      "Diving straight into technical details without saying why the topic matters first.",
      "Running out of breath mid-explanation instead of pausing cleanly between steps.",
    ],
    annotatedText:
      "∧ **1. Hook & Plain Definition (20s):** | What is it in one plain sentence? ‖ ∧ **2. Everyday Analogy (30s):** | “Think of it like...” — connect it to something everyone already knows. ‖ ∧ **3. How It Works in 2–3 Steps (30s):** | First... Second... Finally... ‖ ∧ **4. Crisp Close (10s):** | Drop your pitch and land one memorable closing line. ‖",
    plainText: "",
    structureSteps: [
      "Topic: Teach a concept, tool, or skill simply to a 12-year-old",
      "Hook (20s): Plain one-sentence definition + why it matters",
      "Analogy (30s): 'Think of it like...' concrete visual comparison",
      "Steps (30s): Walk through 2–3 simple steps with clean pauses",
      "Close (10s): One decisive takeaway sentence",
    ],
  },
  {
    id: "cm-imp-adv-1",
    title: "2-Minute Executive Opinion — Take a Stand & Defend It",
    materialType: "impromptu",
    difficulty: "advanced",
    skills: ["confidence", "fluency", "expression", "projection", "pausesBreathing"],
    durationSec: 180,
    reps: 1,
    targetWpm: 135,
    category: "impromptu",
    whatToDo:
      "Topic: 'Should teams replace half of their recurring status meetings with written updates?' Take 30 seconds to choose a clear side, then deliver a structured 90–120 second argument with zero filler words.",
    howToSpeak:
      "Stand up, project cleanly, drop your pitch on conclusions, and maintain vocal variety across your claim, two reasons, concession, and recommendation.",
    emphasisWords: ["clear position", "two concrete reasons", "honest counterpoint", "final recommendation"],
    pauseNotes:
      "Hold a full 1-second pause before stating your position and before your closing recommendation.",
    mistakesToAvoid: [
      "Sitting on the fence ('well, both sides have points so it depends...').",
      "Speeding above 160 WPM when making a passionate point.",
      "Letting filler words sneak in while transitioning to your counterpoint.",
    ],
    annotatedText:
      "∧ **Position (15s):** | State your stand in one decisive sentence. ‖ ∧ **Two Reasons (50s):** | “First...” and “Second...” — include one concrete workplace example. ‖ ∧ **Fair Concession (25s):** | Acknowledge the strongest opposing concern calmly. ‖ ∧ **Close (20s):** | Pause one beat, | restate your recommendation with downward pitch, | and end cleanly. ‖",
    plainText: "",
    structureSteps: [
      "Motion: Should teams replace half of recurring status meetings with written updates?",
      "Position (15s): Take one clear side immediately",
      "Two Reasons (50s): First & Second + one real-world example",
      "Concession (25s): Acknowledge the sharpest counterpoint fairly",
      "Recommendation (20s): Pause 1s, land a crisp close, stop",
    ],
  },

  // ======================== 8. STAMMERING / FLUENCY & YOUTUBE CAMERA STUDIO ========================
  {
    id: "cm-fluency-gentle-onset",
    title: "Gentle Onset — Easy Voice Starts (Anti-Blocking)",
    materialType: "short_sentence",
    difficulty: "beginner",
    skills: ["fluency", "pausesBreathing", "pacing"],
    durationSec: 120,
    reps: 3,
    targetWpm: 105,
    category: "fluency",
    focusTags: ["stammering", "youtube"],
    whatToDo:
      "Practice starting every sentence with a tiny, soft exhale before your voice turns on (like a gentle whisper smoothly turning into full voice). This prevents vocal-cord locking and hard blocks on the first word.",
    howToSpeak:
      "Take a relaxed belly breath, release a tiny puff of air, then glide softly into the first vowel or word at ~105 WPM. Keep your jaw loose, shoulders dropped, and stretch the very first syllable slightly.",
    emphasisWords: ["easy", "smooth", "calm", "every", "steady", "own"],
    pauseNotes:
      "Take a slow, silent breath ∧ before every sentence. Pause ‖ for a full calm second between lines—never rush to start.",
    mistakesToAvoid: [
      "Forcing or pushing the first sound out with a tight throat (hard glottal attack).",
      "Holding your breath right before starting a sentence.",
      "Speeding up once the first two words come out smoothly.",
    ],
    annotatedText:
      "∧ Hhh-**easy** breath in, | smooth voice out. ‖ ∧ **Always** start soft | before adding volume. ‖ ∧ **Every** clear phrase | rides on one **calm** stream of air. ‖ ∧ **Open** your jaw gently | and let the **steady** rhythm carry you. ‖ ∧ I set my **own** pace | and I never have to rush. ‖",
    plainText:
      "Easy breath in, smooth voice out. Always start soft before adding volume. Every clear phrase rides on one calm stream of air. Open your jaw gently and let the steady rhythm carry you. I set my own pace and I never have to rush.",
  },
  {
    id: "cm-fluency-light-contact",
    title: "Light Articulatory Contacts — Soft P, B, T, D, K, G",
    materialType: "tongue_twister",
    difficulty: "beginner",
    skills: ["fluency", "pronunciation", "clarity"],
    durationSec: 120,
    reps: 3,
    targetWpm: 100,
    category: "fluency",
    focusTags: ["stammering"],
    whatToDo:
      "Hard plosive consonants (P, B, T, D, K, G) are the most common place people clamp down and block when stammering. Read each line touching your lips or tongue at only 30% pressure—like a feather touch—and glide immediately into the vowel.",
    howToSpeak:
      "Go intentionally slow (~95–105 WPM). Barely brush your lips together on P and B; lightly tap your tongue tip on T and D. If you feel pressure building, loosen your jaw, exhale gently, and glide through.",
    emphasisWords: ["peaceful", "bright", "take", "deep", "keep", "calm"],
    pauseNotes:
      "Reset your breath ∧ and relax your lips after every ‖ mark so tension never accumulates from line to line.",
    mistakesToAvoid: [
      "Pressing your lips tightly together on P or B before releasing air.",
      "Trying to read this like a fast tongue twister—smoothness beats speed 100%.",
      "Tensing your neck, cheeks, or eyebrows when approaching a trigger letter.",
    ],
    annotatedText:
      "∧ **Peaceful** people | paint **bright** pictures | by the bay. ‖ ∧ **Take** two **deep** breaths | before talking to the team. ‖ ∧ **Keep** a **calm** cadence | while guiding good conversations. ‖ ∧ **Soft** starts | make **clear** speech | feel light and effortless. ‖",
    plainText:
      "Peaceful people paint bright pictures by the bay. Take two deep breaths before talking to the team. Keep a calm cadence while guiding good conversations. Soft starts make clear speech feel light and effortless.",
  },
  {
    id: "cm-fluency-airflow-linking",
    title: "Continuous Airflow & Smooth Phrase Linking",
    materialType: "paragraph",
    difficulty: "beginner",
    skills: ["fluency", "pausesBreathing", "pacing"],
    durationSec: 150,
    reps: 2,
    targetWpm: 110,
    category: "fluency",
    focusTags: ["stammering", "youtube"],
    whatToDo:
      "Connect each short phrase (4 to 6 words) on one continuous outgoing breath, letting the end of one word flow gently into the start of the next. Stop ONLY at the marked pause bars.",
    howToSpeak:
      "Think of your voice like water pouring smoothly from a pitcher rather than droplets starting and stopping. Maintain steady ~110 WPM, soft starts after each breath ∧, and calm 1-second pauses at ‖.",
    emphasisWords: ["smooth", "breath", "flowing", "pauses", "camera", "naturally"],
    pauseNotes:
      "Inhale silently ∧ only at the breath symbols, keeping each phrase glued together smoothly.",
    mistakesToAvoid: [
      "Stopping airflow abruptly between every single word (choppy staccato speech).",
      "Trying to stretch 15 words onto one breath until your throat tightens.",
      "Panicking if one word bumps—keep the air moving forward gently.",
    ],
    annotatedText:
      "∧ **Smooth** speaking begins | when your **breath** stays light and steady. ‖ ∧ Instead of forcing each word alone, | let small phrases stay **flowing** together. ‖ ∧ Short, planned **pauses** | give your brain space to relax | and choose the next clear idea. ‖ ∧ Whether you are talking to a friend | or recording for a **camera**, | steady airflow helps your voice land **naturally**. ‖",
    plainText:
      "Smooth speaking begins when your breath stays light and steady. Instead of forcing each word alone, let small phrases stay flowing together. Short, planned pauses give your brain space to relax and choose the next clear idea. Whether you are talking to a friend or recording for a camera, steady airflow helps your voice land naturally.",
  },
  {
    id: "cm-fluency-pullout-recovery",
    title: "Tension Release & Pull-Out Recovery Drill",
    materialType: "paragraph",
    difficulty: "intermediate",
    skills: ["fluency", "confidence", "pausesBreathing"],
    durationSec: 150,
    reps: 2,
    targetWpm: 110,
    category: "fluency",
    focusTags: ["stammering"],
    whatToDo:
      "Practice the speech-therapy 'pull-out' technique: whenever you feel a word catching or repeating, DO NOT push harder. Freeze for half a second, drop your jaw and shoulders, gently stretch the first vowel, and glide smoothly into the rest of the sentence.",
    howToSpeak:
      "Read calmly at ~105–115 WPM. Intentionally practice a calm, controlled slow-stretch on the highlighted anchor words so your nervous system learns you are always in control of a sticky moment.",
    emphasisWords: ["control", "release", "slowly", "glide", "calm", "forward"],
    pauseNotes:
      "Use every | pause to do a 1-second physical tension check: loose jaw, soft tongue, dropped shoulders.",
    mistakesToAvoid: [
      "Fighting a block by pushing more air or squeezing your throat tighter.",
      "Looking away or restarting the entire sentence from scratch in frustration.",
      "Rushing the next five words to 'make up for lost time'.",
    ],
    annotatedText:
      "∧ Real **control** | does not mean never hitting a bump. ‖ ∧ It means noticing tightness early, | letting your shoulders **release**, | and continuing without panic. ‖ ∧ When a difficult word appears, | ease in **slowly**, | stretch the opening sound gently, | and **glide** right into the vowel. ‖ ∧ Listeners remember your **calm** presence | far more than a tiny pause, | so breathe once | and move **forward** with confidence. ‖",
    plainText:
      "Real control does not mean never hitting a bump. It means noticing tightness early, letting your shoulders release, and continuing without panic. When a difficult word appears, ease in slowly, stretch the opening sound gently, and glide right into the vowel. Listeners remember your calm presence far more than a tiny pause, so breathe once and move forward with confidence.",
  },
  {
    id: "cm-fluency-rate-anchor",
    title: "Calm Rate Control & Deliberate Pausing (105 WPM)",
    materialType: "long_passage",
    difficulty: "intermediate",
    skills: ["pacing", "fluency", "pausesBreathing", "projection"],
    durationSec: 180,
    reps: 1,
    targetWpm: 108,
    category: "pacing",
    focusTags: ["stammering", "youtube"],
    whatToDo:
      "Many people who stammer speak faster when nervous, which overwhelms speech motor timing. Read this full passage staying near 105–115 WPM with clear, comfortable 1-second pauses—notice how authoritative and calm it sounds on playback.",
    howToSpeak:
      "Keep your voice warm and unhurried. Stretch key stressed vowels slightly rather than speeding between words. Hold every ‖ pause for a full slow 'one-thousand'.",
    emphasisWords: ["hurry", "authority", "clear", "space", "audience", "trust", "voice"],
    pauseNotes:
      "Breathe ∧ gently at the start of each paragraph and hold ‖ pauses without apologizing or filling the silence.",
    mistakesToAvoid: [
      "Thinking 110 WPM sounds 'too slow'—on YouTube audio playback it sounds confident and crisp.",
      "Skipping pauses once you get comfortable halfway through the passage.",
      "Dropping your volume to a whisper at the end of sentences.",
    ],
    annotatedText:
      "∧ Great communicators rarely sound like they are in a **hurry**. ‖ ∧ When you slow your pace by just fifteen percent, | something remarkable happens: | your breath deepens, | your articulation sharpens, | and your words carry quiet **authority**. ‖\n\n∧ Think about the creators and speakers you enjoy watching most. ‖ ∧ They do not race through sentences hoping to survive the script. ‖ ∧ They give each **clear** idea a little breathing **space**, | so the **audience** can actually absorb what was said. ‖\n\n∧ A calm pause never looks weak on camera. ‖ ∧ It signals **trust** in your message | and invites viewers to lean in and listen to your **voice**. ‖",
    plainText:
      "Great communicators rarely sound like they are in a hurry. When you slow your pace by just fifteen percent, something remarkable happens: your breath deepens, your articulation sharpens, and your words carry quiet authority. Think about the creators and speakers you enjoy watching most. They do not race through sentences hoping to survive the script. They give each clear idea a little breathing space, so the audience can actually absorb what was said. A calm pause never looks weak on camera. It signals trust in your message and invites viewers to lean in and listen to your voice.",
  },
  {
    id: "cm-yt-hook-intro",
    title: "YouTube Video Intro & Hook — Confident On-Camera Delivery",
    materialType: "storytelling",
    difficulty: "beginner",
    skills: ["confidence", "expression", "fluency", "pacing"],
    durationSec: 150,
    reps: 2,
    targetWpm: 118,
    category: "storytelling",
    focusTags: ["youtube", "stammering"],
    whatToDo:
      "Practice delivering a natural, engaging YouTube opening hook as if looking straight into your camera lens. Use gentle voice starts, friendly warmth, and crisp pauses between beats—no robotic yelling or panic-rushing.",
    howToSpeak:
      "Smile slightly before pressing record (it warms your tone naturally). Start word 1 on an easy breath ∧, talk to ONE friend behind the lens (~115–125 WPM), and punch the highlighted hook words with natural pitch rise.",
    emphasisWords: ["three", "mistake", "simple", "minutes", "actually", "first"],
    pauseNotes:
      "Hold a crisp beat ‖ right after your opening question—that pause hooks YouTube viewers far better than talking non-stop.",
    mistakesToAvoid: [
      "Blasting out 'HEY GUYS WELCOME BACK' at 180 WPM (triggers breathlessness and blocks).",
      "Reading flatly without smiling or lifting pitch on key benefit words.",
      "Stopping the recording the moment one word isn't perfect—keep going like a real take!",
    ],
    annotatedText:
      "∧ Have you ever hit record on a video, | and suddenly forgotten how to speak normally? ‖ ∧ Most new creators make the exact same **mistake** | in their first **three** seconds: | they rush. ‖ ∧ In the next five **minutes**, | I am going to show you a **simple** habit | that **actually** makes talking to a camera feel effortless. ‖ ∧ Let us jump right into the **first** step. ‖",
    plainText:
      "Have you ever hit record on a video, and suddenly forgotten how to speak normally? Most new creators make the exact same mistake in their first three seconds: they rush. In the next five minutes, I am going to show you a simple habit that actually makes talking to a camera feel effortless. Let us jump right into the first step.",
  },
  {
    id: "cm-yt-unscripted-talk",
    title: "YouTube Unscripted Talking-Head Drill (60s On Camera)",
    materialType: "impromptu",
    difficulty: "intermediate",
    skills: ["confidence", "fluency", "expression", "pausesBreathing"],
    durationSec: 120,
    reps: 1,
    targetWpm: 118,
    category: "impromptu",
    focusTags: ["youtube", "stammering"],
    whatToDo:
      "Pick ONE real topic from your YouTube niche (a tip, review, story, or lesson). Spend 15 seconds writing just 3 keywords (not a full script!), then talk straight to your imagined camera for 60 seconds using the Hook → 1 Clear Point → Viewer Takeaway flow.",
    howToSpeak:
      "Begin with a soft breath ∧ and a relaxed ~115 WPM pace. Treat every silence between bullet points as a clean editor's beat—never fill silence with 'um' or rush into the next thought.",
    emphasisWords: ["your hook question", "your one key tip", "your viewer takeaway"],
    pauseNotes:
      "Take one visible, calm breath ∧ between Hook, Point, and Takeaway—you can even imagine a clean jump-cut there!",
    mistakesToAvoid: [
      "Trying to memorize exact sentences word-for-word (memorizing increases blocking fear).",
      "Restarting your recording mid-way if you stumble once—finish the full 60 seconds every time.",
      "Speaking faster to get the recording over with.",
    ],
    annotatedText:
      "∧ **1. Hook (10s):** | Open with one curious question or bold observation on an easy breath. ‖ ∧ **2. One Clear Point (35s):** | Explain your single best tip like you are helping one friend across the table. ‖ ∧ **3. Takeaway & Close (15s):** | Pause one beat, | summarize the main action clearly, | and ask viewers one simple question for the comments. ‖",
    plainText: "",
    structureSteps: [
      "Pick one topic from your YouTube niche and jot down 3 keywords only",
      "Hook (10s): Calm breath ∧ → friendly question or relatable problem",
      "One Clear Point (35s): Explain your tip slowly (~115 WPM) with gentle starts",
      "Takeaway (15s): Pause 1s → give one clear next step & ask viewers a question",
      "Rule: Never stop mid-take—finish all 60 seconds calmly even if a word bumps",
    ],
  },
];

export function getCoachedExerciseById(id: string): CoachedExercise | undefined {
  if (id === DIAGNOSTIC_EXERCISE.id) return DIAGNOSTIC_EXERCISE;
  return COACHED_MATERIALS.find((m) => m.id === id);
}

export function materialsByType(type: PracticeMaterialType): CoachedExercise[] {
  return COACHED_MATERIALS.filter((m) => m.materialType === type);
}

export function materialsByDifficulty(diff: Difficulty): CoachedExercise[] {
  return COACHED_MATERIALS.filter((m) => m.difficulty === diff);
}

export function materialsByFocusTag(tag: "stammering" | "youtube"): CoachedExercise[] {
  return COACHED_MATERIALS.filter((m) => m.focusTags?.includes(tag));
}
