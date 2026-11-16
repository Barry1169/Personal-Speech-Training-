import type { Difficulty, Exercise } from "./types";

// ========================= Types =========================

export interface ProgramExercise {
  id: string;
  name: string;
  category: string;
  instructions: string;
  material?: string[];
  materialLabel?: string;
  durationSec: number;
  reps: number;
  restSec: number;
  tips?: string[];
}

export interface ProgramDay {
  day: number;
  title: string;
  focus: string;
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  impromptu: string[];
  script?: { title: string; text: string };
  targetWpm: number;
}

export interface Week {
  week: number;
  title: string;
  level: string;
  goals: string[];
  days: ProgramDay[];
}

const ex = (
  id: string,
  name: string,
  category: string,
  instructions: string,
  durationSec: number,
  reps: number,
  restSec: number,
  material?: string[],
  materialLabel?: string,
  tips?: string[]
): ProgramExercise => ({ id, name, category, instructions, durationSec, reps, restSec, material, materialLabel, tips });

// ========================= WEEK 1 (fully hand-written) =========================

const W1_DAYS: Omit<ProgramDay, "day">[] = [
  {
    title: "Meet your voice",
    focus: "Breathing foundation + relaxed, even volume",
    targetWpm: 100,
    warmup: [
      ex("w1d1-breath", "3-4-6 Breathing", "breathing",
        "Open the Breathing Trainer and complete 6 cycles of the 3-4-6 pattern (inhale 3s, hold 4s, exhale 6s). Feel the exhale as the engine of your voice.",
        120, 6, 0, undefined, undefined, ["Shoulders loose", "Breathe into the belly, not the chest"]),
      ex("w1d1-hum", "Hum & Lip Trill Warm-up", "clarity",
        "Hum a comfortable tone, letting the vibration sit in your lips and face. Then switch to a gentle lip trill (brrrr) sliding up and down in pitch like a siren.",
        120, 4, 10, ["Hmmmm — slide high to low", "Brrrrr — slide low to high"]),
    ],
    main: [
      ex("w1d1-sz", "S / Z Articulation Drill", "pronunciation",
        "Say each word 3 times: slowly and clearly at first, then at a natural pace. Press your tongue close to the ridge behind your teeth for S; let the vocal cords buzz for Z.",
        150, 3, 15,
        ["see", "sue", "key", "choose", "sun", "zoom", "sink", "shine", "zone", "soft", "three", "breeze", "sue saw six sinks, but six sinks won't sew"],
        "Words & combos",
        ["Tongue tip near (not on) the teeth", "Exaggerate the length at first"]),
      ex("w1d1-tt1", "Tongue Twister — Slow Build", "fluency",
        "Say the twister 5 times: once very slow, three times normal, once as fast as you can while staying 100% clear. If you stumble, go back to slow.",
        120, 5, 10,
        ["Suzy sealed seven saws on the sea shore."],
        "Tongue twister",
        ["Clarity beats speed every single day"]),
      ex("w1d1-read", "Clarity Reading", "reading",
        "Read the passage aloud 3 times at a slow, even pace (~100 wpm). No rushing. Let each word land fully. Use the timer.",
        180, 3, 20,
        ["Good morning. My name is the beginning of everything I will tell you. I am a person with a voice, and this voice is a tool. Like any good tool, it needs regular practice to stay sharp. Today I am sharpening it. I breathe in, I breathe out, and I let the words come out one at a time, in a calm and even line. I do not rush. I do not hide. I speak so that a person across the room can hear me, understand me, and trust what I am saying. That is the whole job of a clear voice: be heard, be understood, be believed."],
        "Read this passage",
        ["Stop and breathe at every period", "Aim for 100 words per minute"]),
      ex("w1d1-imp", "Introduce Yourself (Impromptu)", "confidence",
        "Speak for 60 seconds introducing yourself to a stranger: name, what you do, and one thing you are proud of. No notes. If you stumble, keep moving — never re-read a sentence.",
        90, 1, 15,
        ["Open with: “Hi, I’m…”", "End with something warm and specific"],
        "Prompts"),
    ],
    impromptu: ["Introduce yourself in 3 sentences."],
  },
  {
    title: "Clear consonants",
    focus: "T / D / N — the sounds that carry meaning",
    targetWpm: 105,
    warmup: [
      ex("w1d2-breath", "3-4-6 Breathing", "breathing",
        "6 cycles of 3-4-6 breathing. This week's anchor habit — every session starts here.",
        120, 6, 0),
      ex("w1d2-trill", "Lip Trill + Tongue Tap", "clarity",
        "Lip trill (brrr) for 30s, then tap your tongue on the ridge while making a gentle 'ddd' buzz for 30s. This wakes up the T/D/N muscle group.",
        120, 1, 10),
    ],
    main: [
      ex("w1d2-td", "T / D / N Drill", "pronunciation",
        "Each word 3 times, then the combos at a steady pace. T and D live on the tip of the tongue — feel it click the ridge.",
        150, 3, 15,
        ["ten", "deny", "nut", "ted", "nod", "tooth", "duty", "nation", "tender", "distant", "ten red nets", "do not do this today", "the dentist told them to tone down"],
        "Words & combos"),
      ex("w1d2-tt2", "Tongue Twister — Color Codes", "fluency",
        "4 reps, gradually faster. Focus on switching cleanly between T, D, and N.",
        120, 4, 10,
        ["Two tall tuna ate ten tiny tomatoes.", "Ted's dentist told Tim to tint the dentures."],
        "Tongue twisters"),
      ex("w1d2-read", "Clarity Reading — Passage 2", "reading",
        "Read aloud 3 times at ~105 wpm. Consonants should be crisp but not aggressive — think 'polite knife', not 'aggressive knife'.",
        180, 3, 20,
        ["The plan is simple. We meet at nine, we review the notes, and we decide what to do next. Nothing needs to be dramatic. When I say the next step, I mean the next step — not the one after it. Small words done precisely carry more weight than big words done loosely. Ten, twenty, thirty: I count my sentences and I keep them tight. A person who respects the listener keeps the listener. That is the habit we are building today: precision, calm, and a clear ending to every thought."],
        "Read this passage"),
      ex("w1d2-imp", "Describe Your Morning (Impromptu)", "confidence",
        "Speak 90 seconds describing your morning from waking up to now. Use three numbers (times, counts) to anchor precision. Then record it if you want a baseline.",
        120, 1, 15,
        ["Structure: waking → routine → now", "Include at least three concrete details"]),
    ],
    impromptu: ["Describe your morning in detail."],
  },
  {
    title: "Vowels & pitch",
    focus: "Open vowel sounds + sentence stress",
    targetWpm: 110,
    warmup: [
      ex("w1d3-breath", "3-4-6 Breathing", "breathing", "6 cycles. On the exhale, make a soft 'ffff' to train steady air flow.", 120, 6, 0),
      ex("w1d3-glide", "Vowel Glide Ladder", "pronunciation",
        "Slide smoothly between the five pure vowels: AH → EH → EE → OH → OO and back. Keep your jaw open and relaxed. 4 runs.",
        90, 4, 10,
        ["AH — EH — EE — OH — OO — EH — AH", "father — ten — see — go — boot"]),
    ],
    main: [
      ex("w1d3-vow", "Vowel Length Drill", "pronunciation",
        "Say each pair. The difference is length and mouth position, not effort. Short = clipped, long = stretched.",
        150, 3, 15,
        ["sip / sheep", "bit / beat", "cot / caught", "pet / peer", "lot / loaf", "red / road", "The ship was short; the sheep were long."]),
      ex("w1d3-pitch", "Sentence Stress (Pitch & Emphasis)", "pitch",
        "Say each sentence once flat (boring). Then say it again stressing only the BOLD word — let your pitch jump on that word. This is how real meaning is made.",
        150, 2, 15,
        ["I **wanted** the red car, not the blue one.", "I wanted the **red** car, not the blue one.", "I wanted the red **car**, not the blue one.", "It wasn't **hard**, it was **long**.", "We **could** go, or we **could** stay."],
        "Pitch & emphasis",
        ["Flat delivery = lost meaning", "One stress per sentence is enough"]),
      ex("w1d3-read", "Clarity Reading — Passage 3", "reading",
        "Read at ~110 wpm. Mark (mentally) the most important word in each sentence and give it slightly more pitch.",
        180, 3, 20,
        ["Listen carefully to what people are actually saying, not what you assumed they meant. Most misunderstandings are not about the words. They are about the stress on the words. If I say “I didn't say you stole my book,” the meaning changes depending on which word I stress. Today I practice that difference out loud. I give each important word a small rise in pitch, and I let the unimportant words sit lower and lighter. The result sounds natural, warm, and easy to follow. That is the sound of a confident speaker: not loud, but precise."],
        "Read this passage"),
      ex("w1d3-imp", "Something You Enjoyed (Impromptu)", "confidence",
        "90 seconds on something you genuinely enjoyed last week. Stress one word per sentence to keep it lively.",
        120, 1, 15,
        ["Pick a specific memory, not a category", "End with one sensory detail (taste, sound, view)"]),
    ],
    impromptu: ["Talk about something you genuinely enjoyed last week."],
  },
  {
    title: "Fluency basics",
    focus: "Moving without restarting",
    targetWpm: 115,
    warmup: [
      ex("w1d4-breath", "3-4-6 Breathing", "breathing", "6 cycles, then 2 cycles ending with a 10-second exhale to settle the nervous system.", 120, 8, 0),
      ex("w1d4-roll", "Speech Rolls", "fluency",
        "Continuous speech without stopping: “and then I…” — keep a stream of harmless words flowing for 30s: “I went to the store and then I…” Let your mind wander, the mouth never stops.",
        90, 3, 15),
    ],
    main: [
      ex("w1d4-norestart", "No-Restart Drill", "fluency",
        "Read the passage once. RULE: if you stumble or make a mistake, DO NOT restart the sentence. Keep going to the end of the sentence. Stumbles are invisible to listeners; restarts are the real fluency killer.",
        150, 2, 20,
        ["The meeting was late, but nobody minded because we were all thinking about the same question: what should we do next? I proposed one idea, Sara proposed another, and in the end we combined the two into a plan that was bigger than either of them alone. I felt proud of how the conversation moved — no dead ends, no repetition, just forward motion. That is what I want from my voice every day: forward motion."],
        "Read once, no restarts"),
      ex("w1d4-60", "60-Second Nonstop Talk", "fluency",
        "Speak continuously for a full 60 seconds about your room. You may pause and breathe — you may NOT stop talking. The topic is only an excuse; the muscle being trained is 'keeping going'.",
        90, 1, 20,
        ["Scan the room and name items", "Connect them: “this reminds me of…”"]),
      ex("w1d4-con", "Connected Speech — First Contractions", "connected speech",
        "Say each phrase slowly first, then say it the way people actually talk (contracted, linked). 3 passes each.",
        150, 3, 15,
        ["I am going to → I'm going to", "you are going to → you're gonna", "I would like to → I'd like to", "it is very good → it's very good", "do you want to → do you want to", "What are you doing? → What're you doing?"],
        "Link & contract"),
      ex("w1d4-imp", "Two-Minute Mini-Talk", "confidence",
        "2 minutes on: “A skill you would like to master.” No notes, no restarts. Record it — this is your first real fluency baseline.",
        150, 1, 0,
        ["Structure: why → how → first step", "Timer is your friend"]),
    ],
    impromptu: ["A skill you would like to master (2 minutes)."],
  },
  {
    title: "Rhythm & stress",
    focus: "Stress, timing, and natural rhythm",
    targetWpm: 120,
    warmup: [
      ex("w1d5-breath", "3-4-6 Breathing", "breathing", "6 cycles. Add 2 cycles with 8-second exhales for extra calm before a stress-heavy day.", 150, 8, 0),
      ex("w1d5-rhythm", "Rhythm Claps", "fluency",
        "Clap the stressed syllables of each phrase, then say it with matching energy: “I have a **PLAN**,” “I'm go-ing to **STAY**.”",
        90, 4, 10,
        ["I have a plan.", "I'm not sure why.", "It costs too much.", "We should just go.", "That's a great idea."]),
    ],
    main: [
      ex("w1d5-stress", "Word Stress Drill (pitch + emphasis)", "pitch",
        "Multi-syllable words: clap the stressed syllable, then say it 3 times with a clear pitch peak on that syllable.",
        150, 3, 15,
        ["re-CORD", "re-CORD-ing", "PHO-to-graph", "pho-TO-graph-ic", "PRE-sent", "pre-SENT", "con-VERSE", "CON-ver-sa-tion"]),
      ex("w1d5-con2", "Connected Speech — Linking", "connected speech",
        "Link the pairs out loud until they become one smooth phrase. Notice how the consonant of one word joins the vowel of the next.",
        150, 3, 15,
        ["turn it off → tur-nit-off", "pick it up → pic-kit-up", "an old man → an-old-man", "not at all → no-tat-all", "that is it → tha-tiz-it"]),
      ex("w1d5-read", "Rhythm Reading — Passage 4", "reading",
        "Read at ~120 wpm. This passage has long sentences — breathe at the commas, stress one word per clause.",
        180, 3, 20,
        ["When a speaker controls the rhythm, the listener stops counting words and starts feeling the story. I want to feel my next presentation, not decode it. So I practice with the rhythm, not just the reading. The strong beats come early, the weak words float in between, and the pauses do the heavy lifting. A well-placed half-second pause can be more powerful than any adjective. Today I give the pauses room to breathe, and I let the important words land where they are supposed to."],
        "Read this passage"),
      ex("w1d5-imp", "Plan a Meal (Impromptu)", "confidence",
        "90 seconds: plan and describe a meal for a guest you admire. Be specific: dishes, sequence, one detail that shows care.",
        120, 1, 15,
        ["Use sequence words: first, then, finally", "Stress the dish names"]),
    ],
    impromptu: ["Plan and describe a meal for a guest you admire."],
  },
  {
    title: "Story day",
    focus: "Structure: beginning, middle, turning point",
    targetWpm: 120,
    warmup: [
      ex("w1d6-breath", "3-4-6 Breathing", "breathing", "6 cycles before storytelling — stories are where nerves show up first.", 120, 6, 0),
      ex("w1d6-hum", "Hum Warm-up", "clarity", "3 minutes of gentle humming and lip trills to loosen everything.", 180, 2, 10),
    ],
    main: [
      ex("w1d6-script", "Story Script — Read Then Retell", "reading",
        "First read the story aloud twice with feeling. Then close your eyes and retell it from memory in your own words (2–3 minutes). The turning point is your job — slow down there.",
        300, 2, 30,
        ["The day I forgot my script was the day I found my voice. We were at a small community event, and the person in front of me was running long. They looked at me, smiled, and simply moved on. No one warned me. I stepped up with my card forgotten in my jacket, my prepared jokes locked in my head. So I did the only honest thing I could: I asked the room what they needed help with. A woman told me about her daughter's exam. A man talked about his first bike. For ten minutes I wasn't performing — I was listening and answering. When I stepped down, the organizer said one sentence I still hear: “That was the most natural talk of the afternoon.” I had planned for failure that morning. But it turned out the audience forgives everything except trying too hard. Since that day, every talk I give starts with a question, not a joke. Because the real story was never the material. It was the moment I stopped hiding behind it."],
        "Short story: “The day I forgot my script” (~150 words)"),
      ex("w1d6-structure", "Story Skeleton Drill", "confidence",
        "Tell the same story three times using different structures: (1) chronological, (2) start with the turning point, (3) start with the lesson. 90 seconds each.",
        300, 3, 15,
        ["Version A: from the top", "Version B: “The organizer said something I still hear…”", "Version C: “Stop hiding behind your material.”"]),
      ex("w1d6-imp", "Mini Story (Impromptu)", "confidence",
        "3 minutes: “Tell a short story about a trip (any trip).” Use the skeleton: scene → problem → turn → lesson. Record it.",
        210, 1, 0),
    ],
    impromptu: ["Tell a short story about a trip. (3 minutes)"],
  },
  {
    title: "Review & record",
    focus: "Baseline recording + honest self-assessment",
    targetWpm: 120,
    warmup: [
      ex("w1d7-breath", "3-4-6 Breathing", "breathing", "8 cycles. You are about to make your most important recording of the month.", 150, 8, 0),
      ex("w1d7-mix", "Week 1 Twister Mix", "fluency",
        "Say all four week-1 twisters, 2 reps each, at your best clear speed.",
        120, 8, 10,
        ["Suzy sealed seven saws on the sea shore.", "Two tall tuna ate ten tiny tomatoes.", "Ted's dentist told Tim to tint the dentures.", "The red brick, the black cap, the brown barn."]),
    ],
    main: [
      ex("w1d7-record", "BASELINE RECORDING", "confidence",
        "Go to the Record page. Speak for 90–120 seconds: introduce yourself, what you do, and one thing you are proud of. No notes. This is Day 1 of your voice. Future weeks will be compared against it — be honest, not performative.",
        180, 1, 0),
      ex("w1d7-review", "Self-Assessment", "confidence",
        "After recording, score yourself 1–5 on clarity, pronunciation, fluency, pacing, and vocal control. Use the sliders in the recording screen. These numbers are your personal baseline — they only need to beat themselves.",
        120, 1, 0),
    ],
    impromptu: ["Baseline recording: 90–120 seconds, introduce yourself."],
  },
];

