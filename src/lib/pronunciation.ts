import {
  SOUND_CATEGORY_LABELS,
  dateKey,
  uid,
  type BeforeAfterComparison,
  type CoachedExercise,
  type PersonalWord,
  type Recording,
  type SoundCategoryKey,
  type WeakComboFinding,
  type WeakSoundFinding,
  type WordAttempt,
  type WordMouthGuide,
  type WordStatus,
} from "./types";
import { getRecordingAssessment } from "./adaptiveCoach";

interface LexiconEntry {
  phonetic: string;
  ipa: string;
  meaning: string;
  example: string;
  mouth?: Partial<WordMouthGuide>;
  sounds?: SoundCategoryKey[];
}

const CURATED_LEXICON: Record<string, LexiconEntry> = {
  thorough: {
    phonetic: "THUR-oh",
    ipa: "/ˈθɜːr.oʊ/",
    meaning: "Complete, careful, and paying attention to every detail.",
    example: "She did a thorough check of the audio levels before recording.",
    sounds: ["th", "r", "vowels"],
    mouth: {
      tongue: "Start with the tongue tip lightly between your front teeth for /θ/, then pull it back and bunch the middle up for /ɜːr/.",
      lips: "Keep lips relaxed on TH, round gently on the R vowel, then glide into a small round O at the end.",
      mouthAirflow: "Release a quiet steady hiss of air over the tongue tip on TH — never turn it into a hard T.",
    },
  },
  through: {
    phonetic: "THROO",
    ipa: "/θruː/",
    meaning: "Moving in one side and out the other; from start to finish.",
    example: "Take one calm breath and glide smoothly through the sentence.",
    sounds: ["th", "r", "clusters"],
  },
  thought: {
    phonetic: "THAWT",
    ipa: "/θɔːt/",
    meaning: "An idea or opinion produced by thinking.",
    example: "Pause for half a second before sharing your main thought.",
    sounds: ["th", "endings"],
  },
  three: {
    phonetic: "THREE",
    ipa: "/θriː/",
    meaning: "The number 3.",
    example: "We will focus on three clear steps in today's video.",
    sounds: ["th", "r", "clusters"],
  },
  thirty: {
    phonetic: "THUR-tee",
    ipa: "/ˈθɜːr.ti/",
    meaning: "The number 30.",
    example: "Thirty days of calm daily practice builds real vocal control.",
    sounds: ["th", "r"],
  },
  threshold: {
    phonetic: "THRESH-ohld",
    ipa: "/ˈθreʃ.hoʊld/",
    meaning: "The starting point or level at which something begins.",
    example: "Cross the threshold with steady breathing and an easy start.",
    sounds: ["th", "r", "s_sh", "l", "clusters", "endings"],
  },
  rural: {
    phonetic: "ROOR-uhl",
    ipa: "/ˈrʊr.əl/",
    meaning: "Relating to the countryside rather than a city.",
    example: "The documentary filmed interviews across quiet rural towns.",
    sounds: ["r", "l"],
    mouth: {
      tongue: "Bunch the tongue back without touching the roof for the two R sounds, then lift just the tip firmly behind the top teeth for the final L.",
      lips: "Round lips softly for the opening R, then relax them cleanly before the final L.",
      mouthAirflow: "Keep your jaw open slightly and resist letting the two Rs collapse into a single mumbled syllable.",
    },
  },
  literally: {
    phonetic: "LIT-er-uh-lee",
    ipa: "/ˈlɪt.ər.ə.li/",
    meaning: "In an exact, factual manner without exaggeration.",
    example: "Slowing down by ten percent literally transforms your clarity.",
    sounds: ["l", "r", "vowels"],
  },
  particularly: {
    phonetic: "par-TIK-yuh-ler-lee",
    ipa: "/pərˈtɪk.jə.lər.li/",
    meaning: "Especially; to a higher degree than usual.",
    example: "Light lip contact is particularly helpful on P and B words.",
    sounds: ["r", "l", "p_b_t_d", "vowels"],
  },
  specifically: {
    phonetic: "spuh-SIF-ik-lee",
    ipa: "/spəˈsɪf.ɪk.li/",
    meaning: "In a clear, exact, and clearly defined way.",
    example: "This drill was designed specifically for tricky consonant clusters.",
    sounds: ["s_sh", "clusters", "l"],
  },
  regularly: {
    phonetic: "REG-yuh-ler-lee",
    ipa: "/ˈreɡ.jə.lər.li/",
    meaning: "At consistent, repeated intervals.",
    example: "Practicing regularly for ten minutes beats cramming once a week.",
    sounds: ["r", "l", "vowels"],
  },
  comfortable: {
    phonetic: "KUMF-ter-buhl",
    ipa: "/ˈkʌmf.tər.bəl/",
    meaning: "Physically relaxed and free from tension or awkwardness.",
    example: "Find a comfortable pace before hitting record on your camera.",
    sounds: ["clusters", "r", "l"],
  },
  vegetable: {
    phonetic: "VEJ-tuh-buhl",
    ipa: "/ˈvedʒ.tə.bəl/",
    meaning: "A plant or part of a plant used as food.",
    example: "Add one fresh green vegetable to your lunch every day.",
    sounds: ["v_w", "l", "vowels"],
  },
  february: {
    phonetic: "FEB-yoo-air-ee",
    ipa: "/ˈfeb.ju.er.i/",
    meaning: "The second month of the year.",
    example: "Our new video series launches on the first Monday of February.",
    sounds: ["r", "p_b_t_d", "vowels"],
  },
  library: {
    phonetic: "LY-brair-ee",
    ipa: "/ˈlaɪ.brer.i/",
    meaning: "A collection of books, media, or saved practice materials.",
    example: "Save every tricky word into your personal library for review.",
    sounds: ["l", "r", "clusters"],
  },
  pronunciation: {
    phonetic: "pruh-NUN-see-AY-shun",
    ipa: "/prəˌnʌn.siˈeɪ.ʃən/",
    meaning: "The way in which a word or sound is spoken clearly.",
    example: "Note the middle syllable 'nun'—not 'noun'—in pronunciation.",
    sounds: ["r", "s_sh", "clusters", "vowels"],
  },
  schedule: {
    phonetic: "SKEJ-ool",
    ipa: "/ˈskedʒ.uːl/",
    meaning: "A plan of tasks or events arranged by time.",
    example: "Stick to a simple fifteen-minute daily practice schedule.",
    sounds: ["s_sh", "clusters", "l"],
  },
  squirrel: {
    phonetic: "SKWUR-uhl",
    ipa: "/ˈskwɜːr.əl/",
    meaning: "A nimble tree-dwelling rodent with a bushy tail.",
    example: "A grey squirrel paused right outside the studio window.",
    sounds: ["clusters", "r", "l", "v_w"],
  },
  world: {
    phonetic: "WURLD",
    ipa: "/wɜːrld/",
    meaning: "The earth and all the people and places on it.",
    example: "Clear speaking opens doors anywhere in the world.",
    sounds: ["v_w", "r", "l", "clusters", "endings"],
    mouth: {
      tongue: "Pull back for R, smoothly flick the tip up to the ridge behind your top teeth for L, then tap cleanly off for D.",
      lips: "Start with tight rounded lips for W, open slightly for R, then keep lips relaxed on LD.",
      mouthAirflow: "Give the R→L→D sequence full time — rushing turns 'world' into 'word'.",
    },
  },
  girl: {
    phonetic: "GURL",
    ipa: "/ɡɜːrl/",
    meaning: "A young female person.",
    example: "The girl narrated the entire story with calm vocal clarity.",
    sounds: ["r", "l", "clusters"],
  },
  clothes: {
    phonetic: "KLOHZ",
    ipa: "/kloʊz/",
    meaning: "Items worn to cover the body; garments.",
    example: "Most natural speakers pronounce clothes identically to 'close'.",
    sounds: ["l", "th", "clusters", "endings"],
  },
  months: {
    phonetic: "MUNTHS",
    ipa: "/mʌnθs/",
    meaning: "Plural of month; periods of roughly thirty days.",
    example: "Small daily gains compound fast over just a few months.",
    sounds: ["th", "clusters", "endings"],
  },
  sixths: {
    phonetic: "SIKSTHS",
    ipa: "/sɪksθs/",
    meaning: "Six equal parts of a whole.",
    example: "Break the consonant cluster in sixths slowly: siks-ths.",
    sounds: ["th", "s_sh", "clusters", "endings"],
  },
  strengths: {
    phonetic: "STRENGKTHS",
    ipa: "/streŋθs/",
    meaning: "Qualities or skills at which someone excels.",
    example: "Track both your vocal strengths and your remaining weak sounds.",
    sounds: ["th", "r", "s_sh", "clusters", "endings"],
  },
  statistics: {
    phonetic: "stuh-TIS-tiks",
    ipa: "/stəˈtɪs.tɪks/",
    meaning: "Numerical data collected and analyzed for insights.",
    example: "Present key statistics slowly so viewers actually remember them.",
    sounds: ["s_sh", "clusters", "endings"],
  },
  entrepreneur: {
    phonetic: "on-truh-pruh-NUR",
    ipa: "/ˌɑːn.trə.prəˈnɜːr/",
    meaning: "A person who starts and runs a business or creative venture.",
    example: "Every creator and entrepreneur benefits from crisp speaking.",
    sounds: ["r", "clusters", "p_b_t_d", "vowels"],
  },
  phenomenon: {
    phonetic: "fuh-NOM-uh-non",
    ipa: "/fəˈnɑː.mə.nɑːn/",
    meaning: "A remarkable event, fact, or observable situation.",
    example: "Audience retention is a fascinating phenomenon to study.",
    sounds: ["vowels"],
  },
  subtle: {
    phonetic: "SUT-uhl",
    ipa: "/ˈsʌt.əl/",
    meaning: "Delicate, understated, or not immediately obvious (silent B).",
    example: "A subtle half-second pause adds instant weight to your point.",
    sounds: ["s_sh", "l", "p_b_t_d"],
  },
  debt: {
    phonetic: "DET",
    ipa: "/det/",
    meaning: "Something owed, especially money (silent B).",
    example: "Notice the silent B—pronounce debt with a light D and crisp final T.",
    sounds: ["p_b_t_d", "endings"],
  },
  receipt: {
    phonetic: "ri-SEET",
    ipa: "/rɪˈsiːt/",
    meaning: "A written record confirming payment was received (silent P).",
    example: "Keep the P silent and finish receipt with a light crisp T.",
    sounds: ["r", "s_sh", "endings"],
  },
  choir: {
    phonetic: "KWY-er",
    ipa: "/ˈkwaɪ.ər/",
    meaning: "An organized group of singers.",
    example: "The choir warmed up with gentle resonant humming.",
    sounds: ["v_w", "r", "clusters"],
  },
  chaos: {
    phonetic: "KAY-os",
    ipa: "/ˈkeɪ.ɑːs/",
    meaning: "Complete disorder and confusion.",
    example: "Calm pacing brings order even when the schedule feels like chaos.",
    sounds: ["s_sh", "vowels"],
  },
  archive: {
    phonetic: "AR-kyv",
    ipa: "/ˈɑːr.kaɪv/",
    meaning: "A stored collection of past records or recordings.",
    example: "Your before-and-after archive proves how much your voice improved.",
    sounds: ["r", "v_w", "endings"],
  },
  hierarchy: {
    phonetic: "HY-er-ar-kee",
    ipa: "/ˈhaɪ.ə.rɑːr.ki/",
    meaning: "A system ranking items or roles by level of importance.",
    example: "Organize your video points in a clear hierarchy of value.",
    sounds: ["r", "vowels"],
  },
  breathe: {
    phonetic: "BREETH",
    ipa: "/briːð/",
    meaning: "Verb: to draw air into the lungs and release it (voiced TH).",
    example: "Pause at the comma and breathe quietly through your nose.",
    sounds: ["th", "r", "clusters", "endings"],
  },
  breath: {
    phonetic: "BRETH",
    ipa: "/breθ/",
    meaning: "Noun: the air taken into or expelled from the lungs (voiceless TH).",
    example: "Start each phrase on a relaxed, supported outgoing breath.",
    sounds: ["th", "r", "clusters", "endings"],
  },
  whether: {
    phonetic: "WETH-er",
    ipa: "/ˈweð.ər/",
    meaning: "Expressing a choice or doubt between alternatives.",
    example: "Whether you script or improvise, steady pacing wins viewers.",
    sounds: ["v_w", "th", "r"],
  },
  weather: {
    phonetic: "WETH-er",
    ipa: "/ˈweð.ər/",
    meaning: "The state of the atmosphere (rain, sun, wind, temperature).",
    example: "Check the weather before filming an outdoor vlog.",
    sounds: ["v_w", "th", "r"],
  },
  rhythm: {
    phonetic: "RITH-um",
    ipa: "/ˈrɪð.əm/",
    meaning: "A strong, regular repeated pattern of movement or speech.",
    example: "A steady rhythm helps prevent rushed words and vocal blocks.",
    sounds: ["r", "th"],
  },
  algorithm: {
    phonetic: "AL-guh-rith-um",
    ipa: "/ˈæl.ɡə.rɪð.əm/",
    meaning: "A step-by-step set of rules used to solve a problem or rank content.",
    example: "Clear hooks keep viewers watching—and that helps the algorithm.",
    sounds: ["l", "r", "th"],
  },
  camera: {
    phonetic: "KAM-ruh",
    ipa: "/ˈkæm.rə/",
    meaning: "A device for capturing photographs or video.",
    example: "Speak to the camera lens as if helping one close friend.",
    sounds: ["p_b_t_d", "r"],
  },
  confidence: {
    phonetic: "KON-fi-duhns",
    ipa: "/ˈkɑːn.fɪ.dəns/",
    meaning: "A calm belief in your ability to communicate clearly.",
    example: "Real confidence comes from calm preparation, not perfection.",
    sounds: ["p_b_t_d", "endings", "vowels"],
  },
  articulation: {
    phonetic: "ar-TIK-yoo-LAY-shun",
    ipa: "/ɑːrˌtɪk.jəˈleɪ.ʃən/",
    meaning: "The clear, distinct formation of speech sounds.",
    example: "Crisp articulation makes your voice stand out on any microphone.",
    sounds: ["r", "l", "s_sh", "vowels"],
  },
  fluency: {
    phonetic: "FLOO-uhn-see",
    ipa: "/ˈfluː.ən.si/",
    meaning: "The ability to speak smoothly and continuously with ease.",
    example: "Gentle starts and steady airflow steadily build real fluency.",
    sounds: ["l", "clusters", "s_sh"],
  },
  strategy: {
    phonetic: "STRAT-uh-jee",
    ipa: "/ˈstræt.ə.dʒi/",
    meaning: "A thoughtful plan of action designed to achieve a goal.",
    example: "Explain your strategy in three short, concrete steps.",
    sounds: ["s_sh", "r", "clusters"],
  },
  structure: {
    phonetic: "STRUK-cher",
    ipa: "/ˈstrʌk.tʃər/",
    meaning: "The organized arrangement of parts or ideas.",
    example: "A simple three-part structure removes anxiety on camera.",
    sounds: ["s_sh", "r", "clusters"],
  },
  subscribe: {
    phonetic: "sub-SKRYB",
    ipa: "/səbˈskraɪb/",
    meaning: "To follow a creator or channel regularly.",
    example: "If this breakdown helped you, feel free to subscribe for weekly tips.",
    sounds: ["s_sh", "r", "clusters", "p_b_t_d", "endings"],
  },
  whisper: {
    phonetic: "WIS-per",
    ipa: "/ˈwɪs.pər/",
    meaning: "To speak very softly using breath without full vocal fold vibration.",
    example: "Start the syllable almost like a gentle whisper before adding tone.",
    sounds: ["v_w", "s_sh", "p_b_t_d", "r"],
  },
  shoulder: {
    phonetic: "SHOHL-der",
    ipa: "/ˈʃoʊl.dər/",
    meaning: "The upper joint connecting the arm and neck.",
    example: "Drop your shoulders before speaking to release throat tension.",
    sounds: ["s_sh", "l", "r"],
  },
  shadow: {
    phonetic: "SHAD-oh",
    ipa: "/ˈʃæd.oʊ/",
    meaning: "To closely follow and echo a model speaker's rhythm.",
    example: "Shadow the slow audio model twice before recording at full speed.",
    sounds: ["s_sh", "p_b_t_d"],
  },
  probably: {
    phonetic: "PROB-uh-blee",
    ipa: "/ˈprɑː.bə.bli/",
    meaning: "Almost certainly; very likely.",
    example: "Slowing down slightly will probably feel slower to you than to listeners.",
    sounds: ["p_b_t_d", "r", "l", "clusters"],
  },
  definitely: {
    phonetic: "DEF-uh-nit-lee",
    ipa: "/ˈdef.ə.nət.li/",
    meaning: "Without doubt; clearly and certainly.",
    example: "Give every syllable clean air so definitely never blurs.",
    sounds: ["l", "vowels"],
  },
  actually: {
    phonetic: "AK-choo-uh-lee",
    ipa: "/ˈæk.tʃu.ə.li/",
    meaning: "In truth or reality.",
    example: "Viewers actually prefer calm, clear delivery over fast talking.",
    sounds: ["s_sh", "l", "clusters"],
  },
  usually: {
    phonetic: "YOO-zhoo-uh-lee",
    ipa: "/ˈjuː.ʒu.ə.li/",
    meaning: "Under normal conditions; most of the time.",
    example: "Hard blocks usually happen when we rush the very first syllable.",
    sounds: ["s_sh", "l", "vowels"],
  },
  especially: {
    phonetic: "ih-SPESH-uh-lee",
    ipa: "/ɪˈspeʃ.əl.i/",
    meaning: "Above all; particularly.",
    example: "Keep your jaw relaxed, especially at the start of a new thought.",
    sounds: ["s_sh", "clusters", "l"],
  },
  necessary: {
    phonetic: "NES-uh-ser-ee",
    ipa: "/ˈnes.ə.ser.i/",
    meaning: "Essential or required.",
    example: "Cut unnecessary filler words by pausing silently for one beat.",
    sounds: ["s_sh", "r", "vowels"],
  },
  environment: {
    phonetic: "en-VY-ruhn-muhnt",
    ipa: "/ɪnˈvaɪ.rən.mənt/",
    meaning: "The surroundings or conditions in which someone operates.",
    example: "Record in a quiet environment with minimal room echo.",
    sounds: ["v_w", "r", "endings", "vowels"],
  },
  government: {
    phonetic: "GUV-ern-muhnt",
    ipa: "/ˈɡʌv.ərn.mənt/",
    meaning: "The governing body of a nation or community.",
    example: "Release the final T lightly when saying government in formal talks.",
    sounds: ["v_w", "r", "endings"],
  },
  different: {
    phonetic: "DIF-ruhnt",
    ipa: "/ˈdɪf.rənt/",
    meaning: "Not the same; distinct.",
    example: "Try two different tempos and listen back to which sounds calmer.",
    sounds: ["r", "clusters", "endings"],
  },
  parallel: {
    phonetic: "PAIR-uh-lel",
    ipa: "/ˈpær.ə.lel/",
    meaning: "Side by side with the same distance continuously between them.",
    example: "Keep R and L distinct across the syllables of parallel.",
    sounds: ["p_b_t_d", "r", "l"],
  },
  vulnerable: {
    phonetic: "VUL-ner-uh-buhl",
    ipa: "/ˈvʌl.nər.ə.bəl/",
    meaning: "Open to emotion, honesty, or risk.",
    example: "Sharing an honest story makes your channel feel authentic and human.",
    sounds: ["v_w", "l", "r"],
  },
  authentic: {
    phonetic: "aw-THEN-tik",
    ipa: "/ɔːˈθen.tɪk/",
    meaning: "Genuine, real, and true to yourself.",
    example: "An authentic, unhurried voice connects better than a scripted radio voice.",
    sounds: ["th", "endings"],
  },
  authority: {
    phonetic: "uh-THOR-uh-tee",
    ipa: "/əˈθɔːr.ə.ti/",
    meaning: "Quiet credibility and command of a subject.",
    example: "Ending statements with a slight downward pitch conveys calm authority.",
    sounds: ["th", "r", "vowels"],
  },
  enthusiastic: {
    phonetic: "en-thoo-zee-AS-tik",
    ipa: "/ɪnˌθuː.ziˈæs.tɪk/",
    meaning: "Showing warm, lively interest and energy.",
    example: "Sound enthusiastic through pitch variety rather than speaking faster.",
    sounds: ["th", "s_sh", "clusters", "endings"],
  },
  opportunity: {
    phonetic: "op-er-TOO-nuh-tee",
    ipa: "/ˌɑː.pərˈtuː.nə.ti/",
    meaning: "A favorable time or chance for action.",
    example: "Every recorded take is an opportunity to hear real progress.",
    sounds: ["p_b_t_d", "r", "vowels"],
  },
  communication: {
    phonetic: "kuh-myoo-nuh-KAY-shun",
    ipa: "/kəˌmjuː.nɪˈkeɪ.ʃən/",
    meaning: "Sharing ideas clearly so another person truly understands.",
    example: "Great communication is built on clarity, warmth, and timing.",
    sounds: ["p_b_t_d", "s_sh", "vowels"],
  },
  responsibility: {
    phonetic: "ri-spon-suh-BIL-uh-tee",
    ipa: "/rɪˌspɑːn.səˈbɪl.ə.ti/",
    meaning: "Accountability or ownership over a task.",
    example: "Break long words like responsibility into clean, evenly spaced beats.",
    sounds: ["r", "s_sh", "clusters", "l", "vowels"],
  },
  psychology: {
    phonetic: "sy-KOL-uh-jee",
    ipa: "/saɪˈkɑː.lə.dʒi/",
    meaning: "The study of mind, emotion, and human behavior (silent P).",
    example: "Understanding the psychology of camera nerves lowers tension fast.",
    sounds: ["s_sh", "l", "vowels"],
  },
  technology: {
    phonetic: "tek-NOL-uh-jee",
    ipa: "/tekˈnɑː.lə.dʒi/",
    meaning: "Tools and scientific methods applied to practical problems.",
    example: "Explain complex technology using short, everyday sentences.",
    sounds: ["p_b_t_d", "l", "vowels"],
  },
  immediately: {
    phonetic: "ih-MEE-dee-uht-lee",
    ipa: "/ɪˈmiː.di.ət.li/",
    meaning: "Right away, without delay.",
    example: "When you feel throat tension, drop your shoulders immediately.",
    sounds: ["l", "vowels"],
  },
  consistently: {
    phonetic: "kuhn-SIS-tuhnt-lee",
    ipa: "/kənˈsɪs.tənt.li/",
    meaning: "Steadily in the same reliable way over time.",
    example: "Mastery happens when you pronounce a tricky word cleanly and consistently.",
    sounds: ["s_sh", "clusters", "l"],
  },
  presentation: {
    phonetic: "prez-uhn-TAY-shun",
    ipa: "/ˌprez.ənˈteɪ.ʃən/",
    meaning: "A structured talk or demonstration shared with an audience.",
    example: "Open your presentation with a calm breath and one clear sentence.",
    sounds: ["p_b_t_d", "r", "s_sh", "clusters"],
  },
  development: {
    phonetic: "di-VEL-uhp-muhnt",
    ipa: "/dɪˈvel.əp.mənt/",
    meaning: "Steady growth, progress, or building over time.",
    example: "Track your vocal development week by week in the Progress tab.",
    sounds: ["v_w", "l", "p_b_t_d", "endings"],
  },
  particular: {
    phonetic: "par-TIK-yuh-ler",
    ipa: "/pərˈtɪk.jə.lər/",
    meaning: "Specific; singled out from others.",
    example: "Focus on one particular weak sound per practice session.",
    sounds: ["p_b_t_d", "r", "l"],
  },
  literally_alt: {
    phonetic: "LIT-ruh-lee",
    ipa: "/ˈlɪt.rə.li/",
    meaning: "Colloquial 3-syllable pronunciation of literally.",
    example: "Say LIT-er-uh-lee slowly first so the R and L stay distinct.",
    sounds: ["l", "r"],
  },
  focus: {
    phonetic: "FOH-kus",
    ipa: "/ˈfoʊ.kəs/",
    meaning: "Centered attention on one clear goal.",
    example: "Keep your focus on smooth airflow rather than worrying about perfection.",
    sounds: ["s_sh", "vowels"],
  },
  success: {
    phonetic: "suhk-SES",
    ipa: "/səkˈses/",
    meaning: "Achieving a desired aim through consistent effort.",
    example: "Pronounce the K clearly before the second S: suhk-SES.",
    sounds: ["s_sh", "clusters"],
  },
  scratch: {
    phonetic: "SKRACH",
    ipa: "/skrætʃ/",
    meaning: "Starting from the very beginning; a sharp scrape.",
    example: "Build your daily fluency routine from scratch with gentle starts.",
    sounds: ["s_sh", "r", "clusters"],
  },
  script: {
    phonetic: "SKRIPT",
    ipa: "/skrɪpt/",
    meaning: "Written text prepared to guide a video or speech.",
    example: "Use bullet points instead of a rigid word-for-word script on camera.",
    sounds: ["s_sh", "r", "clusters", "endings"],
  },
  stammer: {
    phonetic: "STAM-er",
    ipa: "/ˈstæm.ər/",
    meaning: "To experience speech blocks, prolongations, or sound repetitions.",
    example: "Gentle voice starts and calm pauses help soften moments when you stammer.",
    sounds: ["s_sh", "clusters", "r"],
  },
  voice: {
    phonetic: "VOYS",
    ipa: "/vɔɪs/",
    meaning: "The sound produced when speaking; personal expression.",
    example: "Touch your top teeth lightly to your lower lip for a warm V in voice.",
    sounds: ["v_w", "s_sh"],
  },
  video: {
    phonetic: "VID-ee-oh",
    ipa: "/ˈvɪd.i.oʊ/",
    meaning: "Recorded moving visual and audio content.",
    example: "Before recording your YouTube video, do three slow 3-4-6 breaths.",
    sounds: ["v_w", "vowels"],
  },
  viewer: {
    phonetic: "VYOO-er",
    ipa: "/ˈvjuː.ər/",
    meaning: "A person watching your video or presentation.",
    example: "Look directly into the lens so every viewer feels included.",
    sounds: ["v_w", "r"],
  },
};

