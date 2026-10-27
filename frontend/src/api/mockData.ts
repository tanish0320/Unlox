import type { LessonResponse, Scene } from './types'

interface MockNotes {
  summary: string
  key_concepts: Array<{ term: string; definition: string }>
  steps: string[]
  key_takeaways: string[]
  revision_questions: Array<{ question: string; answer: string }>
}

interface MockTranslation {
  headings: [string, string, string]
  narration: [string, string, string]
  notes: MockNotes
}

const translations: Record<string, MockTranslation> = {
  en: {
    headings: [
      'Repeat with a Python loop',
      'Use range in a loop',
      'One number at a time',
    ],
    narration: [
      'A loop lets Python repeat an action, so you do not have to write it again and again.',
      'for takes i through range(3). print shows i each time.',
      'i takes the values 0, 1, and 2. After the last value, the loop is done.',
    ],
    notes: {
      summary: 'A for loop repeats its indented block once for each item in a list.',
      key_concepts: [
        { term: 'loop', definition: 'Code that repeats an action.' },
        { term: 'range', definition: 'A Python tool that makes a sequence of numbers.' },
      ],
      steps: ['Use range(3) to make 0, 1, 2.', 'for puts each number in i.', 'print(i) shows the current number.'],
      key_takeaways: ['The loop handles one number at a time.', 'Indent the code that should repeat.'],
      revision_questions: [
        { question: 'What does a for loop do?', answer: 'It repeats code for each item.' },
      ],
    },
  },
  hi: {
    headings: ['Python loop से दोहराएँ', 'loop में range का उपयोग', 'एक बार में एक संख्या'],
    narration: [
      'loop से Python एक काम बार-बार करता है।',
      'for, i को range(3) से एक-एक लेता है। print हर बार i दिखाता है।',
      'i की values 0, 1, 2 हैं। आख़िरी संख्या के बाद loop रुकता है।',
    ],
    notes: {
      summary: 'for loop सूची की हर चीज़ के लिए अपना code दोहराता है।',
      key_concepts: [
        { term: 'loop', definition: 'code को दोहराने का तरीका।' },
        { term: 'range', definition: 'संख्याओं की एक क्रम वाली सूची।' },
      ],
      steps: ['range(3) से 0, 1, 2 बनाएँ।', 'for हर संख्या को i में रखता है।', 'print(i) मौजूदा संख्या दिखाता है।'],
      key_takeaways: ['loop एक बार में एक संख्या लेता है।', 'दोहराने वाले code को अंदर रखें।'],
      revision_questions: [
        { question: 'for loop क्या करता है?', answer: 'यह हर चीज़ के लिए code दोहराता है।' },
      ],
    },
  },
  ta: {
    headings: ['Python loop மூலம் மீண்டும் செய்', 'loop-இல் range பயன்படுத்து', 'ஒரு நேரத்தில் ஒரு எண்'],
    narration: [
      'loop ஒரு செயலை மீண்டும் செய்ய Python-க்கு உதவுகிறது.',
      'for, range(3)-இலிருந்து i-ஐ எடுக்கிறது. print ஒவ்வொரு முறையும் i-ஐ காட்டுகிறது.',
      'i-ன் values 0, 1, 2. கடைசி எண்ணுக்குப் பிறகு loop முடியும்.',
    ],
    notes: {
      summary: 'for loop பட்டியலில் உள்ள ஒவ்வொரு பொருளுக்கும் code-ஐ மீண்டும் செய்கிறது.',
      key_concepts: [
        { term: 'loop', definition: 'ஒரு செயலை மீண்டும் செய்யும் code.' },
        { term: 'range', definition: 'எண்களின் வரிசையை உருவாக்கும் Python கருவி.' },
      ],
      steps: ['range(3) மூலம் 0, 1, 2 உருவாக்கு.', 'for ஒவ்வொரு எண்ணையும் i-ல் வைக்கும்.', 'print(i) தற்போதைய எண்ணைக் காட்டும்.'],
      key_takeaways: ['loop ஒரு நேரத்தில் ஒரு எண்ணை எடுக்கும்.', 'மீண்டும் செய்யும் code-ஐ உள்தள்ளி எழுது.'],
      revision_questions: [
        { question: 'for loop என்ன செய்கிறது?', answer: 'ஒவ்வொரு பொருளுக்கும் code-ஐ மீண்டும் செய்கிறது.' },
      ],
    },
  },
  te: {
    headings: ['Python loop తో మళ్లీ చేయండి', 'loop‌లో range వాడండి', 'ఒక్కసారి ఒక్క సంఖ్య'],
    narration: [
      'loop ఒక పనిని మళ్లీ చేయడానికి Python‌కు సహాయపడుతుంది.',
      'for, range(3) నుంచి i‌ని తీసుకుంటుంది. print ప్రతిసారి i‌ని చూపిస్తుంది.',
      'i విలువలు 0, 1, 2. చివరి సంఖ్య తర్వాత loop ఆగుతుంది.',
    ],
    notes: {
      summary: 'for loop జాబితాలోని ప్రతి వస్తువుకు code‌ను మళ్లీ నడుపుతుంది.',
      key_concepts: [
        { term: 'loop', definition: 'పనిని మళ్లీ చేసే code.' },
        { term: 'range', definition: 'సంఖ్యల వరుసను తయారు చేసే Python సాధనం.' },
      ],
      steps: ['range(3) తో 0, 1, 2 చేయండి.', 'for ఒక్కో సంఖ్యను i‌లో పెడుతుంది.', 'print(i) ప్రస్తుత సంఖ్యను చూపిస్తుంది.'],
      key_takeaways: ['loop ఒక్కసారి ఒక్క సంఖ్యను తీసుకుంటుంది.', 'మళ్లీ నడిచే code‌ను లోపలికి జరిపి రాయండి.'],
      revision_questions: [
        { question: 'for loop ఏమి చేస్తుంది?', answer: 'ప్రతి వస్తువుకు code‌ను మళ్లీ నడుపుతుంది.' },
      ],
    },
  },
  kn: {
    headings: ['Python loop ಮೂಲಕ ಮತ್ತೆ ಮಾಡಿ', 'loop ನಲ್ಲಿ range ಬಳಸಿ', 'ಒಂದು ಬಾರಿ ಒಂದು ಸಂಖ್ಯೆ'],
    narration: [
      'loop ಒಂದು ಕೆಲಸವನ್ನು ಮತ್ತೆ ಮಾಡಲು Python‌ಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
      'for, range(3) ನಿಂದ i ಅನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ. print ಪ್ರತಿ ಬಾರಿ i ಅನ್ನು ತೋರಿಸುತ್ತದೆ.',
      'i ಮೌಲ್ಯಗಳು 0, 1, 2. ಕೊನೆಯ ಸಂಖ್ಯೆಯ ನಂತರ loop ನಿಲ್ಲುತ್ತದೆ.',
    ],
    notes: {
      summary: 'for loop ಪಟ್ಟಿಯ ಪ್ರತಿಯೊಂದು ವಸ್ತುವಿಗೂ code ಅನ್ನು ಮತ್ತೆ ಮಾಡುತ್ತದೆ.',
      key_concepts: [
        { term: 'loop', definition: 'ಕೆಲಸವನ್ನು ಮತ್ತೆ ಮಾಡುವ code.' },
        { term: 'range', definition: 'ಸಂಖ್ಯೆಗಳ ಸರಣಿಯನ್ನು ಮಾಡುವ Python ಸಾಧನ.' },
      ],
      steps: ['range(3) ಬಳಸಿ 0, 1, 2 ಮಾಡಿ.', 'for ಒಂದೊಂದು ಸಂಖ್ಯೆಯನ್ನು i ಗೆ ಹಾಕುತ್ತದೆ.', 'print(i) ಈಗಿನ ಸಂಖ್ಯೆಯನ್ನು ತೋರಿಸುತ್ತದೆ.'],
      key_takeaways: ['loop ಒಂದೊಂದು ಸಂಖ್ಯೆಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ.', 'ಮತ್ತೆ ನಡೆಯುವ code ಅನ್ನು ಒಳಗೆ ಬರೆಯಿರಿ.'],
      revision_questions: [
        { question: 'for loop ಏನು ಮಾಡುತ್ತದೆ?', answer: 'ಪ್ರತಿ ವಸ್ತುವಿಗೂ code ಅನ್ನು ಮತ್ತೆ ಮಾಡುತ್ತದೆ.' },
      ],
    },
  },
}