// ========================= WEEKS 2–12 content bank =========================

interface WeekBank {
  title: string;
  level: string;
  goals: string[];
  phoneme: string; // focus sound label
  drill: { words: string[]; combos: string[] };
  twisters: string[];
  passage: string;
  longScript: { title: string; text: string };
  pitch: string[];
  connected: string[];
  impromptu: string[];
  wpm: number;
}

const BANK: WeekBank[] = [
  { // WEEK 2
    title: "Clarity & crisp consonants",
    level: "Beginner+",
    goals: ["Crisp B/P/V/W contrasts", "105–120 wpm at full clarity", "Own your no-restart rule"],
    phoneme: "B / P / V / W",
    drill: {
      words: ["vet", "wet", "bath", "path", "butter", "putter", "very", "worry", "pave", "wave", "vivid", "widow"],
      combos: ["vet wet with a bit of wade", "Peter picked a pebble and patted it", "The very brave veteran waved the white pennant", "Bobby's puppy wobbled past the velvet wagon"],
    },
    twisters: [
      "Peter picked a very pebbly pebble.",
      "The white van waved a bright flag.",
      "Betty's brave veteran brewed vivid coffee.",
    ],
    passage:
      "Clarity is not volume. A speaker can be quiet and still be perfectly clear, because clarity comes from the consonants landing on time. Today I practice the four sounds that are easiest to blur together: B, P, V, and W. I say them with intention. The lip presses for B and P, the top teeth touch the lower lip for V, and the lips round for W. When a listener can catch every word the first time, the speaker has done their job. I would rather be understood at a normal volume than shouted at and misunderstood. So I keep the volume calm, keep the consonants honest, and keep the pace slow enough for the words to arrive intact.",
    longScript: {
      title: "My quality standard",
      text: "I hold myself to a simple quality standard when I speak. First: I finish every thought before I start the next. Most messy speech is not a vocabulary problem, it is an unfinished-thought problem. Second: I name things. Vague speakers say “the thing” and “that one,” while clear speakers name the object, the person, and the step. Third: I end on purpose. I know which sentence will be my last, and I slow down slightly on it so the listener hears a landing, not a crash. If you listened to me this morning, that is what you would have heard: completed thoughts, named objects, and a deliberate ending. I did not raise my voice once. I did not use a single word I could not define. And I ended exactly where I planned to end. That is not hard. It is just practice, repeated until it is invisible.",
    },
    pitch: [
      "I said **no**, not **maybe**.",
      "**Tuesday**, not **Thursday**.",
      "It's **light**, not **bright**.",
    ],
    connected: [
      "Let me see → Let-me-see",
      "Put it away → pu-tit-away",
      "Very well → ver-ywell",
      "I want to → I-wanna",
    ],
    impromptu: [
      "Explain why clarity matters more than charisma (2 min).",
      "Describe your workspace object by object (90s).",
      "Give instructions for making your favorite drink (90s).",
    ],
    wpm: 110,
  },
  { // WEEK 3
    title: "Flow — connected speech",
    level: "Intermediate",
    goals: ["Natural contractions & linking", "Fluent 2-min mini-talks", "120 wpm without stumbling"],
    phoneme: "Linking & contractions",
    drill: {
      words: ["going to", "want to", "gotta", "doin'", "gonna", "wanna", "outta", "lemme"],
      combos: ["I'm gonna tell you → I'mma tell ya", "What do you want → Whaddaya want", "Pick it up → pic-kit-up", "Turn it off → tur-nit-off", "Not at all → no-tat-all", "An old friend → an-old-friend"],
    },
    twisters: [
      "The thick thief thought the thicket was thick.",
      "Fresh flesh, fresh bread, fresh air, fresh start.",
      "She sells sea shells on the sea shore shore.",
    ],
    passage:
      "When people speak naturally, the words connect. A vowel slides into a consonant, a word swallows the next, and the sentence becomes a river instead of a row of rocks. Today I practice that river. I read slowly first, hearing the separate words, and then I read at speed, hearing the connected speech. Both versions are the same sentence. One is for study, the other is for life. I want my everyday voice to sound like the second version: smooth, relaxed, and impossible to interrupt because there is no gap to interrupt. Connection is fluency in its physical form, and fluency is confidence in its physical form.",
    longScript: {
      title: "The river voice",
      text: "There are two versions of every sentence: the studied version and the spoken version. In the studied version, each word stands alone, like bricks on a table. In the spoken version, the bricks have become a wall. I am training the wall. When I say “I would like to know the reason,” the wall sounds like “I'd-like-ta-know-the-reason.” Nobody hears five bricks and a gap. They hear one smooth move. This week I am building those moves by hand: linking a consonant into a vowel, dropping the little function words into the shadows, and letting the content words carry the load. It feels unnatural on day one. It feels like speaking a slightly different language on day three. And on day seven, it feels like home. Because it is the language people actually speak, and once you speak it, listening becomes effortless too. You finally speak the same language as the room.",
    },
    pitch: [
      "**I'm** fine, really — not **I am**.",
      "Did you **say** that, or did I **hear** that?",
      "We're **going**, or we're **staying**?",
    ],
    connected: [
      "I'd like to → I'd-like-ta",
      "Come on in → cu-min-in",
      "That's it, that's all → That's-it-that's-all",
      "Do you have → Do-you-hav",
    ],
    impromptu: [
      "Translate a stiff sentence into casual connected speech, out loud (2 min).",
      "Tell what you did yesterday in one flowing 2-minute talk — no lists.",
      "Explain a game or app to a 10-year-old (2 min).",
    ],
    wpm: 120,
  },
  { // WEEK 4
    title: "Confidence under pressure",
    level: "Intermediate",
    goals: ["30-second prep impromptu talks", "Filler-word awareness", "Voice steady when nervous"],
    phoneme: "Filler-word removal",
    drill: {
      words: ["um", "uh", "like", "you know", "basically", "sort of"],
      combos: ["Replace “um” with a silent beat", "Replace “like” with a pause", "Say the sentence, then say it again with zero fillers"],
    },
    twisters: [
      "A proper copper coffee pot.",
      "Greg's grey gargoyle grazes greedily.",
      "Six slick slickers slickly slid.",
    ],
    passage:
      "Nervous speakers fill silence with noise: um, uh, like, you know. The sound of thinking. But the audience never hears thinking — they hear hesitation. Today I practice the replacement: the silent beat. When I do not know the next word, I stop. Completely. For a full second. And I let the silence do its work. Silences are not holes in a speech. They are punctuation. They tell the listener I am choosing the next word on purpose. I count my fillers out loud as I speak, and every single one I hear, I remove on the next pass. Ten passes in, my silence is clean, and my confidence is just a consequence of that clean silence.",
    longScript: {
      title: "The silent beat",
      text: "Here is the secret of confident speakers: they are comfortable being quiet. When they lose a word, they do not panic-fill the gap. They pause, and the pause looks like authority instead of failure, because their body keeps doing what a confident body does — steady posture, calm face, eyes on the listener. I am training that split: the mind can scramble while the body stays calm. My exercise is simple. I give myself a 30-second prep for a random topic, and I speak for two minutes with one rule: zero filler sounds. If I run out of words, I stop. Full stop. Silent beat. Then the next sentence starts. The first day I can do two clean minutes, something changes. The fear of the gap disappears, because I have proved to myself, out loud, that I can survive it. And a speaker who can survive a silence can do anything.",
    },
    pitch: [
      "I'm not **nervous**.",
      "I'm not nervous, I'm **ready**.",
      "That's **all** I have to say.",
    ],
    connected: [
      "Thirty seconds → thir-ty-sec-onds (keep crisp)",
      "You know what → You-know-what",
      "Let me think → Lemme-think",
    ],
    impromptu: [
      "Random object on your desk: 30s prep, 2 min talk.",
      "“Should remote work be the default?” — take a side, 2 min.",
      "Describe a stranger you met recently and what they taught you (2 min).",
    ],
    wpm: 125,
  },
  { // WEEK 5
    title: "Pitch & emotion",
    level: "Intermediate+",
    goals: ["Expressive intonation", "Stress control in long sentences", "Voice that carries feeling"],
    phoneme: "Intonation patterns",
    drill: {
      words: ["really?", "really.", "really!"],
      combos: ["Say “great” as: rising (disbelief), falling (satisfaction), flat (deadpan), high (enthusiasm)", "Same word, four emotions", "“I can't believe it” in happy, angry, sad, and surprised versions"],
    },
    twisters: [
      "Red lorry, yellow lorry, red yellow lorry.",
      "Betty bought a bit of butter, but the butter Betty bought was not a bit too bitter.",
      "How can a clam cram in a clean cream can?",
    ],
    passage:
      "A flat voice puts listeners to sleep, even with brilliant words. Today I give my voice back its colors. I read the same sentence four times: as a question, as a command, as a confession, and as a boast. Each version needs a different shape of pitch. Questions rise at the end. Commands drop. Confessions get softer. Boasts get rounder and slower. When I finish, my voice has done four different jobs with the same words. That is the skill: the words stay constant, the music changes. And music is what people remember about a speaker, long after the words themselves have faded from memory.",
    longScript: {
      title: "Four shapes",
      text: "People forget words, but they remember how you sounded. Think of the last speech that changed something for you. You probably cannot quote a single sentence. But you can still hear the voice — where it dropped, where it rose, where it went quiet and made the whole room lean in. I want that. So today I train the four basic shapes of intonation. The rise, for questions and suspense. The fall, for certainty and conclusions. The softening, for the moments that matter and cannot be shouted. And the round, warm curve, for the parts where I want people to feel invited in. I take one honest paragraph about my own life and I perform it four ways: curious, certain, vulnerable, and warm. Then I stop performing and just speak, letting the right shape appear on its own. When the shapes come without thinking, the emotion finally sounds real, because it is.",
    },
    pitch: [
      "Are you **sure**?",
      "Be **sure**.",
      "I am sure… I think.",
      "I am **sure**.",
    ],
    connected: [
      "Can I ask → Can-I-ask",
      "What do you mean → Whadda-you-mean",
      "I've got to go → I-gotta-go",
    ],
    impromptu: [
      "Tell the same 30-second fact as a question, a warning, and a celebration.",
      "“The best piece of advice you ever got” — 2 min, with real feeling.",
      "Sell a random object from your room in 2 minutes with real enthusiasm.",
    ],
    wpm: 125,
  },
  { // WEEK 6
    title: "Pacing — speed control",
    level: "Intermediate+",
    goals: ["Hold 120–140 wpm on demand", "Slow-down emphasis", "Longer speaking stamina"],
    phoneme: "Pace modulation",
    drill: {
      words: ["speed", "steady", "slow"],
      combos: ["Read 30s at 80 wpm (deliberate), 30s at 130 wpm, 30s at 100 wpm — same passage", "Slow down 30% on the final word of every sentence"],
    },
    twisters: [
      "The thirty-three thieves thought that they thrilled the throne throughout Thursday.",
      "A black black bird blacked a bright black barn.",
      "I saw a cat on a mat. Did you see a cat on a mat?",
    ],
    passage:
      "Speed is a dial, not a destination. Fast speech sounds excited but loses precision; slow speech sounds wise but can drag. Today I practice moving the dial on purpose. I read the same lines three speeds apart, and then I practice the killer move: the deliberate slow-down. Before the important word, I cut my pace by a third. The listener's brain notices the shift and instantly knows: this word matters. That is how professionals land their key phrases. I am not speaking slower overall. I am making the important moments slower, which makes the normal moments sound fast by comparison.",
    longScript: {
      title: "The dial",
      text: "Watch any great interview and you will see the trick. The guest speaks at a comfortable middle speed for most of the conversation. But when the real answer comes — the one sentence that carries the whole message — their speed drops, and the room leans in. Nobody told them to. Their control is automatic. That is the skill I am installing this week. I set a target pace before I speak, usually one hundred twenty to one hundred forty words a minute. I speak at that pace through the setup. And then, on the one line that matters, I slow down by a third and let it land. I practice with a metronome in my head: one beat, two words, steady. The slow-down is only powerful because the normal speed is stable. So half my practice is boring, even, unremarkable delivery — and that boring stability is what makes the dramatic moments sound dramatic at all.",
    },
    pitch: [
      "Wait. **Wait.** Wait.",
      "We have **time**.",
      "We have **no** time.",
    ],
    connected: [
      "Slowly and surely → slo-ly-an-sure-ly",
      "Step by step → step-by-step",
      "More and more → mor-an-more",
    ],
    impromptu: [
      "Same story at three different speeds — 90s each, then pick your best.",
      "2 minutes: “Why I will finish what I start.”",
      "Explain traffic/jam in your life and your plan for it (2 min).",
    ],
    wpm: 130,
  },
  { // WEEK 7
    title: "Stamina & long-form",
    level: "Advanced",
    goals: ["5-minute continuous talks", "Breathing mid-speech", "Recovery from mistakes"],
    phoneme: "Breath management in speech",
    drill: {
      words: ["breathe", "continue", "recover"],
      combos: ["Speak one full sentence per breath", "Speak two sentences per breath", "Plan breath marks (∧) in a passage and hit every one"],
    },
    twisters: [
      "A big black bug bit a big black bear.",
      "Four furious frogs feared four ferocious frogs.",
      "The sixth sick sheik's sixth sheep's sick.",
    ],
    passage:
      "Long talks are won at the comma. The speaker who knows where the next breath is going never gasps, never cuts a sentence in half, and never loses the thread. Today I mark my passage with breath points before I read, and I hit every single one. Two to three phrases per breath. If a breath arrives too early, I hold the last word for half a beat. If it arrives too late, I have planned one extra breath earlier. It is bookkeeping for the lungs. Do it ten minutes a day and the bookkeeping disappears — breathing becomes part of the rhythm instead of an emergency that interrupts it.",
    longScript: {
      title: "The five-minute climb",
      text: "This week I am climbing from two-minute talks to five-minute ones, and the difference is not content. The difference is breath. In a two-minute talk you can coast on adrenaline. In a five-minute talk, you are on your own air supply, and an unmanaged supply fails you at the three-minute mark, right when the topic gets interesting. So I build the habit now, in practice, where failure costs nothing. Before every long talk I count out three slow 3-4-6 breaths. While I talk, I breathe at the commas and full stops, never mid-phrase. And when I lose a sentence — because I will — I do not apologize, I do not repeat the whole thing. I say “let me put that better,” and I land the thought again. Recovery is a skill with its own muscle, and it only grows if I use it on purpose. By Friday, five minutes is not a wall. It is just a longer hallway, and I know exactly where the light switches are.",
    },
    pitch: [
      "I can keep going… and going… and **going**.",
      "That was only the **beginning**.",
    ],
    connected: [
      "On and on → on-an-on",
      "Round and round → round-an-round",
      "Over and over → o-ver-an-o-ver",
    ],
    impromptu: [
      "5 minutes: “How I would spend a perfect day.” No notes.",
      "5 minutes: explain one book, film, or hobby you love.",
      "Recover drill: speak 3 min, deliberately stumble twice, recover both smoothly.",
    ],
    wpm: 130,
  },
  { // WEEK 8
    title: "Real world — the interview",
    level: "Advanced",
    goals: ["Answer interview questions crisply", "STAR structure out loud", "Professional pacing"],
    phoneme: "Interview register",
    drill: {
      words: ["role", "achieved", "collaboration"],
      combos: ["Answer “Tell me about yourself” in 60 seconds: present → past → why here", "Answer a question in 30 seconds, then in 90 seconds"],
    },
    twisters: [
      "Wendy works with a wry, wise weasel.",
      "Five fluffed daffodils fluffed faster.",
      "The very busy beaver builds very busy beaver homes.",
    ],
    passage:
      "Interview answers fail in two ways: too short to show the proof, too long to hold attention. The working range is ninety seconds, and the shape is Situation, Task, Action, Result. One sentence each for the first three, two for the result, and then stop. Silence after the final sentence is not awkward — it is the interviewer's turn. Today I practice the shape until the shape is automatic, so that under real pressure I am not thinking about structure at all. I am just a person giving a clear, honest, ninety-second answer, and then listening.",
    longScript: {
      title: "Why me (90-second pitch)",
      text: "Here is the ninety-second version of me. I started out curious about [your field] and worked my way up through [one concrete project or role]. The thing I am proudest of is [specific achievement with a number where possible]. Along the way I developed two strengths that fit this role directly: first, I [skill one — say it with a one-line proof], and second, I [skill two — say it with a one-line proof]. I am not looking for just any next step. I am looking for [the specific thing this role offers], because that is where my strengths and my ambitions point to the same place. So when I say I would be a good fit, I mean it in the narrow, checkable way: here is what I have done, here is what you need, and here is the overlap. That is my pitch, in ninety seconds. Thank you — and I am happy to go deeper on any part of it.",
    },
    pitch: [
      "I'm a strong fit for this **role**.",
      "I'm a **strong** fit for this role.",
    ],
    connected: [
      "Thank you for → Thank-yo-for",
      "Could you tell me → Could-you-tell-me",
      "In my opinion → In-my-op-in-ion",
    ],
    impromptu: [
      "Mock Q: “Tell me about yourself.” 60s, then 90s version.",
      "Mock Q: “Tell me about a challenge you overcame.” STAR, 90s.",
      "Mock Q: “Why should we hire you?” 60s, no filler words.",
    ],
    wpm: 135,
  },
  { // WEEK 9
    title: "Storytelling mastery",
    level: "Advanced",
    goals: ["3-minute stories with a clear turn", "Anecdote-to-point structure", "Audience-friendly pacing"],
    phoneme: "Story arcs",
    drill: {
      words: ["then", "but", "so"],
      combos: ["Tell any story opening three ways: chronological, cold-open (mid-action), lesson-first", "Add one sensory detail per 30 seconds"],
    },
    twisters: [
      "The wizard's wristwatch was a whimsical wonder.",
      "Fred's friend Frank fed Frank's frenzied frog.",
      "A dozen dizzy daisies danced through the dusk.",
    ],
    passage:
      "Stories are the most persuasive format a human voice can produce, because brains listen to stories differently than they listen to arguments. Attention goes up, criticism goes down. Today I take a normal experience and run it through the story machine: a character (that is me), a goal, an obstacle, a turn, and a line of takeaway. The takeaway is one sentence, and it arrives only after the turn — never before. I tell the story, I let the silence sit for a half-second, and then I land the point. That final pause before the takeaway is the most important half-second in the whole story. It is where the listener decides what the story means, and I give them space to do it.",
    longScript: {
      title: "The story that made me",
      text: "A few years ago I had a small failure that quietly rewired how I speak. I volunteered to present at a local meetup, and I did everything right on paper: slides, notes, rehearsal. Then the projector died, and I stood there holding my laptop, watching the confidence I had built evaporate in about four seconds. Here is the turn: instead of apologizing, I closed the laptop. “Well,” I said, “that's the first lesson of today — plans fail. Let's talk about what actually works.” For the next fifteen minutes I just talked, and the best feedback I ever got arrived the next week: “I remember everything you said because you had nothing but your voice.” That story has done more for my speaking than any technique. Every technique is a tool for the moment the plan breaks, and the plan always breaks. So I carry the story with me now. When the projector dies, when the room is quiet, when I forget a word — I remember a dark room, a closed laptop, and a fifteen-minute conversation that was the best talk I ever gave. Voice first. Tools second. Always.",
    },
    pitch: [
      "And **then**… everything changed.",
      "Nobody **expected** that.",
      "So here's the point.",
    ],
    connected: [
      "Once upon a time → On-cu-pun-a-time",
      "Little by little → Lit-tle-by-lit-tle",
      "In the end → In-the-end",
    ],
    impromptu: [
      "3-minute story: “The time I was wrong about something.”",
      "3-minute story: “A meal that mattered.”",
      "Turn drill: take yesterday's most boring event and find its story turn. Tell it in 2 min.",
    ],
    wpm: 130,
  },
  { // WEEK 10
    title: "Explaining simply",
    level: "Advanced",
    goals: ["Feynman-style explanation", "Zero jargon in 3 minutes", "Teach-a-child register"],
    phoneme: "Plain language",
    drill: {
      words: ["actually", "essentially", "leverage", "utilize"],
      combos: ["Take any technical topic and say it using only 1000 most common words", "Explain it to a 10-year-old, then to an expert — out loud, both versions"],
    },
    twisters: [
      "The clever clerk cleared the clutter cleverly.",
      "Ten thirsty tourists thirstily toasted.",
      "A careful camel carried a careful cargo.",
    ],
    passage:
      "If you cannot explain a thing simply, you do not understand it simply. The jargon is the comfort blanket: big words hide how little the speaker really sees. Today I strip a topic I know well down to its skeleton: what it is, why it exists, and one concrete example a child could picture. No term of art without a plain translation immediately after it. And I watch myself for the escape words — essentially, basically, obviously — because those are usually where understanding is thinnest. A plain explanation takes more preparation and less vocabulary, and that trade is the entire game. The room rewards it immediately, because plain language feels like respect.",
    longScript: {
      title: "How a search works (simple version)",
      text: "So, how does a search engine actually work? Imagine a library the size of the whole internet. You type a sentence into the box, and behind the scenes three things happen. First, the system guesses what you actually mean. You might type a typo, or use a word nobody else uses, so it quietly rewrites your question into the form that will find the most. Second, it looks at a map that was built long before you arrived. For years, robots have been crawling every page on the web, reading it, and writing down which pages link to which other pages. Pages that many other good pages point to get high marks — like a restaurant that every food blog mentions. Third, it ranks the candidates using dozens of small signals: does the page use your words, is it recent, does it look trustworthy? All of this happens in a fraction of a second, and the result is ten blue links, the first three of which are usually right. So the next time you search for something, remember: you are not looking at the internet. You are looking at the internet's best guess, made for you, in a blink.",
    },
    pitch: [
      "Here's the **simple** version.",
      "It's not complicated — it's **simple**.",
      "One **example** is worth ten paragraphs.",
    ],
    connected: [
      "For example → For-ex-am-ple",
      "In simple terms → In-sim-ple-terms",
      "Let's say → Lets-say",
    ],
    impromptu: [
      "Explain how a microwave works to a 10-year-old (2 min).",
      "Explain your job to a 10-year-old (2 min, zero jargon).",
      "Pick a news topic and explain it in 3 minutes a child could follow.",
    ],
    wpm: 130,
  },
  { // WEEK 11
    title: "Debate & persuasion",
    level: "Advanced",
    goals: ["Argue a side you disagree with", "Premise-evidence-conclusion out loud", "Calm under challenge"],
    phoneme: "Argument structure",
    drill: {
      words: ["however", "therefore", "consequently"],
      combos: ["Make the steel-man argument for your opposite side, 2 min", "“Premise, evidence, conclusion” — build one argument in exactly 3 sentences"],
    },
    twisters: [
      "Big bees buzz, but busy bees buzz twice as busy.",
      "Dee deeds a deed, and did Dee's deed duly?",
      "The devil's devils devoured deviled devils.",
    ],
    passage:
      "A calm voice wins arguments that the louder voice loses. Persuasion is structure plus tone: a clear premise, one piece of honest evidence, and a conclusion the listener can reach on their own. Today I practice arguing for a side I actually disagree with — because that is the only way to build the muscle. I state the position in one sentence, give the two strongest reasons in its favor, and then — this is the move most debaters skip — I acknowledge its strongest weakness myself. Conceding the weak point makes the strong points sound stronger, and it makes the speaker sound reasonable instead of desperate. Tone rule for the whole drill: my pitch drops when I make a point, never rises.",
    longScript: {
      title: "In favor of slower mornings",
      text: "I want to argue for something that sounds lazy: slower mornings. Three reasons. First, attention is a resource, and mornings decide where it goes. A person who starts the day reacting — to messages, to alarms, to other people's urgencies — spends the day's best attention on other people's problems. A person who starts with twenty quiet minutes spends it on their own. Second, decision fatigue is real. Every choice you make on autopilot before breakfast is a small debt, and the interest is paid in worse decisions all day long. Third — and this is the practical one — the slow morning is the only consistent habit I have ever kept, precisely because it is the least demanding. It asks for nothing but a boundary. Now, the honest weakness of my argument: slower mornings cost time, and if you are on shift work or up with a baby, a boundary is a luxury. I grant that completely. But for the person with a choice to make, the case is simple: you are going to give this morning away. The only question is whether you give it on purpose or by accident.",
    },
    pitch: [
      "Here's the **strongest** reason.",
      "And **therefore**…",
      "I **concede** that point.",
    ],
    connected: [
      "On the other hand → On-the-oth-er-hand",
      "As a result → As-a-re-sult",
      "In my view → In-my-view",
    ],
    impromptu: [
      "Argue FOR the side you disagree with: “Remote work should end.” 2 min.",
      "Debate: “Cities should ban cars from centers.” Take a side, 2 min, calm tone.",
      "Persuade: convince me to visit a place you know, in 90 seconds, premise-evidence-conclusion.",
    ],
    wpm: 130,
  },
  { // WEEK 12
    title: "Capstone — your presentation",
    level: "Advanced",
    goals: ["Write, structure, and deliver a 5-minute talk", "Compare against Day 7 baseline", "Set your next 12-week goals"],
    phoneme: "Integration",
    drill: {
      words: ["open", "turn", "close"],
      combos: ["Write your 5-minute talk outline: hook (15s) → 3 points → close (15s)", "Dry run 1 (timed), dry run 2 (recorded), final delivery (recorded)"],
    },
    twisters: [
      "The wicked whiz kid wizard wowed the wobbly crowd.",
      "Silly silly Sally silks some silly silk.",
      "A proper copper coffee pot, properly polished, properly proper.",
    ],
    passage:
      "This is the final practice week, and the final skill is not a new one — it is all of them at once. Breathing before. Consonants during. Stress on the key words. Silence at the turns. Speed dropped on the close. A presentation is just a conversation with a larger circle, and every habit from the last eleven weeks gets used in it. Today I do the full build: I write the outline, I dry run it twice, and I record the final version. Then I put my capstone recording side by side with the Day 7 baseline, and I listen with my eyes closed. The numbers matter, but the listening matters more: I am checking whether the second speaker sounds like a person, or like a performance. Because that was the whole point, from week one.",
    longScript: {
      title: "Twelve weeks (your closing template)",
      text: "When I started twelve weeks ago, my biggest problem with speaking was not vocabulary — it was presence. My words arrived, but I did not. So here is what I did, in plain terms. I practiced ten minutes a day, every day, and I made it boring on purpose: breathing, articulation, reading, and one impromptu talk. I recorded myself every week, which is the least fun and most important part, because you cannot improve what you will not listen to. Around week four, something shifted. The fillers got quieter, the pauses got intentional, and I stopped thinking about my voice mid-sentence, which is the real goal — a voice good enough to disappear. Two numbers to close: my pacing settled at one hundred thirty words a minute, which is where I land naturally now, and my self-score for clarity went from my baseline to a four out of five. But the number I am proudest of is the one I cannot measure: the last three conversations I have given — a review, a dinner, a family call — I finished each one feeling present. That is what this was for. My voice, finally in the room.",
    },
    pitch: [
      "And that's the **full** story.",
      "Thank **you**.",
    ],
    connected: [
      "All in all → All-in-all",
      "Step back and → Step-back-an-",
      "In closing → In-clos-ing",
    ],
    impromptu: [
      "CAPSTONE: write and deliver a 5-minute talk about what speaking taught you about you.",
      "Record it, compare with Day 7 baseline, score yourself.",
      "Write your next 12-week goals (3 items) and say them out loud as a commitment.",
    ],
    wpm: 135,
  },
];