export function normalizeWord(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z'-]+$/g, "")
    .replace(/\s+/g, " ");
}

export function displayWordCase(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned;
}

/**
 * Detects recurring English articulation categories present in a word.
 */
export function detectSoundCategories(word: string): SoundCategoryKey[] {
  const w = normalizeWord(word);
  if (!w) return ["vowels"];
  const found = new Set<SoundCategoryKey>();

  if (/th/.test(w)) found.add("th");
  if (/r/.test(w)) found.add("r");
  if (/l/.test(w)) found.add("l");
  if (/(sh|ch|tion|sion|ss|sc|s)/.test(w)) found.add("s_sh");
  if (/(v|w)/.test(w)) found.add("v_w");
  if (/^[pbtdkg]/.test(w) || /(pp|bb|tt|dd|kk|gg)/.test(w)) found.add("p_b_t_d");
  if (/(str|spr|spl|scr|thr|shr|sts|sks|ths|rld|ntl|tr|dr|pr|br|cr|gr|fr|pl|bl|cl|gl|fl|ct|pt|st|sp|sk)/.test(w)) {
    found.add("clusters");
  }
  if (/(ed|ts|ds|ks|ps|st|nd|ld|nt|th|pt|ct|k|t|d|p)$/.test(w) && w.length >= 4) {
    found.add("endings");
  }
  if (found.size === 0 || /(ough|igh|eau|ae|ie|ei|oo|ou)/.test(w) || w.length >= 9) {
    found.add("vowels");
  }
  return [...found];
}

