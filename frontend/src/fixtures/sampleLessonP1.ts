import { LessonPlan } from "../components/scenes/sceneTypes";

/**
 * Person 1 Canonical Python Loop Lesson Fixture.
 * Strictly mirrors fixtures/sample-lesson.json and provisional_lesson.py.
 */
export const sampleLessonP1: LessonPlan = {
  schema_version: "1.0.0",
  title: "How a Python loop works",
  topic: "How does a Python loop work?",
  level: "beginner",
  language: "en",
  target_duration_seconds: 60,
  scenes: [
    {
      id: "scene_01",
      type: "title_card",
      heading: "How does a Python loop work?",
      subtitle: "Understanding repetition in programming",
      key_points: [
        "Automate repetitive tasks",
        "Iterate over sequences of data",
        "Control execution flow",
      ],
      narration:
        "A loop repeats an instruction for each value in a sequence. Let's see how Python makes this simple.",
    },
    {
      id: "scene_02",
      type: "code_walkthrough",
      heading: "Step 1: Read the code",
      code: "for i in range(3):\n    print(i)",
      code_language: "python",
      language: "python",
      highlight_lines: [1],
      expected_output: "0\n1\n2",
      output: "0\n1\n2",
      narration:
        "Range of three gives three values: zero, one, and two. The for loop assigns each value to variable i.",
    },
    {
      id: "scene_03",
      type: "diagram",
      heading: "Step 2: Watch each iteration",
      items: [
        "Iteration 1: i = 0 -> print(0)",
        "Iteration 2: i = 1 -> print(1)",
        "Iteration 3: i = 2 -> print(2)",
      ],
      layout: "horizontal",
      narration:
        "Each pass takes the next value, runs print i, and stops when all items in the sequence are exhausted.",
    },
  ],
};

/**
 * Measured Audio Durations and Manifest from Person 1's real SAPI5 audio:
 * outputs/integration_fixtures/en/audio_manifest.json
 */
export const p1AudioManifestDurations: Record<string, number> = {
  scene_01: 7.018,
  scene_02: 7.833,
  scene_03: 6.998,
};