// ========================= Day generator for weeks 2–12 =========================

function buildDay(weekNum: number, bank: WeekBank, day: number): ProgramDay {
  const w = weekNum - 2; // index into BANK
  const id = (n: string) => `w${weekNum}d${day}-${n}`;
  const breath = ex(id("breath"), "3-4-6 Breathing", "breathing",
    "Start with 6 cycles of 3-4-6 breathing in the Breathing Trainer. Keep the exhale long and silent.",
    120, 6, 0);

  const byDay: { title: string; focus: string; main: ProgramExercise[] }[] = [
    {
      title: `Sound focus: ${bank.phoneme}`,
      focus: `Drill the week's sound focus: ${bank.phoneme}`,
      main: [
        ex(id("drill"), `${bank.phoneme} Drill`, "pronunciation",
          "Say each word 3 times, slowly then naturally. Then the combos at a steady pace. Exaggerate placement on the first pass, soften on the last.",
          180, 3, 15, [...bank.drill.words, ...bank.drill.combos], "Words & combos"),
        ex(id("tw1"), "Tongue Twister Gauntlet", "fluency",
          "Each twister: 1x very slow, 2x normal, 1x fast-but-clear. Stop and reset if you stumble twice.",
          150, 4, 15, bank.twisters, "Twisters"),
        ex(id("read"), "Pacing Reading", "reading",
          `Read the passage 3 times at ~${bank.wpm} wpm. First pass: accuracy. Second: rhythm. Third: your best delivery.`,
          210, 3, 20, [bank.passage], "Read this passage"),
        ex(id("imp"), "Impromptu Talk", "confidence",
          "Pick one topic below. 30 seconds of thinking, then 2 minutes of talking. No notes, no restarts.",
          180, 1, 15, bank.impromptu.slice(0, 3), "Pick one"),
      ],
    },
    {
      title: `Flow day — ${bank.phoneme}`,
      focus: "Connected delivery + fluency stamina",
      main: [
        ex(id("con"), "Connected Speech Drill", "connected speech",
          "Say each linking pattern 3 times: once exaggerated, twice natural. Then string all of them into one unbroken run-out.",
          150, 3, 15, [...bank.connected, ...bank.drill.combos], "Link & run"),
        ex(id("tw2"), "Twister — Speed Ladder", "fluency",
          "One twister, five climbs: 50% speed, 65%, 80%, 90%, 100% clear. If a rung breaks, repeat it, then continue.",
          180, 5, 10, [bank.twisters[0]], "Twister"),
        ex(id("read"), "Pacing Reading", "reading",
          `Read at ~${bank.wpm} wpm, but cut your speed 30% on the last word of every sentence (the Week-6 slow-down move).`,
          210, 3, 20, [bank.passage], "Read this passage"),
        ex(id("imp"), "Impromptu Flow", "confidence",
          "Speak 90 seconds straight on a topic below. Rule: zero filler sounds — use the silent beat instead.",
          150, 1, 15, bank.impromptu.slice(1, 4), "Pick one"),
      ],
    },
    {
      title: "Pitch, stress & emotion",
      focus: "Make the important words land",
      main: [
        ex(id("pitch"), "Pitch & Emphasis Drills", "pitch",
          "Say each sentence once flat, then again with clear stress on the BOLD word and a small pitch jump. 2 full passes.",
          150, 2, 15, bank.pitch, "Stress the bold word"),
        ex(id("drill2"), `${bank.phoneme} Precision Round`, "pronunciation",
          "Quick precision round on the week's sound: 10 words fast, 10 words slow, one combo repeated until clean.",
          150, 2, 15, bank.drill.words, "Words"),
        ex(id("read"), "Emphasis Reading", "reading",
          "Read the passage 3 times. Each pass, pick one word per sentence to emphasize — different words each pass. Note which pass sounded most alive.",
          240, 3, 20, [bank.passage], "Read this passage"),
        ex(id("imp"), "Feel It (Impromptu)", "confidence",
          "2 minutes on a topic you actually care about. Let real feeling shape the pitch. Then replay and notice where your voice moved.",
          150, 1, 15, bank.impromptu.slice(0, 2), "Pick one"),
      ],
    },
    {
      title: "Stamina building",
      focus: "Longer continuous speech + breath control",
      main: [
        ex(id("breath2"), "Speech Breath Planning", "breathing",
          "Mark breath points (in your head) for the long text: 2–3 phrases per breath. Then read it hitting every planned breath.",
          240, 1, 15, [bank.longScript.text.slice(0, 400)], "First half of today's long text"),
        ex(id("tw3"), "Twister Endurance", "fluency",
          "All three twisters in a row without a full reset — brief pauses allowed, no stopping. 2 runs.",
          180, 2, 20, bank.twisters, "Twisters"),
        ex(id("imp2"), "3-Minute Continuous", "fluency",
          "Pick a topic below and speak for a full 3 minutes. The only allowed silences are planned breaths. Record it if you can.",
          240, 1, 15, bank.impromptu, "Pick one"),
      ],
    },
    {
      title: "The long text",
      focus: "Full long-form delivery of the weekly script",
      main: [
        ex(id("script-read"), "Long Script — Two Reads", "reading",
          `Read “${bank.longScript.title}” twice. First: accuracy and breath points. Second: performance — stress, pitch, the slow-down on key lines.`,
          300, 2, 30, [bank.longScript.text], `Long script: “${bank.longScript.title}”`),
        ex(id("script-retell"), "Retell from Memory", "confidence",
          "Close your eyes. Retell the script's story in your own words for 2–3 minutes. Keep the structure, drop the exact words.",
          210, 1, 15),
        ex(id("imp3"), "Impromptu Under Fatigue", "confidence",
          "Right after the long text: 90-second impromptu on a new topic. Fatigue is where clarity falls apart — rebuild it now.",
          120, 1, 0, bank.impromptu.slice(-1), "Surprise topic"),
      ],
    },
    {
      title: "Weakness attack day",
      focus: "Target your two lowest self-assessment scores",
      main: [
        ex(id("weak"), "Diagnose & Drill", "clarity",
          "Open Progress, look at your last 5 self-assessments, and pick your two lowest skills. Do 20 minutes total on them: pull matching exercises from the Library (use the category filter) or the Modes page.",
          1200, 1, 0,
          ["Low clarity → Pronunciation Mode + reading", "Low fluency → Fluency Mode + no-restart drill", "Low pacing → Pacing Mode (speed ladder)", "Low vocal control → Breathing + volume consistency", "Low confidence → Impromptu challenges"],
          "Routing guide"),
        ex(id("tw4"), "Signature Twister", "fluency",
          "Pick the one twister from this week you keep failing. 10 slow reps. It will be done by the week's end.",
          150, 10, 5, bank.twisters, "Your trouble twister"),
        ex(id("record"), "Check-in Recording", "confidence",
          "Record a 90-second talk on any topic from this week's impromptu list. Compare your stats to last week's recording in Progress.",
          150, 1, 0),
      ],
    },
    {
      title: "Review & record",
      focus: "Weekly review + progress recording",
      main: [
        ex(id("tw-all"), "Week Twister Review", "fluency",
          "All 3 twisters of the week, 2 reps each, best-clear speed. Mark any that are still shaky.",
          150, 6, 10, bank.twisters, "Twisters"),
        ex(id("read-f"), "Final Reading", "reading",
          `One more pass of the passage at your target ${bank.wpm} wpm — your best, most natural delivery. This is the week's signature take.`,
          180, 1, 0, [bank.passage], "Read this passage"),
        ex(id("record-week"), "WEEKLY RECORDING", "confidence",
          "Record 2 minutes: summarize the week out loud — what you practiced, what improved, what still feels weak. Honest and specific. This builds your monthly comparison set.",
          180, 1, 0),
        ex(id("scores"), "Self-Assessment Update", "confidence",
          "Score all five skills 1–5 based on this week's recordings. Enter them with the weekly recording so the trend line updates.",
          120, 1, 0),
      ],
    },
  ];

  const t = byDay[(day - 1) % 7];
  return {
    day,
    title: t.title,
    focus: t.focus,
    warmup: [breath,
      ex(id("warm"), "Vocal Warm-up", "clarity",
        "3 minutes: 60s humming, 60s lip trills, 60s of gentle 'mmm-nnn' slides from low to high pitch.",
        180, 1, 10),
    ],
    main: t.main,
    impromptu: bank.impromptu,
    script: day === 5 || day === 7 ? bank.longScript : undefined,
    targetWpm: bank.wpm,
  };
}