const SOUND_PLACEMENT_CUES: Record<SoundCategoryKey, WordMouthGuide> = {
  th: {
    tongue: "Place the very tip of your tongue lightly between your upper and lower front teeth (visible in a mirror) — never press it hard behind the teeth like T/D.",
    lips: "Keep your lips relaxed and slightly parted so they do not interfere with the tongue tip.",
    mouthAirflow: "Let a smooth, gentle stream of air flow over the tongue tip before pulling back into the next vowel.",
  },
  r: {
    tongue: "Bunch the middle/back of your tongue slightly upward (or curl the tip gently back) WITHOUT letting the tongue tip touch the roof of your mouth.",
    lips: "Round and gently protrude your lips slightly — lip rounding helps stabilize a clean /ɹ/.",
    mouthAirflow: "Keep your jaw relaxed and hold steady voiced airflow while gliding cleanly into the vowel.",
  },
  l: {
    tongue: "Lift the front tongue tip cleanly onto the bony ridge just behind your upper front teeth (alveolar ridge) so air escapes along both sides of the tongue.",
    lips: "Keep lips neutral and relaxed — avoid rounding them into a W sound.",
    mouthAirflow: "Hold the tongue contact gently for a split second on final dark-L words so the ending never disappears.",
  },
  s_sh: {
    tongue: "For /s/, keep the tongue tip close behind the top teeth with a narrow central air groove; for /ʃ/ (SH), slide the tongue blade slightly farther back.",
    lips: "Spread lips lightly for crisp /s/, and gently round/protrude lips forward for warm /ʃ/ (SH) and /tʃ/ (CH).",
    mouthAirflow: "Use focused, steady friction air — avoid biting down tightly or forcing loud breath bursts.",
  },
  v_w: {
    tongue: "Keep your tongue neutral and low in the mouth so it doesn't crowd the front consonants.",
    lips: "For /v/, lightly touch your upper front teeth to your lower lip and buzz; for /w/, form a tight small circle with both lips (no teeth contact).",
    mouthAirflow: "Feel a gentle vibration on your lower lip for V; glide smoothly out of rounded lips for W.",
  },
  p_b_t_d: {
    tongue: "For T/D tap the ridge behind the top teeth lightly; for K/G lift the back of the tongue softly against the soft palate.",
    lips: "For P/B use Light Articulatory Contact — barely brush your lips at ~30% pressure instead of clamping tightly.",
    mouthAirflow: "Release on a soft outgoing exhale (gentle onset) to prevent hard blocks or popped microphone plosives.",
  },
  clusters: {
    tongue: "Articulate each consonant in the cluster in sequence at slow speed first — avoid deleting the middle consonant.",
    lips: "Transition smoothly from the first lip shape to the second without pausing or inserting an extra 'uh' vowel between them.",
    mouthAirflow: "Keep continuous airflow running through the whole cluster on one steady breath.",
  },
  endings: {
    tongue: "Complete the final tongue tap or position clearly before closing your mouth or moving to the next word.",
    lips: "Finish the final lip closure/release cleanly without swallowing the last syllable.",
    mouthAirflow: "Give the final consonant a light, audible release of air (~20% crispness, not exaggerated).",
  },
  vowels: {
    tongue: "Shape each stressed vowel with clear tongue height and hold it slightly longer than unstressed syllables.",
    lips: "Open your mouth comfortably on stressed open vowels (ah/oh/aw) and spread lightly on front vowels (ee/ay).",
    mouthAirflow: "Keep an open throat, dropped jaw, and smooth forward resonance across multi-syllable words.",
  },
};

