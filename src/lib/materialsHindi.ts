import type { CoachedExercise } from "./types";

// Dedicated Hindi speaking baseline check (used when user takes a Hindi baseline or assessment)
export const DIAGNOSTIC_EXERCISE_HI: CoachedExercise = {
  id: "diag-baseline-hi",
  language: "hi",
  title: "Hindi Speaking Baseline Check",
  materialType: "paragraph",
  difficulty: "beginner",
  skills: ["clarity", "pacing", "fluency", "pausesBreathing", "expression"],
  durationSec: 45,
  reps: 1,
  targetWpm: 115,
  category: "reading",
  whatToDo:
    "Read this calm Hindi passage aloud once at your natural everyday pace so SpeechCoach can build your separate Hindi baseline.",
  howToSpeak:
    "Keep your jaw and shoulders relaxed. Let each Hindi vowel (matra) finish clearly, breathe calmly at ∧ marks, and pause naturally at every danda (।).",
  emphasisWords: ["स्पष्ट", "धैर्य", "विश्वास", "प्रभाव"],
  pauseNotes: "Pause 0.5s at | and take a quiet nasal breath at ∧ marks.",
  mistakesToAvoid: [
    "Do not rush through compound letters (संयुक्त अक्षर).",
    "Do not add fillers like 'मतलब' or 'अच्छा' between lines.",
  ],
  annotatedText:
    "∧ अच्छा बोलना कोई **जादू** नहीं है, | बल्कि रोज़ के **शांत अभ्यास** का परिणाम है। ‖ ∧ जब हम जल्दबाज़ी छोड़कर | हर शब्द को **स्पष्ट** और पूरे **धैर्य** के साथ बोलते हैं, | तो सुनने वाले का ध्यान अपने आप जुड़ जाता है। ‖ ∧ आज का यह छोटा अभ्यास | मेरी हिंदी वाणी की एक **नई शुरुआत** है, | जहाँ आवाज़ में **विश्वास** और शब्दों में गहरा **प्रभाव** होगा।",
  plainText:
    "अच्छा बोलना कोई जादू नहीं है, बल्कि रोज़ के शांत अभ्यास का परिणाम है। जब हम जल्दबाज़ी छोड़कर हर शब्द को स्पष्ट और पूरे धैर्य के साथ बोलते हैं, तो सुनने वाले का ध्यान अपने आप जुड़ जाता है। आज का यह छोटा अभ्यास मेरी हिंदी वाणी की एक नई शुरुआत है, जहाँ आवाज़ में विश्वास और शब्दों में गहरा प्रभाव होगा।",
  romanizedText:
    "Achha bolna koi jaadu nahi hai, balki roz ke shaant abhyaas ka parinaam hai. Jab hum jaldbaazi chhodkar har shabd ko spasht aur poore dhairya ke saath bolte hain, to sunne waale ka dhyaan apne aap jud jaata hai. Aaj ka yeh chhota abhyaas meri Hindi vaani ki ek nayi shuruaat hai, jahaan aawaaz mein vishwas aur shabdon mein gehra prabhaav hoga.",
};