function createMockLesson(language: string): LessonResponse {
  const translation = translations[language] ?? translations.en
  const scenes: Scene[] = [
    {
      id: 'scene-title',
      type: 'title_card',
      heading: translation.headings[0],
      narration: translation.narration[0],
    },
    {
      id: 'scene-code',
      type: 'code_walkthrough',
      heading: translation.headings[1],
      narration: translation.narration[1],
      code: 'for i in range(3):\n    print(i)',
      highlight_lines: [1, 2],
    },
    {
      id: 'scene-diagram',
      type: 'diagram',
      heading: translation.headings[2],
      narration: translation.narration[2],
      items: ['0', '1', '2'],
    },
  ]

  return {
    lesson_plan: {
      topic: 'Python for loops',
      level: 'beginner',
      language: translations[language] ? language : 'en',
      target_duration_seconds: 17,
      scenes,
    },
    // demo text, not reviewed by a native speaker.
    notes: JSON.stringify(translation.notes),
    artifact_manifest: {
      audio: [
        { scene_id: 'scene-title', audio_url: '', duration_seconds: 5 },
        { scene_id: 'scene-code', audio_url: '', duration_seconds: 6 },
        { scene_id: 'scene-diagram', audio_url: '', duration_seconds: 6 },
      ],
      timings_by_stage: {
        validating: 1500,
        planning: 1700,
        translating: 1700,
        narrating: 1700,
        rendering: 2400,
        exporting: 2000,
        ready: 1000,
      },
    },
  }
}

export const mockLesson = createMockLesson('en')

export function getMockLesson(language: string) {
  return createMockLesson(language)
}