function splitSimpleSyllables(word: string): string[] {
  const clean = normalizeWord(word).replace(/[^a-z]/g, "");
  if (clean.length <= 4) return [clean];
  // Split smoothly into readable CV/CVC phonetic chunks
  const parts = clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))*/gi);
  if (!parts || parts.length === 0) return [clean];
  return parts;
}

function estimatePhoneticAndIpa(word: string): { phonetic: string; ipa: string } {
  const chunks = splitSimpleSyllables(word);
  const respelled = chunks
    .map((c, i) => {
      let s = c
        .replace(/tion$/i, "shun")
        .replace(/sion$/i, "zhun")
        .replace(/ph/gi, "f")
        .replace(/ck/gi, "k")
        .replace(/qu/gi, "kw")
        .replace(/ee/gi, "ee")
        .replace(/oo/gi, "oo")
        .replace(/igh/gi, "y");
      // Primary stress hint: first syllable for 2-syllable words, second-to-last for longer -tion/-ic words
      const stressIdx =
        chunks.length === 1
          ? 0
          : /shun|zhun|ik$/i.test(chunks[chunks.length - 1]) && chunks.length >= 2
          ? Math.max(0, chunks.length - 2)
          : 0;
      if (i === stressIdx && chunks.length > 1) s = s.toUpperCase();
      return s;
    })
    .join("-");

  const roughIpa = normalizeWord(word)
    .replace(/tion$/g, "ʃən")
    .replace(/sion$/g, "ʒən")
    .replace(/th/g, "θ")
    .replace(/sh/g, "ʃ")
    .replace(/ch/g, "tʃ")
    .replace(/ph/g, "f")
    .replace(/ng/g, "ŋ")
    .replace(/ee|ea/g, "iː")
    .replace(/oo/g, "uː")
    .replace(/r/g, "ɹ");

  return {
    phonetic: respelled || word,
    ipa: `/${roughIpa}/`,
  };
}

