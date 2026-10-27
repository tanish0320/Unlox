import { LessonNotes } from "../components/scenes/sceneTypes";

export const sampleNotes: LessonNotes = {
  schema_version: "1.0",
  title: "Mastering Python For Loops",
  topic: "Computer Programming",
  language: "en",
  level: "beginner",
  summary: "A concise, visual reference guide explaining how Python for loops iterate over sequences using range(), process loop bodies, and terminate cleanly.",
  learning_objectives: [
    "Understand the core concept of programmatic repetition and iteration.",
    "Learn the syntax and semantics of Python's 'for in' construct.",
    "Understand how range(n) produces integer sequences.",
    "Trace variable values across discrete loop cycles.",
  ],
  key_concepts: [
    {
      term: "Iteration",
      definition: "The repetitive execution of a sequence of programming statements.",
    },
    {
      term: "Iterable",
      definition: "Any object capable of returning its members one at a time (e.g. lists, ranges, strings).",
    },
    {
      term: "Loop Variable",
      definition: "The variable (such as 'i') that takes on the value of each successive element in the iterable.",
    },
    {
      term: "Loop Body",
      definition: "The indented block of code executed once for every element in the sequence.",
    },
  ],
  step_by_step_explanation: [
    {
      step: 1,
      title: "Sequence Initialization",
      content: "Python evaluates the range(3) expression, preparing an iterable sequence consisting of values [0, 1, 2].",
    },
    {
      step: 2,
      title: "First Iteration (i = 0)",
      content: "Variable 'i' is assigned 0. The indented body executes, printing 'Current number: 0'.",
    },
    {
      step: 3,
      title: "Second Iteration (i = 1)",
      content: "Variable 'i' receives 1. The body runs again, printing 'Current number: 1'.",
    },
    {
      step: 4,
      title: "Third Iteration (i = 2)",
      content: "Variable 'i' receives 2. The body executes, printing 'Current number: 2'.",
    },
    {
      step: 5,
      title: "Termination",
      content: "No further items remain in range(3). Control exits the loop and proceeds to the unindented print('Done!') statement.",
    },
  ],
  examples: [
    {
      description: "Basic count loop using range(3)",
      code: "for i in range(3):\n    print(i)",
      output: "0\n1\n2",
    },
    {
      description: "Looping through an explicit list of fruits",
      code: "fruits = ['apple', 'banana', 'mango']\nfor item in fruits:\n    print(item)",
      output: "apple\nbanana\nmango",
    },
  ],
  key_takeaways: [
    "Loops prevent redundant code by automating repetitive computations.",
    "range(n) starts counting at 0 and stops at n - 1.",
    "Indentation defines the boundary of the loop body in Python.",
  ],
  revision_questions: [
    {
      question: "What values does range(4) produce?",
      answer: "0, 1, 2, and 3 (four values total, starting at 0).",
    },
    {
      question: "How does Python determine which lines belong inside the loop?",
      answer: "Through indentation (typically 4 spaces) following the colon (:).",
    },
    {
      question: "What happens when the iterable sequence has no more items?",
      answer: "The loop terminates and execution continues with the next statement following the loop block.",
    },
  ],
  generated_artifacts: [
    { type: "video/mp4", filename: "lesson.mp4" },
    { type: "application/json", filename: "lesson-notes.json" },
  ],
  model_metadata: {
    planner: "ollama/llama3.2-3b",
    translator: "indictrans2-local",
    tts: "kokoro-onnx",
    fallback_used: false,
  },
};