function week1(): Week {
  return {
    week: 1,
    title: "Foundations",
    level: "Beginner",
    goals: ["Build the 3-4-6 breathing habit", "Basic articulation: S/Z, T/D/N, vowels", "No-restart fluency rule", "First baseline recording (Day 7)"],
    days: W1_DAYS.map((d, i) => ({ ...d, day: i + 1 })),
  };
}

function weekN(n: number): Week {
  const bank = BANK[n - 2];
  return {
    week: n,
    title: bank.title,
    level: bank.level,
    goals: bank.goals,
    days: Array.from({ length: 7 }, (_, i) => buildDay(n, bank, i + 1)),
  };
}

export const PROGRAM: Week[] = [week1(), ...Array.from({ length: 11 }, (_, i) => weekN(i + 2))];

export function dayLabel(day: number): { week: Week; day: ProgramDay } {
  const safeDay = Math.min(84, Math.max(1, Math.floor(day) || 1)); // clamp 1..84
  const weekIndex = Math.ceil(safeDay / 7) - 1; // 0..11 — PROGRAM is 0-indexed
  const week = PROGRAM[weekIndex] ?? PROGRAM[0];
  const pday = week.days[safeDay - weekIndex * 7 - 1] ?? week.days[0];
  return { week, day: pday };
}