/**
 * Builds complete pronunciation metadata (phonetics, IPA, meaning, example sentence,
 * anatomical mouth guide, and sound categories) for any word.
 */
export function analyzeWordEntry(rawWord: string): {
  word: string;
  normalized: string;
  phonetic: string;
  ipa: string;
  ipaSource: "dictionary" | "estimated";
  meaning: string;
  exampleSentence: string;
  mouthGuide: WordMouthGuide;
  soundTags: SoundCategoryKey[];
} {
  const display = displayWordCase(rawWord);
  const normalized = normalizeWord(rawWord);
  const lex = CURATED_LEXICON[normalized];
  const sounds = lex?.sounds ?? detectSoundCategories(normalized);
  const primarySound = sounds[0] ?? "vowels";
  const baseGuide = SOUND_PLACEMENT_CUES[primarySound];

  if (lex) {
    return {
      word: display,
      normalized,
      phonetic: lex.phonetic,
      ipa: lex.ipa,
      ipaSource: "dictionary",
      meaning: lex.meaning,
      exampleSentence: lex.example,
      mouthGuide: {
        tongue: lex.mouth?.tongue ?? baseGuide.tongue,
        lips: lex.mouth?.lips ?? baseGuide.lips,
        mouthAirflow: lex.mouth?.mouthAirflow ?? baseGuide.mouthAirflow,
      },
      soundTags: sounds,
    };
  }

  const est = estimatePhoneticAndIpa(display);
  const soundNames = sounds.slice(0, 2).map((s) => SOUND_CATEGORY_LABELS[s].short).join(" & ");
  return {
    word: display,
    normalized,
    phonetic: est.phonetic,
    ipa: est.ipa,
    ipaSource: "estimated",
    meaning: `Personal focus word targeting ${soundNames || "clear articulation"} (click Edit anytime to add your own definition).`,
    exampleSentence: `Take a calm breath and say "${display}" slowly and clearly in conversation.`,
    mouthGuide: {
      tongue: baseGuide.tongue,
      lips: baseGuide.lips,
      mouthAirflow: baseGuide.mouthAirflow,
    },
    soundTags: sounds,
  };
}

