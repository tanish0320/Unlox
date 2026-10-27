import type { LessonResponse } from './types'

export const mockLesson: LessonResponse = {
  lesson_plan: {
    topic: 'Python for loops',
    level: 'beginner',
    language: 'en',
    target_duration_seconds: 17,
    scenes: [
      {
        id: 'scene-title',
        type: 'title_card',
        heading: 'Repeat with a Python loop',
        narration:
          'A loop lets Python repeat an action, so you do not have to write it again and again.',
      },
      {
        id: 'scene-code',
        type: 'code_walkthrough',
        heading: 'Loop through a short list',
        narration:
          'The for line takes each fruit in turn. The indented line prints that fruit once.',
        code: "fruits = ['apple', 'pear', 'plum']\nfor fruit in fruits:\n    print(fruit)",
        highlight_lines: [2, 3],
      },
      {
        id: 'scene-diagram',
        type: 'diagram',
        heading: 'One item at a time',
        narration:
          'Python moves from apple to pear to plum. After the last item, the loop is done.',
        items: [
          { id: 'apple', label: 'apple' },
          { id: 'pear', label: 'pear' },
          { id: 'plum', label: 'plum' },
        ],
      },
    ],
  },
  notes:
    'A for loop repeats its indented block once for each item in a collection. In this example, fruit is set to the current item each time.',
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
