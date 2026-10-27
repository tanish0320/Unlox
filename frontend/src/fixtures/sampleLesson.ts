import { LessonPlan } from "../components/scenes/sceneTypes";

export const sampleLesson: LessonPlan = {
  schema_version: "1.0",
  title: "How Python Loops Work",
  level: "beginner",
  language: "en",
  target_duration_seconds: 60,
  scenes: [
    {
      id: "scene-1",
      type: "title_card",
      heading: "How Python Loops Work",
      subtitle: "Understanding Iteration & Repetition",
      tag: "Python Basics",
      narration: "Welcome to this lesson on Python loops. A loop automatically repeats a block of instructions for each item in a collection.",
    },
    {
      id: "scene-2",
      type: "diagram",
      heading: "Follow the Loop Iterations",
      narration: "The loop starts, processes each value one by one, and finishes when all items have been visited.",
      nodes: [
        { id: "node-start", label: "Start Loop" },
        { id: "node-check", label: "Check Sequence" },
        { id: "node-body", label: "Execute Body" },
        { id: "node-end", label: "Finish Loop" },
      ],
      edges: [
        { from: "node-start", to: "node-check", label: "Initialize" },
        { from: "node-check", to: "node-body", label: "Next item" },
        { from: "node-body", to: "node-check", label: "Repeat" },
        { from: "node-check", to: "node-end", label: "Sequence done" },
      ],
    },
    {
      id: "scene-3",
      type: "code_walkthrough",
      heading: "Executing the For Loop",
      filename: "loop_example.py",
      language: "python",
      code: "for i in range(3):\n    print('Current number:', i)\nprint('Done!')",
      highlight_lines: [1, 2, 3],
      narration: "Line 1 generates indices 0, 1, and 2. Line 2 prints each number during every cycle. Finally, Line 3 announces completion.",
    },
  ],
};

export const sampleLessonHindi: LessonPlan = {
  schema_version: "1.0",
  title: "पायथन लूप कैसे काम करता है",
  level: "beginner",
  language: "hi",
  target_duration_seconds: 60,
  scenes: [
    {
      id: "scene-hi-1",
      type: "title_card",
      heading: "पायथन लूप कैसे काम करता है?",
      subtitle: "दोहराव और अनुक्रम को समझें",
      tag: "पायथन मूल बातें",
      narration: "पायथन लूप के इस पाठ में आपका स्वागत है। लूप किसी निर्देश को बार-बार दोहराने का एक आसान तरीका है।",
    },
    {
      id: "scene-hi-2",
      type: "diagram",
      heading: "लूप के चरण देखें",
      narration: "लूप शुरू होता है, प्रत्येक मान की जाँच करता है, कार्य निष्पादित करता है और समाप्त होता है।",
      nodes: [
        { id: "hi-start", label: "आरंभ" },
        { id: "hi-check", label: "जाँच करें" },
        { id: "hi-body", label: "कोड चलाएँ" },
        { id: "hi-end", label: "समाप्त" },
      ],
      edges: [
        { from: "hi-start", to: "hi-check", label: "शुरुआत" },
        { from: "hi-check", to: "hi-body", label: "अगला मान" },
        { from: "hi-body", to: "hi-check", label: "पुनरावृत्ति" },
        { from: "hi-check", to: "hi-end", label: "पूर्ण" },
      ],
    },
    {
      id: "scene-hi-3",
      type: "code_walkthrough",
      heading: "पायथन कोड को समझें",
      filename: "loop_hi.py",
      language: "python",
      code: "for i in range(3):\n    print('संख्या:', i)\nprint('लूप समाप्त')",
      highlight_lines: [1, 2, 3],
      narration: "पहली पंक्ति शून्य, एक और दो उत्पन्न करती है। दूसरी पंक्ति उन्हें स्क्रीन पर दिखाती है।",
    },
  ],
};

export const sampleLessonKannada: LessonPlan = {
  schema_version: "1.0",
  title: "ಪೈಥಾನ್ ಲೂಪ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
  level: "beginner",
  language: "kn",
  target_duration_seconds: 60,
  scenes: [
    {
      id: "scene-kn-1",
      type: "title_card",
      heading: "ಪೈಥಾನ್ ಲೂಪ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?",
      subtitle: "ಪುನರಾವರ್ತನೆಯ ಮೂಲ ತತ್ವಗಳನ್ನು ತಿಳಿಯಿರಿ",
      tag: "ಪೈಥಾನ್ ಪಾಠ",
      narration: "ಪೈಥಾನ್ ಲೂಪ್ ಪಾಠಕ್ಕೆ ಸ್ವಾಗತ. ಲೂಪ್ ಒಂದೇ ಸೂಚನೆಯನ್ನು ಅನುಕ್ರಮವಾಗಿ ಪುನರಾವರ್ತಿಸುತ್ತದೆ.",
    },
    {
      id: "scene-kn-2",
      type: "diagram",
      heading: "ಲೂಪ್ ಹಂತಗಳನ್ನು ಗಮನಿಸಿ",
      narration: "ಲೂಪ್ ಪ್ರಾರಂಭವಾಗಿ, ಪ್ರತಿಯೊಂದು ಮೌಲ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ, ಪೂರ್ಣಗೊಳಿಸುತ್ತದೆ.",
      nodes: [
        { id: "kn-start", label: "ಪ್ರಾರಂಭ" },
        { id: "kn-check", label: "ಪರಿಶೀಲನೆ" },
        { id: "kn-body", label: "ಕಾರ್ಯಗತಗೊಳಿಸಿ" },
        { id: "kn-end", label: "ಮುಕ್ತಾಯ" },
      ],
      edges: [
        { from: "kn-start", to: "kn-check", label: "ಆರಂಭ" },
        { from: "kn-check", to: "kn-body", label: "ಮುಂದಿನದು" },
        { from: "kn-body", to: "kn-check", label: "ಪುನರಾವರ್ತನೆ" },
        { from: "kn-check", to: "kn-end", label: "ಮುಗಿಯಿತು" },
      ],
    },
    {
      id: "scene-kn-3",
      type: "code_walkthrough",
      heading: "ಕೋಡ್ ಹಂತಗಳು",
      filename: "loop_kn.py",
      language: "python",
      code: "for i in range(3):\n    print('ಸಂಖ್ಯೆ:', i)\nprint('ಮುಕ್ತಾಯ')",
      highlight_lines: [1, 2],
      narration: "ರೇಂಜ್ ಮೂರು ಮೌಲ್ಯಗಳನ್ನು ನೀಡುತ್ತದೆ: ಸೊನ್ನೆ, ಒಂದು ಮತ್ತು ಎರಡು.",
    },
  ],
};