export function createPersonalWord(
  rawWord: string,
  opts?: {
    status?: WordStatus;
    source?: PersonalWord["source"];
    phonetic?: string;
    ipa?: string;
    meaning?: string;
    exampleSentence?: string;
    notes?: string;
    mouthGuide?: Partial<WordMouthGuide>;
  }
): PersonalWord {
  const analyzed = analyzeWordEntry(rawWord);
  const now = Date.now();
  return {
    id: uid(),
    word: analyzed.word,
    normalized: analyzed.normalized,
    status: opts?.status ?? "difficult",
    phonetic: opts?.phonetic?.trim() || analyzed.phonetic,
    ipa: opts?.ipa?.trim() || analyzed.ipa,
    ipaSource: opts?.ipa?.trim() && opts.ipa.trim() !== analyzed.ipa ? "custom" : analyzed.ipaSource,
    meaning: opts?.meaning?.trim() || analyzed.meaning,
    exampleSentence: opts?.exampleSentence?.trim() || analyzed.exampleSentence,
    mouthGuide: {
      tongue: opts?.mouthGuide?.tongue?.trim() || analyzed.mouthGuide.tongue,
      lips: opts?.mouthGuide?.lips?.trim() || analyzed.mouthGuide.lips,
      mouthAirflow: opts?.mouthGuide?.mouthAirflow?.trim() || analyzed.mouthGuide.mouthAirflow,
    },
    soundTags: analyzed.soundTags,
    source: opts?.source ?? "manual",
    notes: opts?.notes?.trim() || undefined,
    attempts: [],
    masteryScore: 0,
    consecutiveSuccessDays: 0,
    intervalDays: 1,
    nextReviewAt: now, // due right away for initial practice
    lastPracticedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- Honest Pronunciation Evaluation & Similarity ----------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function tokenSimilarityPct(target: string, candidate: string): number {
  const a = normalizeWord(target);
  const b = normalizeWord(candidate);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const dist = levenshtein(a, b);
  return Math.max(0, Math.round((1 - dist / Math.max(a.length, b.length)) * 100));
}

/**
 * Evaluates a word practice attempt transparently and deterministically.
 * Never fabricates phoneme accuracy: clearly separates objective STT match from
 * user listening self-check, capping STT-only scores at 85/100 until ear-verified.
 */
export function evaluateWordAttempt(params: {
  word: PersonalWord;
  transcript: string;
  speedMode: "slow" | "natural";
  selfScore: number | null; // 1..5
  recordingId?: string | null;
  nowMs?: number;
}): WordAttempt {
  const { word, transcript, speedMode, selfScore, recordingId } = params;
  const now = params.nowMs ?? Date.now();
  const cleanTranscript = transcript.trim();
  const tokens = cleanTranscript
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const target = word.normalized;
  let bestWordSim = 0;
  let matchedWord = false;
  let closestHeard = "";

  for (const tok of tokens) {
    const sim = tokenSimilarityPct(target, tok);
    if (sim > bestWordSim) {
      bestWordSim = sim;
      closestHeard = tok;
    }
    if (tok === target || tok === `${target}s` || tok === `${target}d` || tok === `${target}ed`) {
      matchedWord = true;
      bestWordSim = 100;
      closestHeard = tok;
      break;
    }
  }

  // When practicing natural-speed example sentence, also evaluate sentence word coverage lightly
  let sentenceBonusSim = bestWordSim;
  if (speedMode === "natural" && word.exampleSentence.trim().length > 0 && tokens.length >= 3) {
    const expectedWords = word.exampleSentence
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (expectedWords.length > 0) {
      const matchedCount = expectedWords.filter((ew) => tokens.includes(ew)).length;
      const sentPct = Math.round((matchedCount / expectedWords.length) * 100);
      sentenceBonusSim = Math.round(bestWordSim * 0.7 + sentPct * 0.3);
    }
  }

  const hasTranscript = tokens.length > 0;
  const validSelf = selfScore != null && selfScore >= 1 && selfScore <= 5 ? selfScore : null;
  const selfPct = validSelf != null ? validSelf * 20 : null;

  let score: number;
  let evidenceKind: WordAttempt["evidenceKind"];
  let evidence: string;

  if (hasTranscript && selfPct != null) {
    evidenceKind = "hybrid";
    // Objective STT match (45%) + user ear listening self-check (55%)
    score = Math.round(sentenceBonusSim * 0.45 + selfPct * 0.55);
    evidence = matchedWord
      ? `Speech-to-text recognized "${word.word}" cleanly (${sentenceBonusSim}% match) + your listening self-check was ${validSelf}/5 → ${score}/100.`
      : `Speech-to-text heard "${closestHeard || cleanTranscript}" (${bestWordSim}% similarity to "${word.word}") + your listening self-check was ${validSelf}/5 → ${score}/100.`;
  } else if (hasTranscript) {
    evidenceKind = "measured";
    // Honestly cap STT-only pronunciation score at 85 because STT can guess context without true phoneme precision
    score = Math.min(85, Math.max(20, sentenceBonusSim));
    evidence = matchedWord
      ? `Speech-to-text matched "${word.word}" (${sentenceBonusSim}%). Capped at ${score}/100 until you replay & rate your pronunciation with the listening self-check.`
      : `Speech-to-text transcribed "${closestHeard || cleanTranscript}" (${bestWordSim}% similarity to "${word.word}"). Replay your audio to check articulation.`;
  } else if (selfPct != null) {
    evidenceKind = "self";
    score = selfPct;
    evidence = `Rated ${validSelf}/5 (${score}/100) via your listening self-check (no browser transcript was captured).`;
  } else {
    evidenceKind = "self";
    score = 50;
    evidence = "Attempt saved without transcript or self-check — replay your audio and rate 1–5 for accurate mastery tracking.";
  }

  // Specific actionable feedback grounded in the word's sound tags & score
  const primarySound = word.soundTags[0] ?? "vowels";
  let feedback: string;
  if (score >= 85) {
    feedback =
      speedMode === "slow"
        ? `Crisp slow-speed articulation on "${word.word}". Now try Natural Speed inside the example sentence to lock it into connected speech.`
        : `Clean natural-speed delivery of "${word.word}"! Keep this relaxed airflow and revisit it on its next spaced-repetition check-in.`;
  } else if (score >= 68) {
    feedback = `Close! Focus specifically on ${SOUND_CATEGORY_LABELS[primarySound].label}: ${word.mouthGuide.tongue}`;
  } else {
    feedback = `Slow down to 0.72× model audio and break "${word.word}" into syllables (${word.phonetic}). ${word.mouthGuide.tongue} ${word.mouthGuide.mouthAirflow}`;
  }

  return {
    id: uid(),
    ts: now,
    date: dateKey(now),
    speedMode,
    transcript: cleanTranscript,
    matchedWord,
    similarityPct: sentenceBonusSim,
    selfScore: validSelf,
    score,
    evidenceKind,
    evidence,
    feedback,
    recordingId: recordingId ?? null,
  };
}

// ---------- Spaced Repetition & Word Mastery Progression ----------

const SPACED_INTERVALS_DAYS = [1, 2, 4, 7, 14, 30];
const DAY_MS = 86400000;

/**
 * Applies a new practice attempt to a PersonalWord, recalculating:
 * - Mastery score (weighted rolling recent accuracy)
 * - Spaced-repetition interval & nextReviewAt timestamp
 * - Honest promotion / demotion between Difficult → Learning → Mastered
 *   (Mastered requires consistent success across >= 3 strong attempts and >= 2 distinct days + natural speed!)
 */
export function applyWordAttempt(word: PersonalWord, attempt: WordAttempt): PersonalWord {
  const attempts = [...word.attempts, attempt];
  const recent = attempts.slice(-4);
  // Weighted average favoring most recent attempts slightly while respecting history
  let weightSum = 0;
  let valSum = 0;
  recent.forEach((a, idx) => {
    const w = idx + 1;
    weightSum += w;
    valSum += a.score * w;
  });
  const masteryScore = Math.round(valSum / Math.max(1, weightSum));

  // Count distinct calendar days with a strong (>= 80) attempt
  const strongDates = new Set<string>(attempts.filter((a) => a.score >= 80).map((a) => a.date));
  const lastThree = attempts.slice(-3);
  const lastThreeAvg =
    lastThree.length > 0 ? lastThree.reduce((sum, a) => sum + a.score, 0) / lastThree.length : 0;
  const hasNaturalSuccess = attempts.some((a) => a.speedMode === "natural" && a.score >= 80);

  let consecutiveSuccessDays = word.consecutiveSuccessDays;
  let intervalDays = word.intervalDays || 1;

  if (attempt.score >= 80) {
    // Only count as a new spaced-repetition step if it's a new calendar day OR the first strong attempt
    const prevStrongDates = new Set<string>(word.attempts.filter((a) => a.score >= 80).map((a) => a.date));
    if (!prevStrongDates.has(attempt.date)) {
      consecutiveSuccessDays += 1;
      const idx = Math.min(SPACED_INTERVALS_DAYS.length - 1, consecutiveSuccessDays);
      intervalDays = SPACED_INTERVALS_DAYS[idx];
    } else if (intervalDays < 1) {
      intervalDays = 1;
    }
  } else if (attempt.score >= 65) {
    intervalDays = Math.max(1, Math.min(2, intervalDays));
  } else {
    consecutiveSuccessDays = 0;
    intervalDays = 1;
  }

  // Honest status progression
  let status: WordStatus = word.status;
  const qualifiesForMastered =
    lastThree.length >= 3 &&
    lastThreeAvg >= 82 &&
    strongDates.size >= 2 &&
    hasNaturalSuccess &&
    attempt.score >= 80;

  if (qualifiesForMastered) {
    status = "mastered";
    intervalDays = Math.max(intervalDays, 7);
  } else if (word.status === "mastered" && attempt.score < 70) {
    // Honest demotion if mastery slips during spaced review
    status = "learning";
    consecutiveSuccessDays = 0;
    intervalDays = 1;
  } else if (word.status === "difficult") {
    const solidCount = attempts.filter((a) => a.score >= 65).length;
    if (attempt.score >= 75 || solidCount >= 2) {
      status = "learning";
    }
  } else if (word.status === "learning" && attempt.score < 55 && masteryScore < 60) {
    status = "difficult";
    intervalDays = 1;
  }

  const nextReviewAt = attempt.ts + intervalDays * DAY_MS;

  return {
    ...word,
    attempts,
    masteryScore,
    status,
    consecutiveSuccessDays,
    intervalDays,
    nextReviewAt,
    lastPracticedAt: attempt.ts,
    updatedAt: attempt.ts,
  };
}

export function getDueWords(words: PersonalWord[], nowMs: number = Date.now()): PersonalWord[] {
  return words
    .filter((w) => w.status !== "mastered" || w.nextReviewAt <= nowMs)
    .filter((w) => w.nextReviewAt <= nowMs || w.attempts.length === 0)
    .sort((a, b) => {
      // Prioritize difficult -> learning -> overdue mastered, then lowest mastery score
      const rank = (s: WordStatus) => (s === "difficult" ? 0 : s === "learning" ? 1 : 2);
      const rDiff = rank(a.status) - rank(b.status);
      if (rDiff !== 0) return rDiff;
      return a.masteryScore - b.masteryScore;
    });
}

export function recommendedPracticeSpeed(word: PersonalWord): {
  mode: "slow" | "natural";
  reason: string;
} {
  const slowSuccesses = word.attempts.filter((a) => a.speedMode === "slow" && a.score >= 75).length;
  if (word.status === "difficult" && slowSuccesses === 0 && word.masteryScore < 70) {
    return {
      mode: "slow",
      reason: "Start in Slow Practice to lock in tongue & lip placement cleanly before speeding up.",
    };
  }
  return {
    mode: "natural",
    reason:
      word.status === "learning"
        ? "Practice at Natural Speed in a full sentence — consistent natural-speed takes across 2+ days unlock Mastered."
        : "Use Natural Speed inside the example sentence to verify effortless carry-over.",
  };
}

// ---------- Weak Sound Detector & Problematic Sound Combinations ----------

const SOUND_TO_EXERCISE_IDS: Record<SoundCategoryKey, string[]> = {
  th: ["cm-tt-int-1", "cm-sent-beg-1", "cm-tt-adv-1"],
  r: ["cm-tt-int-1", "cm-tt-adv-1", "cm-sent-adv-1"],
  l: ["cm-tt-int-1", "cm-tt-adv-1", "cm-fluency-airflow-linking"],
  s_sh: ["cm-tt-beg-1", "cm-tt-adv-1", "cm-sent-beg-1"],
  v_w: ["cm-tt-int-1", "cm-sent-beg-1", "cm-para-beg-1"],
  p_b_t_d: ["cm-fluency-light-contact", "cm-fluency-gentle-onset", "cm-tt-beg-1"],
  clusters: ["cm-tt-adv-1", "cm-sent-adv-1", "cm-para-int-1"],
  endings: ["cm-sent-beg-1", "cm-para-beg-1", "cm-sent-adv-1"],
  vowels: ["cm-para-beg-1", "cm-fluency-rate-anchor", "cm-pass-beg-1"],
};

export function detectWeakSounds(
  words: PersonalWord[],
  recordings: Recording[]
): { weakSounds: WeakSoundFinding[]; weakCombos: WeakComboFinding[] } {
  const stats = new Map<
    SoundCategoryKey,
    { weight: number; accScores: number[]; sampleWords: Set<string> }
  >();

  const touch = (sound: SoundCategoryKey, weight: number, wordText: string, accuracy?: number) => {
    const cur = stats.get(sound) ?? { weight: 0, accScores: [], sampleWords: new Set<string>() };
    cur.weight += weight;
    if (accuracy != null) cur.accScores.push(accuracy);
    if (wordText) cur.sampleWords.add(wordText.toLowerCase());
    stats.set(sound, cur);
  };

  // 1. Evidence from Personal Word Bank
  for (const w of words) {
    if (w.status === "mastered" && w.masteryScore >= 85) continue;
    const baseWeight = w.status === "difficult" ? 3 : 2;
    const acc = w.attempts.length > 0 ? w.masteryScore : undefined;
    for (const s of w.soundTags) {
      touch(s, baseWeight, w.word, acc);
    }
  }

  // 2. Evidence from recurring missed/mumbled words across Recordings
  const allProblemWords: string[] = [];
  for (const rec of recordings.slice(0, 25)) {
    const a = getRecordingAssessment(rec);
    for (const pw of a.problemWords) {
      if (pw.kind === "missing" || pw.kind === "repeated") {
        const norm = normalizeWord(pw.word);
        if (norm.length >= 3) {
          allProblemWords.push(norm);
          const cats = detectSoundCategories(norm);
          for (const c of cats) touch(c, 1.5, norm);
        }
      }
    }
  }

  const weakSounds: WeakSoundFinding[] = [...stats.entries()]
    .map(([sound, data]) => {
      const avgAccuracy =
        data.accScores.length > 0
          ? Math.round(data.accScores.reduce((a, b) => a + b, 0) / data.accScores.length)
          : null;
      const severity: WeakSoundFinding["severity"] =
        data.weight >= 5 || (avgAccuracy != null && avgAccuracy < 65)
          ? "high"
          : data.weight >= 3 || (avgAccuracy != null && avgAccuracy < 80)
          ? "medium"
          : "watch";
      const meta = SOUND_CATEGORY_LABELS[sound];
      const guide = SOUND_PLACEMENT_CUES[sound];
      return {
        sound,
        label: meta.label,
        short: meta.short,
        phonemes: meta.phonemes,
        issueCount: Math.round(data.weight),
        avgAccuracy,
        severity,
        sampleWords: [...data.sampleWords].slice(0, 5),
        placementCue: guide.tongue,
        recommendedExerciseIds: SOUND_TO_EXERCISE_IDS[sound],
      };
    })
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 6);

  // 3. Detect problematic sound combinations across saved difficult/learning words & missed words
  const wordPool = [
    ...words.filter((w) => w.status !== "mastered").map((w) => w.normalized),
    ...allProblemWords,
  ];
  const uniquePool = [...new Set(wordPool)];

  const comboChecks: { key: string; label: string; regex: RegExp; tip: string }[] = [
    {
      key: "th_r",
      label: "TH + R transitions (thr- / th…r)",
      regex: /thr|th.*r/,
      tip: "Start with tongue tip lightly between teeth for TH, then smoothly retract and round lips into R without inserting an extra vowel.",
    },
    {
      key: "r_l",
      label: "R ↔ L rapid switching (rl / l…r)",
      regex: /(r.*l|l.*r)/,
      tip: "Exaggerate the contrast slowly: bunched tongue + light lip rounding for R, then crisp tongue-tip lift behind upper teeth for L.",
    },
    {
      key: "str_scr",
      label: "Triple consonant starts (str- / scr- / spr-)",
      regex: /(str|scr|spr|spl)/,
      tip: "Glide smoothly from S into the plosive and liquid on one continuous stream of air at 0.75× speed before speeding up.",
    },
    {
      key: "s_sh_mix",
      label: "S ↔ SH / CH sibilant switches",
      regex: /(s.*sh|sh.*s|s.*ch|ch.*s)/,
      tip: "Spread lips lightly for /s/ and protrude/round lips slightly forward for /ʃ/ (SH) so they never blur together.",
    },
    {
      key: "final_clusters",
      label: "Dense word-ending clusters (-ths / -sts / -rld / -sks)",
      regex: /(ths|sts|rld|sks|kts|pts|nds)$/,
      tip: "Slow down by 15% on the final syllable and give each ending consonant a light, audible tap instead of dropping the tail.",
    },
  ];

  const weakCombos: WeakComboFinding[] = [];
  for (const c of comboChecks) {
    const matches = uniquePool.filter((w) => c.regex.test(w));
    if (matches.length >= 1 && (matches.length >= 2 || words.some((pw) => pw.status === "difficult" && c.regex.test(pw.normalized)))) {
      weakCombos.push({
        comboKey: c.key,
        label: c.label,
        words: matches.slice(0, 5),
        tip: c.tip,
      });
    }
  }

  return { weakSounds, weakCombos };
}

// ---------- Before vs. After Comparison Engine ----------

export function compareWordBeforeAfter(word: PersonalWord): BeforeAfterComparison | null {
  if (word.attempts.length < 2) return null;
  const first = word.attempts[0];
  const latest = word.attempts[word.attempts.length - 1];
  const delta = latest.score - first.score;

  const improvements: string[] = [];
  const remainingFocus: string[] = [];

  if (delta > 0) {
    improvements.push(`Word mastery accuracy rose from ${first.score}/100 to ${latest.score}/100 (+${delta} pts).`);
  }
  if (!first.matchedWord && latest.matchedWord) {
    improvements.push(`Speech-to-text now recognizes "${word.word}" cleanly (it missed on your first attempt).`);
  }
  if (latest.similarityPct > first.similarityPct) {
    improvements.push(`Transcript match rose from ${first.similarityPct}% to ${latest.similarityPct}%.`);
  }
  if (first.selfScore != null && latest.selfScore != null && latest.selfScore > first.selfScore) {
    improvements.push(`Listening self-check improved from ${first.selfScore}/5 to ${latest.selfScore}/5.`);
  }
  if (first.speedMode === "slow" && latest.speedMode === "natural" && latest.score >= 75) {
    improvements.push(`Successfully progressed from slow word drilling to natural-speed sentence delivery.`);
  }
  if (improvements.length === 0) {
    improvements.push(`Completed ${word.attempts.length} logged attempts — building repetition consistency.`);
  }

  if (latest.score < 85) {
    remainingFocus.push(`Target 85+ consistently: ${word.mouthGuide.tongue}`);
  }
  if (word.status !== "mastered") {
    const strongDays = new Set(word.attempts.filter((a) => a.score >= 80).map((a) => a.date)).size;
    const hasNat = word.attempts.some((a) => a.speedMode === "natural" && a.score >= 80);
    if (!hasNat) remainingFocus.push(`Complete a clean Natural Speed sentence attempt (80+) to unlock Mastered.`);
    else if (strongDays < 2) {
      remainingFocus.push(`Revisit "${word.word}" tomorrow for spaced repetition (${strongDays}/2 strong practice days completed).`);
    }
  } else {
    remainingFocus.push(`Mastered! Next spaced review scheduled in ${word.intervalDays} day${word.intervalDays === 1 ? "" : "s"} to keep it sharp.`);
  }

  return {
    kind: "word",
    beforeLabel: `First attempt (${first.speedMode} speed)`,
    afterLabel: `Latest attempt #${word.attempts.length} (${latest.speedMode} speed)`,
    beforeDate: first.ts,
    afterDate: latest.ts,
    beforeScore: first.score,
    afterScore: latest.score,
    delta,
    beforeRecordingId: first.recordingId ?? null,
    afterRecordingId: latest.recordingId ?? null,
    beforeTranscript: first.transcript,
    afterTranscript: latest.transcript,
    improvements,
    remainingFocus,
  };
}

export function compareOverallBeforeAfter(recordings: Recording[]): BeforeAfterComparison | null {
  if (recordings.length < 2) return null;
  const chrono = [...recordings].sort((a, b) => a.createdAt - b.createdAt);
  const first = chrono[0];
  const latest = chrono[chrono.length - 1];
  const aFirst = getRecordingAssessment(first);
  const aLatest = getRecordingAssessment(latest);

  const beforeScore = aFirst.dimensions.pronunciation.score ?? aFirst.overallScore;
  const afterScore = aLatest.dimensions.pronunciation.score ?? aLatest.overallScore;
  const delta = afterScore - beforeScore;

  const improvements: string[] = [];
  const remainingFocus: string[] = [];

  const overallDelta = aLatest.overallScore - aFirst.overallScore;
  if (overallDelta > 0) {
    improvements.push(`Overall speaking score improved from ${aFirst.overallScore}/100 to ${aLatest.overallScore}/100 (+${overallDelta} pts).`);
  }
  const clarityDelta = aLatest.dimensions.clarity.displayScore - aFirst.dimensions.clarity.displayScore;
  if (clarityDelta >= 4) {
    improvements.push(`Clarity climbed +${clarityDelta} pts (${aFirst.dimensions.clarity.displayScore} → ${aLatest.dimensions.clarity.displayScore}).`);
  }
  if (first.analysis.fillerTotal > latest.analysis.fillerTotal) {
    improvements.push(`Filler words dropped from ${first.analysis.fillerTotal} to ${latest.analysis.fillerTotal}.`);
  }
  if (aFirst.dimensions.pronunciation.score != null && aLatest.dimensions.pronunciation.score != null) {
    const pDelta = aLatest.dimensions.pronunciation.score - aFirst.dimensions.pronunciation.score;
    if (pDelta > 0) {
      improvements.push(`Pronunciation self-check score improved +${pDelta} pts (${aFirst.dimensions.pronunciation.score} → ${aLatest.dimensions.pronunciation.score}).`);
    }
  }
  if (improvements.length === 0) {
    improvements.push(`Logged ${recordings.length} total recordings — keep pairing audio replay with self-checks to measure gains.`);
  }

  // Highlight any problem words still showing up in the latest recording
  const latestMisses = aLatest.problemWords
    .filter((w) => w.kind === "missing" || w.kind === "repeated")
    .map((w) => w.word)
    .slice(0, 4);
  if (latestMisses.length > 0) {
    remainingFocus.push(`Recent trouble words to save & drill: ${latestMisses.join(", ")}.`);
  }
  if (aLatest.dimensions.pronunciation.pendingSelfCheck) {
    remainingFocus.push("Complete the listening self-check on your latest recording for an ear-verified pronunciation score.");
  }
  if (aLatest.improvements[0]) {
    remainingFocus.push(aLatest.improvements[0]);
  }

  return {
    kind: "overall",
    beforeLabel: `Original: ${first.title}`,
    afterLabel: `Latest: ${latest.title}`,
    beforeDate: first.createdAt,
    afterDate: latest.createdAt,
    beforeScore,
    afterScore,
    delta,
    beforeRecordingId: first.hasAudio ? first.id : null,
    afterRecordingId: latest.hasAudio ? latest.id : null,
    beforeTranscript: first.transcript,
    afterTranscript: latest.transcript,
    improvements,
    remainingFocus,
  };
}

// ---------- Dynamic Custom Sentences & Paragraph Generator for Saved Difficult Words ----------

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function generateCustomWordDrillContent(
  words: PersonalWord[],
  seed: number = 0
): {
  targetWords: PersonalWord[];
  sentences: string[];
  paragraph: string;
  annotatedParagraph: string;
} {
  const priority = words
    .filter((w) => w.status !== "mastered")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "difficult" ? -1 : 1;
      return a.masteryScore - b.masteryScore;
    });
  const pool = priority.length > 0 ? priority : words;
  if (pool.length === 0) {
    return { targetWords: [], sentences: [], paragraph: "", annotatedParagraph: "" };
  }

  // Rotate deterministically by seed while picking up to 5 words
  const rotated = [...pool.slice(seed % pool.length), ...pool.slice(0, seed % pool.length)].slice(0, 5);
  const sentences = rotated.map((w) => {
    const ex = w.exampleSentence.trim();
    if (ex.toLowerCase().includes(w.normalized)) return ex;
    return `Focus on clear articulation when saying ${w.word} in a calm sentence.`;
  });

  // Build a cohesive connected paragraph weaving all chosen difficult words naturally
  const wList = rotated.map((w) => w.word);
  const wAnn = rotated.map((w) => `**${w.word}**`);

  let plain = "";
  let annotated = "";

  if (wList.length === 1) {
    plain = `Today I am slowing down to master the word ${wList[0]}. ${sentences[0]} When I breathe calmly and release tension, ${wList[0]} comes out clear, steady, and natural.`;
    annotated = `∧ Today I am slowing down | to master the word ${wAnn[0]}. ‖ ∧ ${sentences[0].replace(
      new RegExp(`\\b(${wList[0]})\\b`, "gi"),
      "**$1**"
    )} ‖ ∧ When I breathe calmly | and release tension, | ${wAnn[0]} comes out clear, steady, and natural. ‖`;
  } else if (wList.length === 2) {
    plain = `In today's speaking session, I am practicing ${wList[0]} and ${wList[1]} with smooth airflow. First, remember ${wList[0]}: ${sentences[0]} Next, glide gently into ${wList[1]}: ${sentences[1]} Saying ${wList[0]} and ${wList[1]} unhurriedly makes my whole message clearer.`;
    annotated = `∧ In today's speaking session, | I am practicing ${wAnn[0]} and ${wAnn[1]} | with smooth airflow. ‖ ∧ First, remember ${wAnn[0]}: | ${sentences[0]} ‖ ∧ Next, glide gently into ${wAnn[1]}: | ${sentences[1]} ‖ ∧ Saying ${wAnn[0]} and ${wAnn[1]} unhurriedly | makes my whole message clearer. ‖`;
  } else {
    const rest = wList.slice(2);
    const restAnn = wAnn.slice(2);
    const joinedRest =
      rest.length === 1 ? rest[0] : `${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}`;
    const joinedRestAnn =
      restAnn.length === 1
        ? restAnn[0]
        : `${restAnn.slice(0, -1).join(", ")}, and ${restAnn[restAnn.length - 1]}`;

    plain = `Every strong speaker improves by facing tricky words calmly instead of avoiding them. Today my personal focus words are ${wList[0]}, ${wList[1]}, and ${joinedRest}. Let me slow down on ${wList[0]}: ${sentences[0]} Now keep the exact same relaxed rhythm for ${wList[1]}: ${sentences[1]} Finally, connect ${joinedRest} with light contact and steady breath: ${sentences[2]} When I practice ${wList[0]}, ${wList[1]}, and ${joinedRest} consistently, they become completely natural on camera and in conversation.`;
    annotated = `∧ Every strong speaker improves | by facing tricky words calmly | instead of avoiding them. ‖ ∧ Today my personal focus words are ${wAnn[0]}, | ${wAnn[1]}, | and ${joinedRestAnn}. ‖ ∧ Let me slow down on ${wAnn[0]}: | ${sentences[0]} ‖ ∧ Now keep the exact same relaxed rhythm for ${wAnn[1]}: | ${sentences[1]} ‖ ∧ Finally, connect ${joinedRestAnn} | with light contact and steady breath: | ${sentences[2]} ‖ ∧ When I practice ${wAnn[0]}, | ${wAnn[1]}, | and ${joinedRestAnn} consistently, | they become completely natural | on camera and in conversation. ‖`;
  }

  return {
    targetWords: rotated,
    sentences,
    paragraph: plain,
    annotatedParagraph: annotated,
  };
}