export const HINDI_COACHED_MATERIALS: CoachedExercise[] = [
  // ---- 1. Short Sentences (Beginner — Crisp Endings & Matra Clarity) ----
  {
    id: "cm-hi-sent-beg-1",
    language: "hi",
    title: "Hindi Crisp Endings — Five Clean Sentences",
    materialType: "short_sentence",
    difficulty: "beginner",
    skills: ["clarity", "pronunciation", "pacing"],
    durationSec: 60,
    reps: 2,
    targetWpm: 112,
    category: "clarity",
    whatToDo:
      "Read each Hindi sentence slowly, giving every final syllable and vowel matra a clean, unhurried finish.",
    howToSpeak:
      "Release breath gently on the first word of each line. Pause cleanly after every danda (।) before starting the next thought.",
    emphasisWords: ["स्पष्ट", "विश्वास", "प्रयत्न", "सफलता", "नियंत्रण"],
    pauseNotes: "Stop completely for one calm beat at every ‖ mark.",
    mistakesToAvoid: [
      "Swallowing the final 'है' or 'हैं' at the end of sentences.",
      "Speeding up halfway through a sentence.",
    ],
    annotatedText:
      "∧ हर शब्द को **स्पष्ट** बोलना ही प्रभावी संवाद की पहली सीढ़ी है। ‖ ∧ शांत मन और गहरी साँस से आवाज़ में **विश्वास** आता है। ‖ ∧ रोज़ का छोटा **प्रयत्न** भी समय के साथ बड़ा बदलाव लाता है। ‖ ∧ धीमी और संतुलित गति हमें शब्दों पर पूरा **नियंत्रण** देती है। ‖ ∧ धैर्य और निरंतर अभ्यास ही सच्ची **सफलता** की कुंजी है।",
    plainText:
      "हर शब्द को स्पष्ट बोलना ही प्रभावी संवाद की पहली सीढ़ी है। शांत मन और गहरी साँस से आवाज़ में विश्वास आता है। रोज़ का छोटा प्रयत्न भी समय के साथ बड़ा बदलाव लाता है। धीमी और संतुलित गति हमें शब्दों पर पूरा नियंत्रण देती है। धैर्य और निरंतर अभ्यास ही सच्ची सफलता की कुंजी है।",
    romanizedText:
      "Har shabd ko spasht bolna hi prabhaavi samvaad ki pehli seedhi hai. Shaant man aur gehri saans se aawaaz mein vishwas aata hai. Roz ka chhota prayatna bhi samay ke saath bada badlaav laata hai. Dheemi aur santulit gati humein shabdon par poora niyantran deti hai. Dhairya aur nirantar abhyaas hi sachchi safalta ki kunji hai.",
  },

  // ---- 2. Short Sentences (Intermediate — Stress & Meaning Contrast) ----
  {
    id: "cm-hi-sent-int-1",
    language: "hi",
    title: "Hindi Vocal Stress — Shaping Meaning",
    materialType: "short_sentence",
    difficulty: "intermediate",
    skills: ["expression", "clarity", "pausesBreathing"],
    durationSec: 75,
    reps: 2,
    targetWpm: 118,
    category: "pitch",
    whatToDo:
      "Lift your pitch slightly and add gentle vocal weight on each bolded word to give natural Hindi conversational melody.",
    howToSpeak:
      "Avoid flat monotone reading. Think of explaining each sentence to a friend sitting across the table.",
    emphasisWords: ["तैयारी", "सुनना", "सरल", "दृष्टिकोण"],
    pauseNotes: "Leave a brief expressive beat at | right before the contrast word.",
    mistakesToAvoid: [
      "Keeping the exact same pitch from start to finish.",
      "Shouting emphasis words instead of lifting pitch smoothly.",
    ],
    annotatedText:
      "∧ आत्मविश्वास अचानक नहीं आता, | वह शांत **तैयारी** से बनता है। ‖ ∧ अच्छा वक्ता केवल बोलता नहीं, | पहले ध्यान से **सुनना** भी जानता है। ‖ ∧ कठिन विचार को भी **सरल** भाषा में कहना सबसे बड़ा कौशल है। ‖ ∧ एक छोटा-सा ठहराव | पूरी बात का **दृष्टिकोण** बदल सकता है।",
    plainText:
      "आत्मविश्वास अचानक नहीं आता, वह शांत तैयारी से बनता है। अच्छा वक्ता केवल बोलता नहीं, पहले ध्यान से सुनना भी जानता है। कठिन विचार को भी सरल भाषा में कहना सबसे बड़ा कौशल है। एक छोटा-सा ठहराव पूरी बात का दृष्टिकोण बदल सकता है।",
    romanizedText:
      "Aatmavishwas achaanak nahi aata, woh shaant taiyaari se banta hai. Achha vakta keval bolta nahi, pehle dhyaan se sunna bhi jaanta hai. Kathin vichaar ko bhi saral bhaasha mein kehna sabse bada kaushal hai. Ek chhota-sa thehraav poori baat ka drishtikon badal sakta hai.",
  },

  // ---- 3. Short Sentences (Anti-Stammering — Gentle Onset in Hindi) ----
  {
    id: "cm-hi-fluency-onset",
    language: "hi",
    title: "Hindi Gentle Onset — Soft Starts (Anti-Blocking)",
    materialType: "short_sentence",
    difficulty: "beginner",
    skills: ["fluency", "pausesBreathing", "pacing"],
    durationSec: 75,
    reps: 2,
    targetWpm: 102,
    focusTags: ["stammering"],
    category: "fluency",
    whatToDo:
      "Begin each Hindi sentence on a soft exhale so your throat stays completely open before the first syllable starts.",
    howToSpeak:
      "Inhale calmly for 2 seconds, let a whisper of air leave first, then gently stretch the opening vowel ('आ...', 'अ...', 'ए...', 'उ...'). Zero throat pushing.",
    emphasisWords: ["आराम", "आसान", "अनुभव", "एक", "उम्मीद"],
    pauseNotes: "Reset your breath and drop your shoulders at every ∧ mark.",
    mistakesToAvoid: [
      "Holding your breath and trying to force the first word out.",
      "Rushing once the first syllable releases.",
    ],
    annotatedText:
      "∧ **आराम** से साँस लेकर | मैं हर वाक्य को कोमलता से शुरू करता हूँ। ‖ ∧ **आसान** शुरुआत से गले का सारा तनाव तुरंत कम हो जाता है। ‖ ∧ हर नया **अनुभव** मुझे और अधिक शांत व सहज बनाता है। ‖ ∧ **एक** धीमा और स्थिर कदम | सौ तेज़ कदमों से बेहतर है। ‖ ∧ नई **उम्मीद** और खुले स्वर के साथ | मैं अपनी बात पूरी करता हूँ।",
    plainText:
      "आराम से साँस लेकर मैं हर वाक्य को कोमलता से शुरू करता हूँ। आसान शुरुआत से गले का सारा तनाव तुरंत कम हो जाता है। हर नया अनुभव मुझे और अधिक शांत व सहज बनाता है। एक धीमा और स्थिर कदम सौ तेज़ कदमों से बेहतर है। नई उम्मीद और खुले स्वर के साथ मैं अपनी बात पूरी करता हूँ।",
    romanizedText:
      "Aaraam se saans lekar main har vaakya ko komalta se shuru karta hoon. Aasaan shuruaat se gale ka saara tanaav turant kam ho jaata hai. Har naya anubhav mujhe aur adhik shaant va sahaj banaata hai. Ek dheema aur sthir kadam sau tez kadmon se behtar hai. Nayi ummeed aur khule swar ke saath main apni baat poori karta hoon.",
  },

  // ---- 4. Tongue Twister (Beginner — Hindi Aspirated & Sibilant Clarity: श/ष/स & ख/थ/फ) ----
  {
    id: "cm-hi-tt-beg-1",
    language: "hi",
    title: "Hindi Sibilant & Aspirated Clarity (श / स & ख / थ / फ)",
    materialType: "tongue_twister",
    difficulty: "beginner",
    skills: ["pronunciation", "clarity"],
    durationSec: 65,
    reps: 3,
    targetWpm: 98,
    category: "pronunciation",
    whatToDo:
      "Articulate crisp Hindi 'श' (soft palatal hush) separately from 'स' (clean dental hiss), and give gentle breath puffs to aspirated 'ख, थ, फ, ध'.",
    howToSpeak:
      "Never race tongue twisters. Accuracy at 95 WPM builds permanent mouth precision far faster than sloppy speed.",
    emphasisWords: ["शांत", "शहर", "सफल", "खूबसूरत", "धैर्य"],
    pauseNotes: "Pause cleanly between each line to reset tongue tension.",
    mistakesToAvoid: [
      "Merging 'श' into 'स' (saying 'सरल' and 'शहर' with the same tongue shape).",
      "Forcing air hard on aspirated sounds instead of letting a soft puff flow.",
    ],
    annotatedText:
      "∧ **शांत** शाम में | **शहर** की साफ सड़क पर | सब लोग सरल स्वर में बोले। ‖ ∧ **खूबसूरत** खिलते फूलों की खुशबू | धीमे-धीमे हर घर तक पहुँची। ‖ ∧ थोड़े **धैर्य** और सही अभ्यास से | **सफल** संवाद सहज बन जाता है। ‖ ∧ स्पष्ट शब्दों की शक्ति | श्रोताओं के दिल को छू जाती है।",
    plainText:
      "शांत शाम में शहर की साफ सड़क पर सब लोग सरल स्वर में बोले। खूबसूरत खिलते फूलों की खुशबू धीमे-धीमे हर घर तक पहुँची। थोड़े धैर्य और सही अभ्यास से सफल संवाद सहज बन जाता है। स्पष्ट शब्दों की शक्ति श्रोताओं के दिल को छू जाती है।",
    romanizedText:
      "Shaant shaam mein shehar ki saaf sadak par sab log saral swar mein bole. Khoobsurat khilte phoolon ki khushboo dheeme-dheeme har ghar tak pahunchi. Thode dhairya aur sahi abhyaas se safal samvaad sahaj ban jaata hai. Spasht shabdon ki shakti shrotaon ke dil ko chhoo jaati hai.",
  },

  // ---- 5. Tongue Twister (Intermediate — Retroflex vs Dental ट/ड/ड़ vs त/द & Light Contact) ----
  {
    id: "cm-hi-tt-int-1",
    language: "hi",
    title: "Hindi Light Contact & Retroflex Precision (ट / ड / ड़ vs त / द)",
    materialType: "tongue_twister",
    difficulty: "intermediate",
    skills: ["pronunciation", "fluency", "clarity"],
    durationSec: 70,
    reps: 3,
    targetWpm: 100,
    focusTags: ["stammering"],
    category: "pronunciation",
    whatToDo:
      "Practice feather-light tongue touches on hard plosives (प, ब, ट, त, ड, द, क, ग) while keeping retroflex (curled tongue) distinct from dental (behind teeth).",
    howToSpeak:
      "Touch your lips or tongue at 30% pressure — like a feather tap, never clamping shut — so plosives glide cleanly into the vowel.",
    emphasisWords: ["पके", "पेड़", "पपीता", "चंदू", "ठंडी"],
    pauseNotes: "Take a quick calm breath before each classic Hindi line.",
    mistakesToAvoid: [
      "Pressing lips tightly together on 'प' or locking the tongue on 'ट/त'.",
      "Racing faster than your tongue can release cleanly.",
    ],
    annotatedText:
      "∧ **पके** पेड़ पर | पका **पपीता**, | पका पेड़ या पका पपीता। ‖ ∧ **चंदू** के चाचा ने | चंदू की चाची को | चाँदनी चौक में चाँदी की चम्मच से चटनी चटाई। ‖ ∧ **ठंडी** हवा में | टहलते-टहलते | तन्मय ने ताज़ा तरबूज़ तोड़ा। ‖ ∧ हल्के स्पर्श और नरम साँस से | हर कठिन ध्वनि सहज हो जाती है।",
    plainText:
      "पके पेड़ पर पका पपीता, पका पेड़ या पका पपीता। चंदू के चाचा ने चंदू की चाची को चाँदनी चौक में चाँदी की चम्मच से चटनी चटाई। ठंडी हवा में टहलते-टहलते तन्मय ने ताज़ा तरबूज़ तोड़ा। हल्के स्पर्श और नरम साँस से हर कठिन ध्वनि सहज हो जाती है।",
    romanizedText:
      "Pake ped par paka papeeta, paka ped ya paka papeeta. Chandu ke chacha ne Chandu ki chachi ko Chandni Chowk mein chaandi ki chammach se chatni chataayi. Thandi hawa mein tehalte-tehalte Tanmay ne taaza tarbooz toda. Halke sparsh aur naram saans se har kathin dhwani sahaj ho jaati hai.",
  },

  // ---- 6. Tongue Twister (Advanced — Samyuktakshar Conjunct Clusters) ----
  {
    id: "cm-hi-tt-adv-1",
    language: "hi",
    title: "Hindi Conjunct Cluster Precision (संयुक्त अक्षर)",
    materialType: "tongue_twister",
    difficulty: "advanced",
    skills: ["pronunciation", "clarity", "pacing"],
    durationSec: 75,
    reps: 2,
    targetWpm: 108,
    category: "pronunciation",
    whatToDo:
      "Articulate complex Hindi conjunct clusters (क्ष, त्र, ज्ञ, श्र, प्र, स्त, द्य, ष्ट) cleanly without dropping the half-consonant.",
    howToSpeak:
      "Keep a steady unhurried cadence. Think of gliding through each joined consonant with relaxed lips and open vowels.",
    emphasisWords: ["प्रयत्न", "दृष्टिकोण", "श्रृंखला", "आत्मविश्वास", "प्रस्तुति"],
    pauseNotes: "Pause cleanly at | between cluster-heavy phrases.",
    mistakesToAvoid: [
      "Inserting extra vowels inside conjuncts or skipping half letters.",
      "Tensing your jaw on long Sanskrit-root Hindi words.",
    ],
    annotatedText:
      "∧ निरंतर **प्रयत्न** और सकारात्मक **दृष्टिकोण** से | हर जटिल लक्ष्य प्राप्त किया जा सकता है। ‖ ∧ विचारों की स्पष्ट **श्रृंखला** | किसी भी **प्रस्तुति** को अत्यंत प्रभावशाली बनाती है। ‖ ∧ जब ज्ञान, श्रम और **आत्मविश्वास** एक साथ जुड़ते हैं, | तब भाषा में अद्भुत स्पष्टता और शक्ति आती है।",
    plainText:
      "निरंतर प्रयत्न और सकारात्मक दृष्टिकोण से हर जटिल लक्ष्य प्राप्त किया जा सकता है। विचारों की स्पष्ट श्रृंखला किसी भी प्रस्तुति को अत्यंत प्रभावशाली बनाती है। जब ज्ञान, श्रम और आत्मविश्वास एक साथ जुड़ते हैं, तब भाषा में अद्भुत स्पष्टता और शक्ति आती है।",
    romanizedText:
      "Nirantar prayatna aur sakaaraatmak drishtikon se har jatil lakshya praapt kiya ja sakta hai. Vichaaron ki spasht shrinkhala kisi bhi prastuti ko atyant prabhaavshaali banaati hai. Jab gyaan, shram aur aatmavishwas ek saath judte hain, tab bhaasha mein adbhut spashtata aur shakti aati hai.",
  },

  // ---- 7. Paragraph (Beginner — Calm Authority & Airflow Linking, Anti-Stammering) ----
  {
    id: "cm-hi-para-beg-1",
    language: "hi",
    title: "Hindi Continuous Airflow & Calm Pacing",
    materialType: "paragraph",
    difficulty: "beginner",
    skills: ["fluency", "pausesBreathing", "pacing"],
    durationSec: 80,
    reps: 2,
    targetWpm: 108,
    focusTags: ["stammering"],
    category: "fluency",
    whatToDo:
      "Link words within each short Hindi phrase on one smooth, unbroken ribbon of breath, then pause calmly at every | and ∧.",
    howToSpeak:
      "Never stop your airflow mid-phrase. Let words flow gently together until the pause mark, then take an unhurried breath.",
    emphasisWords: ["रफ़्तार", "ठहराव", "सहज", "प्रवाह"],
    pauseNotes: "Treat every | as a calm 0.5-second reset and every ‖ as a full 1-second pause.",
    mistakesToAvoid: [
      "Holding breath tightly between words.",
      "Feeling pressured to fill every second with sound.",
    ],
    annotatedText:
      "∧ बहुत से लोग सोचते हैं | कि तेज़ बोलने से वे ज़्यादा समझदार लगते हैं। ‖ ∧ लेकिन सच इसके ठीक उल्टा है। ‖ ∧ जब आपकी **रफ़्तार** शांत होती है | और वाक्यों के बीच हल्का **ठहराव** होता है, | तो आपकी हर बात ज़्यादा वज़नदार लगती है। ‖ ∧ शांत साँस के साथ बोलने से | आवाज़ में एक **सहज** और सुंदर **प्रवाह** आ जाता है। ‖ ∧ याद रखिए, | सुनने वाले को आपकी जल्दबाज़ी नहीं, | आपकी स्पष्टता पसंद आती है।",
    plainText:
      "बहुत से लोग सोचते हैं कि तेज़ बोलने से वे ज़्यादा समझदार लगते हैं। लेकिन सच इसके ठीक उल्टा है। जब आपकी रफ़्तार शांत होती है और वाक्यों के बीच हल्का ठहराव होता है, तो आपकी हर बात ज़्यादा वज़नदार लगती है। शांत साँस के साथ बोलने से आवाज़ में एक सहज और सुंदर प्रवाह आ जाता है। याद रखिए, सुनने वाले को आपकी जल्दबाज़ी नहीं, आपकी स्पष्टता पसंद आती है।",
    romanizedText:
      "Bahut se log sochte hain ki tez bolne se ve zyaada samajhdaar lagte hain. Lekin sach iske theek ulta hai. Jab aapki raftaar shaant hoti hai aur vaakyon ke beech halka thehraav hota hai, to aapki har baat zyaada vazandaar lagti hai. Shaant saans ke saath bolne se aawaaz mein ek sahaj aur sundar pravaah aa jaata hai. Yaad rakhiye, sunne waale ko aapki jaldbaazi nahi, aapki spashtata pasand aati hai.",
  },

  // ---- 8. Paragraph (Intermediate — Pull-Out Tension Release Drill) ----
  {
    id: "cm-hi-para-int-1",
    language: "hi",
    title: "Hindi Tension Release & Smooth Recovery",
    materialType: "paragraph",
    difficulty: "intermediate",
    skills: ["fluency", "confidence", "pausesBreathing"],
    durationSec: 85,
    reps: 2,
    targetWpm: 112,
    focusTags: ["stammering"],
    category: "fluency",
    whatToDo:
      "Practice staying completely composed even if a word feels tight: soften the sound, ease out the breath, and glide smoothly into the next vowel.",
    howToSpeak:
      "Keep your jaw loose and shoulders low. If a word catches, never back up and repeat the whole phrase — release the tension right there and move forward.",
    emphasisWords: ["नियंत्रण", "संतुलन", "धैर्य", "आगे"],
    pauseNotes: "Take a deliberate relaxing pause at every ∧.",
    mistakesToAvoid: [
      "Fighting a stuck syllable with extra throat force.",
      "Backing up to restart sentences from the beginning.",
    ],
    annotatedText:
      "∧ बोलते समय अगर कभी कोई शब्द अटकने लगे, | तो घबराने की कोई ज़रूरत नहीं है। ‖ ∧ उसी पल अपने जबड़े और कंधों को ढीला छोड़ें | और हल्की साँस के साथ शब्द को कोमलता से पूरा करें। ‖ ∧ यही छोटा-सा **नियंत्रण** | आपके भीतर गहरा **संतुलन** पैदा करता है। ‖ ∧ हर बार जब आप **धैर्य** रखकर रुकते नहीं, | बल्कि शांति से **आगे** बढ़ जाते हैं, | तब आपका दिमाग सीख लेता है | कि बोलना सुरक्षित और आसान है।",
    plainText:
      "बोलते समय अगर कभी कोई शब्द अटकने लगे, तो घबराने की कोई ज़रूरत नहीं है। उसी पल अपने जबड़े और कंधों को ढीला छोड़ें और हल्की साँस के साथ शब्द को कोमलता से पूरा करें। यही छोटा-सा नियंत्रण आपके भीतर गहरा संतुलन पैदा करता है। हर बार जब आप धैर्य रखकर रुकते नहीं, बल्कि शांति से आगे बढ़ जाते हैं, तब आपका दिमाग सीख लेता है कि बोलना सुरक्षित और आसान है।",
    romanizedText:
      "Bolte samay agar kabhi koi shabd atakne lage, to ghabraane ki koi zaroorat nahi hai. Usi pal apne jabde aur kandhon ko dheela chhodein aur halki saans ke saath shabd ko komalta se poora karein. Yahi chhota-sa niyantran aapke bheetar gehra santulan paida karta hai. Har baar jab aap dhairya rakhkar rukte nahi, balki shaanti se aage badh jaate hain, tab aapka dimaag seekh leta hai ki bolna surakshit aur aasaan hai.",
  },

  // ---- 9. Paragraph (Advanced — Persuasive Hindi Briefing) ----
  {
    id: "cm-hi-para-adv-1",
    language: "hi",
    title: "Hindi Structured Explanation — Clear Authority",
    materialType: "paragraph",
    difficulty: "advanced",
    skills: ["projection", "expression", "clarity", "pacing"],
    durationSec: 90,
    reps: 1,
    targetWpm: 122,
    category: "reading",
    whatToDo:
      "Deliver this structured Hindi explanation with clear vocal projection, crisp transitions ('पहला', 'दूसरा', 'तीसरा'), and confident downward inflection at sentence endings.",
    howToSpeak:
      "Project toward the back of the room while staying warm and conversational. Pause briefly after every numbered marker so listeners absorb each point.",
    emphasisWords: ["पहला", "दूसरा", "तीसरा", "परिणाम"],
    pauseNotes: "Pause 0.6s right after 'पहला', 'दूसरा', and 'तीसरा' to anchor structure.",
    mistakesToAvoid: [
      "Trailing off in volume on the last two words of a sentence.",
      "Running all three points together without pausing.",
    ],
    annotatedText:
      "∧ किसी भी बड़े लक्ष्य को पाने के लिए | तीन चीज़ें सबसे ज़्यादा मायने रखती हैं। ‖ ∧ **पहला**, | एक स्पष्ट दिशा — | ताकि आपकी ऊर्जा इधर-उधर न भटके। ‖ ∧ **दूसरा**, | रोज़ का छोटा लेकिन नियमित अभ्यास — | क्योंकि बड़े **परिणाम** एक दिन के जोश से नहीं, | बल्कि लगातार अनुशासन से मिलते हैं। ‖ ∧ और **तीसरा**, | अपनी गलतियों से सीखने की ईमानदार आदत। ‖ ∧ जब ये तीनों बातें साथ जुड़ जाती हैं, | तो प्रगति रुक नहीं सकती।",
    plainText:
      "किसी भी बड़े लक्ष्य को पाने के लिए तीन चीज़ें सबसे ज़्यादा मायने रखती हैं। पहला, एक स्पष्ट दिशा — ताकि आपकी ऊर्जा इधर-उधर न भटके। दूसरा, रोज़ का छोटा लेकिन नियमित अभ्यास — क्योंकि बड़े परिणाम एक दिन के जोश से नहीं, बल्कि लगातार अनुशासन से मिलते हैं। और तीसरा, अपनी गलतियों से सीखने की ईमानदार आदत। जब ये तीनों बातें साथ जुड़ जाती हैं, तो प्रगति रुक नहीं सकती।",
    romanizedText:
      "Kisi bhi bade lakshya ko paane ke liye teen cheezein sabse zyaada maayne rakhti hain. Pehla, ek spasht disha — taaki aapki oorja idhar-udhar na bhatke. Doosra, roz ka chhota lekin niyamit abhyaas — kyunki bade parinaam ek din ke josh se nahi, balki lagaataar anushaasan se milte hain. Aur teesra, apni galtiyon se seekhne ki imaandaar aadat. Jab ye teeno baatein saath jud jaati hain, to pragati ruk nahi sakti.",
  },

  // ---- 10. Storytelling (Hindi YouTube Hook & On-Camera Intro!) ----
  {
    id: "cm-hi-yt-hook",
    language: "hi",
    title: "Hindi YouTube Video Intro & Hook — On-Camera Confidence",
    materialType: "storytelling",
    difficulty: "beginner",
    skills: ["confidence", "expression", "fluency", "projection"],
    durationSec: 75,
    reps: 2,
    targetWpm: 118,
    focusTags: ["youtube", "stammering"],
    category: "confidence",
    whatToDo:
      "Look straight into your camera lens (or a spot at eye level), smile gently, and deliver this Hindi YouTube hook as if talking directly to ONE friend.",
    howToSpeak:
      "Start with calm warmth — never fake shouting! Use expressive pitch lift on questions, keep your pace steady around 115–120 WPM, and pause cleanly right after the hook.",
    emphasisWords: ["असली", "गलती", "तीन", "बदलाव"],
    pauseNotes: "Hold a confident 0.8s beat right after the opening question so the hook lands.",
    mistakesToAvoid: [
      "Speaking at 160 WPM in the first 5 seconds out of camera nerves.",
      "Dropping your eye line or muttering the call to action.",
    ],
    annotatedText:
      "∧ क्या आपके साथ भी ऐसा होता है | कि कैमरा ऑन होते ही | दिमाग के सारे अच्छे विचार अचानक गायब हो जाते हैं? ‖ ∧ सच कहूँ तो, | ज़्यादातर क्रिएटर्स यही एक **असली** **गलती** करते हैं — | वे कैमरे के सामने खुद को परफ़ेक्ट दिखाने के चक्कर में | बहुत तेज़ बोलने लगते हैं। ‖ ∧ आज के इस वीडियो में | मैं आपको **तीन** ऐसे आसान तरीके बताऊँगा, | जिनसे आपकी आवाज़ में पहले ही हफ़्ते से | एक साफ और आत्मविश्वासी **बदलाव** नज़र आएगा। ‖ ∧ तो चलिए, | बिना समय गँवाए सीधे पहले पॉइंट से शुरू करते हैं।",
    plainText:
      "क्या आपके साथ भी ऐसा होता है कि कैमरा ऑन होते ही दिमाग के सारे अच्छे विचार अचानक गायब हो जाते हैं? सच कहूँ तो, ज़्यादातर क्रिएटर्स यही एक असली गलती करते हैं — वे कैमरे के सामने खुद को परफ़ेक्ट दिखाने के चक्कर में बहुत तेज़ बोलने लगते हैं। आज के इस वीडियो में मैं आपको तीन ऐसे आसान तरीके बताऊँगा, जिनसे आपकी आवाज़ में पहले ही हफ़्ते से एक साफ और आत्मविश्वासी बदलाव नज़र आएगा। तो चलिए, बिना समय गँवाए सीधे पहले पॉइंट से शुरू करते हैं।",
    romanizedText:
      "Kya aapke saath bhi aisa hota hai ki camera on hote hi dimaag ke saare achhe vichaar achaanak gaayab ho jaate hain? Sach kahoon to, zyaadatar creators yahi ek asli galti karte hain — ve camera ke saamne khud ko perfect dikhaane ke chakkar mein bahut tez bolne lagte hain. Aaj ke is video mein main aapko teen aise aasaan tareeke bataaunga, jinse aapki aawaaz mein pehle hi hafte se ek saaf aur aatmavishwasi badlaav nazar aayega. To chaliye, bina samay ganvaaye seedhe pehle point se shuru karte hain.",
  },

  // ---- 11. Storytelling (Intermediate — Expressive Hindi Mini-Story) ----
  {
    id: "cm-hi-story-int-1",
    language: "hi",
    title: "Hindi Mini-Story — The First Stage Speech",
    materialType: "storytelling",
    difficulty: "intermediate",
    skills: ["expression", "pausesBreathing", "fluency"],
    durationSec: 95,
    reps: 1,
    targetWpm: 118,
    focusTags: ["youtube"],
    category: "storytelling",
    whatToDo:
      "Tell this short personal story with genuine vocal variety: slightly quieter during the tense moment, slower on the turning point, and warm at the resolution.",
    howToSpeak:
      "Paint the scene visually rather than reciting words. Pause right before the turning point ('और तभी...') so your listener leans in.",
    emphasisWords: ["सन्नाटा", "गहरी साँस", "मुस्कुराया", "डर"],
    pauseNotes: "Stretch the pause right after 'सन्नाटा' and before 'और तभी' for storytelling impact.",
    mistakesToAvoid: [
      "Reading the turning point at the exact same flat speed as the setup.",
      "Adding 'मतलब' or 'तो' fillers while shifting scenes.",
    ],
    annotatedText:
      "∧ मुझे आज भी अपना पहला मंच याद है। ‖ ∧ हाथ में माइक था, | सामने पचास लोग बैठे थे, | और पूरे कमरे में अचानक गहरा **सन्नाटा** छा गया। ‖ ∧ एक पल के लिए लगा कि मैं अपनी पहली लाइन ही भूल गया हूँ। ‖ ∧ मैंने जल्दबाज़ी नहीं की। | ∧ मैंने चुपचाप एक **गहरी साँस** ली, | सामने बैठे एक व्यक्ति की तरफ देखकर हल्का-सा **मुस्कुराया**, | और धीरे से पहला वाक्य बोल दिया। ‖ ∧ और तभी | मेरे भीतर का सारा **डर** गायब हो गया। ‖ ∧ उस दिन मैंने सीखा — | आत्मविश्वास डर के न होने का नाम नहीं है, | बल्कि डर के बावजूद शांत रहकर बोलने की कला है।",
    plainText:
      "मुझे आज भी अपना पहला मंच याद है। हाथ में माइक था, सामने पचास लोग बैठे थे, और पूरे कमरे में अचानक गहरा सन्नाटा छा गया। एक पल के लिए लगा कि मैं अपनी पहली लाइन ही भूल गया हूँ। मैंने जल्दबाज़ी नहीं की। मैंने चुपचाप एक गहरी साँस ली, सामने बैठे एक व्यक्ति की तरफ देखकर हल्का-सा मुस्कुराया, और धीरे से पहला वाक्य बोल दिया। और तभी मेरे भीतर का सारा डर गायब हो गया। उस दिन मैंने सीखा — आत्मविश्वास डर के न होने का नाम नहीं है, बल्कि डर के बावजूद शांत रहकर बोलने की कला है।",
    romanizedText:
      "Mujhe aaj bhi apna pehla manch yaad hai. Haath mein mic tha, saamne pachaas log baithe the, aur poore kamre mein achaanak gehra sannaata chha gaya. Ek pal ke liye laga ki main apni pehli line hi bhool gaya hoon. Maine jaldbaazi nahi ki. Maine chupchaap ek gehri saans li, saamne baithe ek vyakti ki taraf dekhkar halka-sa muskuraaya, aur dheere se pehla vaakya bol diya. Aur tabhi mere bheetar ka saara dar gaayab ho gaya. Us din maine seekha — aatmavishwas dar ke na hone ka naam nahi hai, balki dar ke baavjood shaant rehkar bolne ki kala hai.",
  },

  // ---- 12. Long Passage (Sustained Calm 108 WPM Endurance) ----
  {
    id: "cm-hi-pass-int-1",
    language: "hi",
    title: "Hindi Long-Form Flow — The Craft of Calm Speaking (108 WPM)",
    materialType: "long_passage",
    difficulty: "intermediate",
    skills: ["pacing", "pausesBreathing", "fluency", "projection"],
    durationSec: 120,
    reps: 1,
    targetWpm: 108,
    focusTags: ["stammering", "youtube"],
    category: "pacing",
    whatToDo:
      "Maintain an unhurried, steady 100–115 WPM pace from the first sentence to the final line without speeding up in the second half.",
    howToSpeak:
      "Breathe calmly at every ∧ mark before you run out of air. Keep your posture tall and your tone warm and grounded.",
    emphasisWords: ["संतुलन", "ऊर्जा", "कनेक्शन", "भरोसा"],
    pauseNotes: "Pause 1 full second between paragraphs so your voice never feels breathless.",
    mistakesToAvoid: [
      "Starting slow and accidentally accelerating to 145 WPM halfway through.",
      "Taking noisy gasping breaths instead of quiet nasal inhales.",
    ],
    annotatedText:
      "∧ जब हम किसी बेहतरीन वक्ता या यूट्यूबर को सुनते हैं, | तो अक्सर हमें उनकी आवाज़ में एक अनोखा **संतुलन** महसूस होता है। ‖ ∧ वे न तो बहुत तेज़ भागते हैं | और न ही शब्दों को अधूरा छोड़ते हैं। ‖ ∧ उनकी हर बात में एक शांत **ऊर्जा** होती है, | जो सुनने वाले को बिना थके अंत तक जोड़े रखती है। ‖ ∧ यह कौशल किसी को जन्म से नहीं मिलता। | ∧ हर स्पष्ट वक्ता ने पहले अपनी साँस पर ध्यान देना सीखा, | फिर अपनी गति को थोड़ा धीमा किया, | और धीरे-धीरे अपनी आवाज़ को सुनना शुरू किया। ‖ ∧ जब आप अपनी बात बिना हड़बड़ी के रखते हैं, | तो दर्शक और आपके बीच एक सच्चा **कनेक्शन** बनता है। ‖ ∧ और यही कनेक्शन | धीरे-धीरे गहरे **भरोसे** में बदल जाता है।",
    plainText:
      "जब हम किसी बेहतरीन वक्ता या यूट्यूबर को सुनते हैं, तो अक्सर हमें उनकी आवाज़ में एक अनोखा संतुलन महसूस होता है। वे न तो बहुत तेज़ भागते हैं और न ही शब्दों को अधूरा छोड़ते हैं। उनकी हर बात में एक शांत ऊर्जा होती है, जो सुनने वाले को बिना थके अंत तक जोड़े रखती है। यह कौशल किसी को जन्म से नहीं मिलता। हर स्पष्ट वक्ता ने पहले अपनी साँस पर ध्यान देना सीखा, फिर अपनी गति को थोड़ा धीमा किया, और धीरे-धीरे अपनी आवाज़ को सुनना शुरू किया। जब आप अपनी बात बिना हड़बड़ी के रखते हैं, तो दर्शक और आपके बीच एक सच्चा कनेक्शन बनता है। और यही कनेक्शन धीरे-धीरे गहरे भरोसे में बदल जाता है।",
    romanizedText:
      "Jab hum kisi behtareen vakta ya YouTuber ko sunte hain, to aksar humein unki aawaaz mein ek anokha santulan mehsoos hota hai. Ve na to bahut tez bhaagte hain aur na hi shabdon ko adhoora chhodte hain. Unki har baat mein ek shaant oorja hoti hai, jo sunne waale ko bina thake ant tak jode rakhti hai. Yeh kaushal kisi ko janm se nahi milta. Har spasht vakta ne pehle apni saans par dhyaan dena seekha, phir apni gati ko thoda dheema kiya, aur dheere-dheere apni aawaaz ko sunna shuru kiya. Jab aap apni baat bina hadbadi ke rakhte hain, to darshak aur aapke beech ek sachcha connection banta hai. Aur yahi connection dheere-dheere gehre bharose mein badal jaata hai.",
  },

  // ---- 13. Conversation (Natural Everyday Hindi Dialogue) ----
  {
    id: "cm-hi-conv-beg-1",
    language: "hi",
    title: "Hindi Warm Conversation & Confident Introductions",
    materialType: "conversation",
    difficulty: "beginner",
    skills: ["confidence", "fluency", "expression"],
    durationSec: 75,
    reps: 2,
    targetWpm: 118,
    category: "conversation",
    whatToDo:
      "Practice speaking these warm, natural Hindi conversation lines smoothly without rushing through your introduction or trailing off on questions.",
    howToSpeak:
      "Use a friendly, relaxed tone with gentle rising inflection on questions ('कैसे हैं?', 'क्या विचार है?').",
    emphasisWords: ["नमस्ते", "खुशी", "विचार", "धन्यवाद"],
    pauseNotes: "Leave a natural 1-second listening pause at every ‖ mark as if someone just replied.",
    mistakesToAvoid: [
      "Mumbling your own introduction quickly out of shyness.",
      "Filling short pauses with 'मतलब' or 'वो'.",
    ],
    annotatedText:
      "∧ **नमस्ते**, | आपसे मिलकर बहुत **खुशी** हुई। ‖ ∧ मैं इन दिनों अपने कम्युनिकेशन और कंटेंट क्रिएशन पर काम कर रहा हूँ। ‖ ∧ आपका यह प्रोजेक्ट वाकई बहुत दिलचस्प लग रहा है — | इसकी शुरुआत करने का **विचार** आपको कैसे आया? ‖ ∧ यह सुनकर बहुत अच्छा लगा। | ∧ आपका समय देने के लिए दिल से **धन्यवाद**, | जल्द ही फिर बात करते हैं।",
    plainText:
      "नमस्ते, आपसे मिलकर बहुत खुशी हुई। मैं इन दिनों अपने कम्युनिकेशन और कंटेंट क्रिएशन पर काम कर रहा हूँ। आपका यह प्रोजेक्ट वाकई बहुत दिलचस्प लग रहा है — इसकी शुरुआत करने का विचार आपको कैसे आया? यह सुनकर बहुत अच्छा लगा। आपका समय देने के लिए दिल से धन्यवाद, जल्द ही फिर बात करते हैं।",
    romanizedText:
      "Namaste, aapse milkar bahut khushi hui. Main in dinon apne communication aur content creation par kaam kar raha hoon. Aapka yeh project waakai bahut dilchasp lag raha hai — iski shuruaat karne ka vichaar aapko kaise aaya? Yeh sunkar bahut achha laga. Aapka samay dene ke liye dil se dhanyavaad, jald hi phir baat karte hain.",
  },

  // ---- 14. Impromptu (Hindi YouTube Unscripted 60s Talking-Head Drill!) ----
  {
    id: "cm-hi-yt-impromptu",
    language: "hi",
    title: "Hindi YouTube Unscripted Talking-Head Drill (60s)",
    materialType: "impromptu",
    difficulty: "intermediate",
    skills: ["confidence", "fluency", "pacing", "expression"],
    durationSec: 60,
    reps: 1,
    targetWpm: 112,
    focusTags: ["youtube", "stammering"],
    category: "impromptu",
    whatToDo:
      "Speak naturally in Hindi for 60 seconds without reading a script, explaining ONE useful habit, app, or lesson you learned recently — using the 4-step structure below.",
    howToSpeak:
      "Take a calm 1-second silent pause between steps instead of saying 'मतलब', 'बेसिकली', or 'हम्म'. Speak at a relaxed pace directly to one viewer.",
    emphasisWords: ["मुख्य बात", "उदाहरण", "निष्कर्ष"],
    pauseNotes: "Pause cleanly for 1 full second before moving from one bullet point to the next.",
    mistakesToAvoid: [
      "Trying to memorize exact sentences word-for-word.",
      "Filling thinking gaps with 'मतलब' or 'वो क्या है'.",
    ],
    structureSteps: [
      "1. Hook (10s): Start with one simple question or relatable problem in Hindi ('क्या आपने कभी सोचा है कि...').",
      "2. Main Idea (15s): State your ONE core point clearly ('असली बात यह है कि...').",
      "3. Real Example (20s): Share one quick real-life example or story ('जैसे मेरे साथ हाल ही में...').",
      "4. Calm Takeaway (15s): End with one clear line viewers can try today ('तो आज बस एक छोटा कदम उठाइए...').",
    ],
    annotatedText:
      "∧ विषय: कोई एक **अच्छी आदत** या सीख बताइए जिसने आपकी मदद की। ‖ ∧ १. **हुक** — एक छोटे सवाल से शुरू करें। ‖ ∧ २. **मुख्य बात** — एक साफ विचार रखें। ‖ ∧ ३. **उदाहरण** — अपने अनुभव से एक छोटा किस्सा सुनाएँ। ‖ ∧ ४. **निष्कर्ष** — दर्शक के लिए एक आसान सलाह देकर शांत समापन करें।",
    plainText:
      "आज मैं आपको एक ऐसी आसान आदत के बारे में बताऊँगा जिसने मेरे रोज़ के काम में बहुत बड़ा सुधार किया है। मुख्य बात यह है कि छोटे और नियमित कदम हमेशा बड़े बदलाव लाते हैं। उदाहरण के लिए, रोज़ केवल दस मिनट शांत अभ्यास करने से मेरा आत्मविश्वास लगातार बढ़ा है। निष्कर्ष यह है कि आज ही एक छोटा कदम शुरू कीजिए।",
    romanizedText:
      "Aaj main aapko ek aisi aasaan aadat ke baare mein bataaunga jisne mere roz ke kaam mein bahut bada sudhaar kiya hai. Mukhya baat yeh hai ki chhote aur niyamit kadam hamesha bade badlaav laate hain. Udaaharan ke liye, roz keval das minute shaant abhyaas karne se mera aatmavishwas lagaataar badha hai. Nishkarsh yeh hai ki aaj hi ek chhota kadam shuru kijiye.",
  },
];