export function dayProgressLabel(day: number): string {
  return `Week ${Math.min(12, Math.ceil(day / 7))} · Day ${((day - 1) % 7) + 1}`;
}

// ========================= Built-in exercise library =========================

const now = 1735689600000; // fixed base timestamp for builtins

export const BUILTIN_EXERCISES: Exercise[] = [
  { id: "bi-breath-346", name: "3-4-6 Breathing Cycles", category: "breathing", instructions: "Inhale 3s through the nose, hold 4s, exhale 6s through the mouth with a soft 'ffff'. Repeat 6–10 cycles. Use the Breathing Trainer page.", material: ["Inhale 3 → Hold 4 → Exhale 6", "Shoulders down, jaw loose", "6 cycles minimum, 10 for a heavy session"], durationSec: 180, reps: 6, restSec: 0, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-hum", name: "Hum & Lip Trill Warm-up", category: "clarity", instructions: "Hum a comfortable tone for 60s, then lip trill (brrr) for 60s, sliding pitch up and down. Do this before every speaking task.", material: ["Hmmmmm (60s)", "Brrrrr — siren up/down (60s)"], durationSec: 120, reps: 2, restSec: 10, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-sz", name: "S / Z Precision", category: "pronunciation", instructions: "Tongue tip near the ridge (not touching). Slow pass, normal pass, fast pass.", material: ["see, sue, key, choose, sun, zoom, sink, shine, zone, soft, three, breeze", "sue saw six sinks, but six sinks won't sew"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-tdn", name: "T / D / N Precision", category: "pronunciation", instructions: "Tongue tip clicks the ridge. Crisp T, buzzed D, hummed N.", material: ["ten, deny, nut, tooth, duty, nation, tender, distant", "ten red nets", "do not do this today", "the dentist told them to tone down"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-bpvw", name: "B / P / V / W Precision", category: "pronunciation", instructions: "Lips press for B/P, teeth-to-lip for V, rounded lips for W.", material: ["vet, wet, bath, path, butter, putter, very, worry, pave, wave, vivid, widow", "vet wet with a bit of wade", "Peter picked a pebble and patted it"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-lr", name: "L / R Discrimination", category: "pronunciation", instructions: "L: tongue tip up. R: tongue curled back, no touch. Say each pair until the contrast is audible to yourself.", material: ["light / right", "left / red", "full / fool", "all / ore", "red lorry, yellow lorry", "Ted's red lorry, Ted's yellow lorry"], durationSec: 150, reps: 3, restSec: 15, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-th", name: "TH Sounds", category: "pronunciation", instructions: "Tongue tip between the teeth, air over it. Voiced (this) vs voiceless (think).", material: ["think, this, thought, these, three, brother", "the thirty-three thieves thought that they thrilled the throne", "a thick thief thought the thicket was thick"], durationSec: 150, reps: 3, restSec: 15, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-vowels", name: "Vowel Ladder", category: "pronunciation", instructions: "Slide AH→EH→EE→OH→OO and back, jaw relaxed. Then say the word row slowly, over-pronouncing mouth shapes.", material: ["AH — EH — EE — OH — OO — EH — AH", "father — ten — see — go — boot", "sip / sheep, bit / beat, lot / loaf, red / road"], durationSec: 120, reps: 4, restSec: 10, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-minpairs", name: "Minimal Pairs Sprint", category: "pronunciation", instructions: "Rapid-fire pairs. Each pair 3 times fast. The meaning must flip clearly every time.", material: ["ship / sheep", "bat / bad", "full / food", "pull / pool", "cart / quart", "fan / van", "lake / lack", "bear / bare"], durationSec: 120, reps: 3, restSec: 10, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-tt-suzy", name: "Twister — Suzy's Saws", category: "fluency", instructions: "5 climbs: slow, normal, normal, fast-clear, fastest-clear. Stumble twice = back to slow.", material: ["Suzy sealed seven saws on the sea shore."], durationSec: 120, reps: 5, restSec: 10, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-tt-tuna", name: "Twister — Tall Tuna", category: "fluency", instructions: "Focus on the T/N switch. 4 reps with rising speed.", material: ["Two tall tuna ate ten tiny tomatoes."], durationSec: 120, reps: 4, restSec: 10, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-tt-copper", name: "Twister — Copper Pot", category: "fluency", instructions: "The P/B blur trap. 4 reps, crisp lips.", material: ["A proper copper coffee pot."], durationSec: 120, reps: 4, restSec: 10, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-tt-lorry", name: "Twister — Lorry Gauntlet", category: "fluency", instructions: "The classic L/R test. 3 slow reps, then as fast as clarity allows.", material: ["Red lorry, yellow lorry, red yellow lorry."], durationSec: 150, reps: 3, restSec: 15, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-tt-betty", name: "Twister — Betty's Butter", category: "fluency", instructions: "B-heavy sentence. 4 reps; if 'butter' and 'bitter' merge, drop to slow.", material: ["Betty bought a bit of butter, but the butter Betty bought was not a bit too bitter."], durationSec: 180, reps: 4, restSec: 15, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-norestart", name: "No-Restart Rule", category: "fluency", instructions: "Read any passage you stumble on. Mistake = keep going to the end of the sentence. Never restart. 3 minutes.", material: ["Any passage from Today or the Library", "The audience hears stumbles, not your replays"], durationSec: 180, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-60sec", name: "60-Second Nonstop", category: "fluency", instructions: "Pick any object in the room and speak about it for 60 continuous seconds. Breath pauses allowed, stopping is not.", material: ["Timer: 60s", "Fallback words: 'and then', 'which reminds me'"], durationSec: 90, reps: 2, restSec: 20, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-silentbeat", name: "The Silent Beat (Filler Removal)", category: "fluency", instructions: "Speak 2 minutes on any topic with ZERO filler sounds. Missing word = full silent beat, 1s. Count fillers out loud in your head.", material: ["Watch for: um, uh, like, you know, basically", "Replace with: 1s silence"], durationSec: 150, reps: 1, restSec: 0, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-speechrolls", name: "Speech Rolls", category: "fluency", instructions: "Keep a stream of harmless words flowing for 30s: 'I went to the store and then I…'. The mouth never stops; the mind can wander. 3 runs.", material: ["30s × 3", "No stopping, no planning — just flow"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-contractions", name: "Contraction Drills", category: "connected speech", instructions: "Say each phrase in its natural spoken form, 3 passes, then chain all of them into one run-out.", material: ["I am going to → I'm gonna", "you are going to → you're gonna", "I would like to → I'd like to", "What are you doing? → What're you doing?"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-linking", name: "Linking Patterns", category: "connected speech", instructions: "Link consonant→vowel until each pair becomes one phrase. Then the full chain.", material: ["turn it off → tur-nit-off", "pick it up → pic-kit-up", "an old man → an-old-man", "not at all → no-tat-all", "that is it → tha-tiz-it"], durationSec: 150, reps: 3, restSec: 15, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-stress", name: "Word Stress Peaks", category: "pitch", instructions: "Clap the stressed syllable, then say each word 3 times with a visible pitch peak on it.", material: ["re-CORD / re-CORD-ing", "PHO-to-graph / pho-TO-graph-ic", "PRE-sent / pre-SENT", "con-VERSE / CON-ver-sa-tion"], durationSec: 150, reps: 3, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-sentencestress", name: "Sentence Stress Swaps", category: "pitch", instructions: "Each sentence flat, then stress a different word each time. One pitch jump per sentence.", material: ["I wanted the RED car / the red CAR / the red car, not the BLUE one", "It wasn't HARD, it was LONG", "We COULD go, or we could STAY"], durationSec: 150, reps: 2, restSec: 15, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-4shapes", name: "Four Intonation Shapes", category: "pitch", instructions: "Same sentence as: question (rise), command (fall), confession (soften), boast (warm curve).", material: ["'I can't believe it.' × 4 shapes", "'Great.' × 4 emotions"], durationSec: 150, reps: 4, restSec: 10, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-slowdown", name: "The Deliberate Slow-Down", category: "pacing", instructions: "Read a paragraph at your normal pace; cut speed 30% on the last word of every sentence.", material: ["Any passage", "30% slower on the final word — feel the contrast"], durationSec: 180, reps: 2, restSec: 15, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-speedladder", name: "Speed Ladder (80 / 130 / 100)", category: "pacing", instructions: "Same passage, three runs: 80 wpm (deliberate), 130 wpm (lively), 100 wpm (settled). Find your natural middle.", material: ["80 wpm → 130 wpm → 100 wpm", "Use the WPM estimate in your recording stats"], durationSec: 240, reps: 3, restSec: 20, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-breathmarks", name: "Breath-Mark Reading", category: "breathing", instructions: "Choose 2–3 phrases per breath. Read the passage hitting every planned breath point. No mid-phrase gasps.", material: ["Mark ∧ at commas before reading", "Hold the last word a half-beat if air arrives early"], durationSec: 240, reps: 2, restSec: 20, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-intro60", name: "Introduce Yourself (60s)", category: "impromptu", instructions: "Name, what you do, one thing you're proud of. 30s thinking, 60s speaking. No notes.", material: ["Open: 'Hi, I'm…'", "Close with something specific and warm"], durationSec: 90, reps: 2, restSec: 15, difficulty: "beginner", builtin: true, createdAt: now },
  { id: "bi-randomobj", name: "Random Object Challenge", category: "impromptu", instructions: "Grab the nearest object. 30s prep, 2 min talk about it: what it is, a memory, why it's interesting.", material: ["30s prep", "2 min delivery", "Include one specific memory"], durationSec: 150, reps: 1, restSec: 0, difficulty: "intermediate", builtin: true, createdAt: now },
  { id: "bi-starpitch", name: "90-Second STAR Pitch", category: "confidence", instructions: "Situation, Task, Action, Result — one sentence each for the first three, two for the result. Then stop and be silent.", material: ["S (1) T (1) A (1) R (2) — stop", "90 seconds max"], durationSec: 120, reps: 2, restSec: 15, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-feynman", name: "Feynman Explainer", category: "confidence", instructions: "Explain one thing you know well to an imaginary 10-year-old. 3 minutes, zero jargon, one concrete example.", material: ["What is it? Why does it exist? One picture-example.", "Ban terms of art without instant plain translation"], durationSec: 210, reps: 1, restSec: 0, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-storyturn", name: "Story Turn Drill", category: "impromptu", instructions: "Take yesterday's most boring event and find its story turn. Tell it in 2 minutes: scene → problem → turn → one-sentence point.", material: ["The point comes AFTER the turn", "Silence half a second before the point"], durationSec: 150, reps: 2, restSec: 15, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-steelman", name: "Steel-Man the Opposite", category: "confidence", instructions: "Argue FOR a position you disagree with: premise → two honest reasons → concede its weakest point. 2 minutes, dropping pitch on each point.", material: ["Premise (1) → Reasons (2) → Concession (1)", "Pitch drops when you make points, never rises"], durationSec: 150, reps: 1, restSec: 0, difficulty: "advanced", builtin: true, createdAt: now },
  { id: "bi-volume", name: "Volume Consistency Check", category: "clarity", instructions: "Record 60 seconds of normal speech, then check Volume Consistency in the recording stats. Aim for a steady band, not peaks and valleys.", material: ["Check: Volume Consistency on the Record page", "Target: even band across the timeline"], durationSec: 90, reps: 2, restSec: 15, difficulty: "intermediate", builtin: true, createdAt: now },
];

// ========================= Modes & real-world content =========================

export interface ModeContent {
  id: string;
  name: string;
  tagline: string;
  description: string;
  sentences?: string[]; // for shadowing
  words?: string[]; // for pronunciation
  topics?: string[]; // for fluency / impromptu
  passage?: string;
  script?: { title: string; text: string };
  paceGuidance?: string;
  usesTTS: boolean;
  minutes: number;
}

export const MODES: ModeContent[] = [
  {
    id: "shadowing",
    name: "Shadowing",
    tagline: "Listen, then repeat",
    description: "Press play on a sentence, listen, then record yourself repeating it as closely as you can — rhythm, stress, and all. The comparison view shows where your words diverged.",
    sentences: [
      "I would like to talk about a change that happened this year.",
      "The plan is simple: breathe first, speak second, and never rush the ending.",
      "She closed the notebook, stood up, and gave a short, confident answer.",
      "I have been working on this for three weeks, and it is starting to feel natural.",
      "Most people think clarity is about volume, but it is really about finishing your thoughts.",
      "Let me put that better: the voice follows the mind, not the other way around.",
      "If I slow down on the important word, the whole sentence lands differently.",
      "I recorded myself today, and for once I did not want to skip the boring parts.",
    ],
    usesTTS: true,
    minutes: 10,
  },
  {
    id: "fluency",
    name: "Fluency",
    tagline: "Speak continuously",
    description: "Pick a topic. Think for 30 seconds, then speak nonstop for 2 minutes. Breath pauses are fine; stopping is not. Filler words are your enemy — use the silent beat.",
    topics: [
      "A habit you are trying to build right now.",
      "The best conversation you have had this month.",
      "A tool or app that makes your life better, and why.",
      "A small victory you almost didn't notice.",
      "What you would do with an extra two hours every day.",
      "A piece of advice you gave someone recently.",
      "The most interesting person you met this week.",
      "A problem you solved that you are quietly proud of.",
    ],
    usesTTS: false,
    minutes: 5,
  },
  {
    id: "pronunciation",
    name: "Pronunciation",
    tagline: "Difficult sounds & words",
    description: "Work through the word list: 3 slow reps, 3 normal, then the combos. Then record a full pass so you can check which words still blur.",
    words: [
      "ship / sheep", "light / right", "bat / bad", "full / food", "pull / pool",
      "think / sink", "this / zips", "father / farther", "vow / vow-ed",
      "Wednesday", "rhythm", "colonel", "necessary", "schedule", "environment", "vocabulary", "pronunciation",
    ],
    usesTTS: true,
    minutes: 8,
  },
  {
    id: "presentation",
    name: "Presentation",
    tagline: "Longer speeches",
    description: "Read the script once for accuracy, then deliver it as if there is an audience: standing, slow-down on the final line, eye on a point across the room. Record the delivery, not the read.",
    script: {
      title: "Why small daily practice wins",
      text: "I want to talk about a boring idea that changed my life: small, daily practice beats big, rare efforts. Think of the last skill you actually improved. It was not a weekend of heroics. It was twenty boring minutes, repeated for months, on days when motivation was not there. Speech works exactly the same way. A ten-minute session today is worth more than the two-hour panic session the night before a presentation, because the second one trains panic, while the first one trains the voice. Here is the practical version of this idea. First: make the session so small that skipping it feels strange. Ten minutes is not a burden; it is a ritual. Second: always record, even when you feel bad — the recording is the teacher, and the days you feel bad are exactly the days it teaches you most. Third: measure yourself against last month, never against a perfect stranger. One hundred words a day is six thousand words a month, which is a short speech's worth of growth, quietly. So the message today is simple: do not wait for a big moment to become a good speaker. The small daily minute is the big moment, and it is available to you right now, on the very next rep.",
    },
    usesTTS: true,
    minutes: 6,
  },
  {
    id: "reading",
    name: "Reading",
    tagline: "Passages with pacing",
    description: "Read aloud with pacing guidance. Pass 1: accuracy at a slow pace. Pass 2: your target pace with rhythm. Pass 3: performance. The WPM estimate after recording tells you where you actually landed.",
    passage:
      "There is a difference between reading a text and speaking one. Reading is a private act; your eyes do the work and your mind keeps score. Speaking is a public act; the words must leave your body on time, at a volume the room can catch, with enough breath behind each phrase to stay honest. The bridge between the two is paced reading: slow enough to pronounce every word completely, fast enough to stay connected, with breath planned at every natural break. Practice it for a few weeks and something quiet happens. When you switch to unscripted talk, the pacing stays with you. The breath stays planned. The important words still get the slow-down. The habit built on the page walks with you into the meeting, the dinner, and the moment the room suddenly turns to you and asks, “So — what do you think?”",
    paceGuidance: "Pass 1 @ 90 wpm · Pass 2 @ 120 wpm · Pass 3: your best, ~130 wpm with stress on key words.",
    usesTTS: true,
    minutes: 7,
  },
];

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  prompts: string[];
  rules: string[];
  minutes: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "interview",
    name: "Job Interview Simulation",
    tagline: "90-second STAR answers",
    description: "Answer each question out loud. 30s prep per question, 60–90s answers, STAR structure, zero fillers. Record the full run if you can — interview tape is the fastest way to improve.",
    prompts: [
      "Tell me about yourself. (60s, present → past → why here)",
      "Tell me about a challenge you overcame. (STAR, 90s)",
      "What is your biggest weakness? Be honest, then show what you do about it. (60s)",
      "Why should we hire you? (60s, narrow and checkable)",
      "Do you have any questions for us? (Ask one real one, out loud.)",
    ],
    rules: ["30s prep per question", "60–90s answers, then stop", "Pitch drops on conclusions"],
    minutes: 10,
  },
  {
    id: "casual",
    name: "Casual Conversation",
    tagline: "Low-stakes small talk",
    description: "Simulate relaxed back-and-forth: answer each prompt in 20–30 seconds like you are chatting, then move on. The goal is warmth and ease, not structure.",
    prompts: [
      "How was your weekend? (30s)",
      "What are you watching or reading lately? (30s)",
      "Any plans for the holiday? (30s)",
      "What's something new you tried this month? (30s)",
      "How do you usually relax after work? (30s)",
    ],
    rules: ["20–30s per answer", "Conversational pitch, some rising intonation", "Connect to the next question naturally"],
    minutes: 5,
  },
  {
    id: "storytelling",
    name: "Storytelling Practice",
    tagline: "3 minutes, clear turn",
    description: "Tell a story with a visible arc: scene → problem → turn → one-sentence point. The point lands AFTER the turn, with a half-second silence before it.",
    prompts: [
      "The time you were completely wrong about something.",
      "A trip that did not go as planned.",
      "The best meal you have had in the last year.",
      "A stranger who stuck in your memory.",
      "The day a plan fell apart and it worked out anyway.",
    ],
    rules: ["3 minutes max", "One sensory detail per 30s", "Silence before the point"],
    minutes: 8,
  },
  {
    id: "explaining",
    name: "Explain Simply",
    tagline: "Feynman mode",
    description: "Take a complicated topic and explain it as if to a smart 10-year-old. Ban list: jargon without instant plain translation, “essentially”, “basically”, “obviously”.",
    prompts: [
      "How does a password actually protect your account?",
      "How does a bank work?",
      "What is your job, in one short explanation?",
      "How does an engine turn fuel into motion?",
      "How do recommendation feeds decide what to show you?",
    ],
    rules: ["Only common words", "One concrete example", "3 minutes max"],
    minutes: 7,
  },
  {
    id: "debate",
    name: "Debate & Opinion",
    tagline: "Argue the other side",
    description: "Take a side — ideally one you disagree with — and argue it in structure: premise → two honest reasons → concede its weakest point. Calm tone, dropping pitch.",
    prompts: [
      "FOR: Cities should ban private cars from their centers.",
      "AGAINST: Everyone should work from home at least three days a week.",
      "FOR: Students should be paid to attend school.",
      "AGAINST: Social media does more good than harm.",
      "FOR: We should spend less on space exploration.",
    ],
    rules: ["90s per side", "Premise → reasons → concession", "Never raise pitch on a point"],
    minutes: 8,
  },
  {
    id: "impromptu",
    name: "Impromptu Challenge",
    tagline: "30s prep, no mercy",
    description: "A random topic drops in. You get 30 seconds. Then you speak for 90. This is pure nerve training — the most uncomfortable and most valuable mode here.",
    prompts: [
      "The color blue.", "A door.", "Patience.", "Your favorite smell.",
      "The year 2050.", "A bridge.", "Losing on purpose.", "Quiet.",
      "A recipe.", "The sound of rain.", "A good teacher.", "One extra hour.",
    ],
    rules: ["30s prep — no more", "90s delivery", "Zero fillers, silent beats only"],
    minutes: 5,
  },
];

export const SHADOW_SENTENCES = MODES.find((m) => m.id === "shadowing")!.sentences!;