/**
 * Wraps your saved Difficult/Learning words into a full CoachedExercise so
 * Today's Daily Training, Guided Sessions, and Recorder can run it seamlessly.
 */
export function buildCustomWordCoachedExercise(
  words: PersonalWord[],
  seed: number = 0
): CoachedExercise | null {
  const due = getDueWords(words);
  const sourcePool = due.length > 0 ? due : words.filter((w) => w.status !== "mastered");
  if (sourcePool.length === 0) return null;

  const content = generateCustomWordDrillContent(sourcePool, seed);
  if (!content.paragraph) return null;

  const wordNames = content.targetWords.map((w) => w.word);
  const topSounds = [...new Set(content.targetWords.flatMap((w) => w.soundTags))].slice(0, 3);
  const soundSummary = topSounds.map((s) => SOUND_CATEGORY_LABELS[s].short).join(", ");
  const firstGuide = content.targetWords[0].mouthGuide;

  return {
    id: `custom-word-drill-${dateKey()}`,
    title: `My Word Bank Drill: ${wordNames.slice(0, 3).map(capFirst).join(", ")}${wordNames.length > 3 ? ` +${wordNames.length - 3}` : ""}`,
    materialType: "paragraph",
    difficulty: "beginner",
    skills: ["pronunciation", "clarity", "fluency"],
    durationSec: 150,
    reps: 2,
    targetWpm: 112,
    category: "pronunciation",
    whatToDo: `This custom paragraph was built directly from your saved Personal Word Bank (${wordNames.join(", ")}). Listen to the model at 0.75× first, then read aloud smoothly at ~112 WPM.`,
    howToSpeak: `Focus on ${soundSummary || "clear consonant articulation"}. ${firstGuide.tongue} Keep your breath steady so your target words blend naturally into full sentences.`,
    emphasisWords: wordNames,
    pauseNotes: "Take a quiet breath ∧ before each sentence and pause ‖ cleanly after each example so you never rush into your tricky words.",
    mistakesToAvoid: [
      "Speeding through your saved difficult words hoping to get past them quickly.",
      "Tensing your jaw or lips right before a target word appears.",
      "Skipping the audio replay—compare how your target words sound against the model.",
    ],
    annotatedText: content.annotatedParagraph,
    plainText: content.paragraph,
  };
}
