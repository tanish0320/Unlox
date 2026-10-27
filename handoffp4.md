# Blu Visual Teacher — Person 4 to Person 1 Integration Handoff Manual (`handoffp4.md`)

**Author:** Person 4 (Scene Engine, Educational Visuals, Captions & Study Notes UI)  
**Recipient:** Person 1 (Integration Lead, Local AI Pipeline & System Orchestrator — Tanish)  
**Git Branch:** `sudz` (pushed to `https://github.com/tanish0320/Unlox.git`)  
**Status:** **COMPLETE & VERIFIED** (39/39 Automated Tests Passing, 100% Deterministic & Offline)

---

## 1. Executive Summary

This handoff document provides **Person 1** with all technical specifications, schema mappings, integration patterns, and verification instructions required to connect the **Local AI Pipeline (Person 1)** and the **Frontend / Video Capture Engine (Person 4 & Person 2/3)**.

Person 4 has implemented the complete visual presentation layer in `frontend/`, providing:
1. **`SceneRenderer`**: 1280×720 canvas rendering all three mandatory scene types (`title_card`, `diagram`, `code_walkthrough`) driven strictly by pure timestamp inputs (`timeSeconds`, `durationSeconds`).
2. **`CaptionTrack`**: Multi-lingual correct-script caption display (English, Hindi Devanagari, Tamil, Telugu, Kannada) adhering to Person 3's contract (`<CaptionTrack text visible />`) plus pure helper `getActiveCaption`.
3. **`NotesPreview`**: Rich educational study notes component displaying summaries, learning objectives, key concepts, step-by-step breakdown, code examples, and revision questions directly from Person 1's `LessonNotes` schema.
4. **Deterministic Animation Math**: Zero `requestAnimationFrame`, zero `setInterval`, zero CSS keyframe drifts. Puppeteer or a browser player can seek directly to any millisecond with 100% visual repeatability.

---

## 2. Person 1 Schema Compatibility & Mapping Matrix

Person 4's components were built to directly consume the data structures defined in Person 1's `backend/app/schemas/` and `contracts/provisional_types.ts`:

| Person 1 Backend Output | Pydantic Schema | Person 4 Component | Integration Status | Notes / Handling |
| :--- | :--- | :--- | :--- | :--- |
| `LessonPlan.scenes[i]` (`title_card`) | `provisional_lesson.py` | `<TitleCard scene={...} />` | **Direct Ingestion** | Consumes `heading`, `subtitle`, `key_points`. Renders animated badge and entrance/breath curves. |
| `LessonPlan.scenes[i]` (`diagram`) | `provisional_lesson.py` | `<DiagramSceneComponent scene={...} />` | **Direct Ingestion + Dual Mode** | Supports Person 1's `items: string[]` (e.g. `["Iteration 1: ...", ...]`) AND explicit `nodes`/`edges` graphs automatically! |
| `LessonPlan.scenes[i]` (`code_walkthrough`) | `provisional_lesson.py` | `<CodeWalkthroughSceneComponent scene={...} />` | **Direct Ingestion** | Syntax-highlights code, numbers lines, applies `highlight_lines`, shows `expected_output`. 100% display-only (no eval). |
| `AudioManifest.entries[i]` | `audio_manifest.py` | `<SceneRenderer durationSeconds={entry.duration_seconds} />` | **Direct Ingestion** | Measured audio duration dictates scene animation span ($\text{duration} = \text{audio length} + \text{padding}$). |
| `SceneAudioEntry.caption_segments` | `audio_manifest.py` | `getActiveCaption(segments, timeSeconds)` | **Direct Ingestion** | Evaluates scene-relative `start_seconds <= t < end_seconds`. Supports Unicode Indian scripts seamlessly. |
| `caption_text` + `visible` | Frontend contract | `<CaptionTrack text={caption} visible={show} />` | **Direct Ingestion** | Person 3's exact contract. Renders high-contrast backdrop at the bottom of the 16:9 stage. |
| `LessonNotes` payload | `lesson_notes.py` | `<NotesPreview notes={notes} />` | **Direct Ingestion** | Matches `generate_study_notes()` output field-for-field (`summary`, `key_concepts`, `examples`, etc.). |

---

## 3. DiagramScene Dual-Mode Compatibility (Special Feature for Person 1)

In Person 1's sample lessons (`fixtures/sample-lesson.json`), diagrams are formatted with sequential text items:
```json
{
  "id": "scene_03",
  "type": "diagram",
  "heading": "Step 2: Watch each iteration",
  "items": [
    "Iteration 1: i = 0 -> print(0)",
    "Iteration 2: i = 1 -> print(1)",
    "Iteration 3: i = 2 -> print(2)"
  ],
  "layout": "horizontal"
}
```

Person 4's `DiagramScene` component automatically detects if `scene.items` is provided without explicit graph nodes. When present:
- It dynamically generates sequenced process nodes (`item-0`, `item-1`, `item-2`).
- It links them with directional animated edges.
- As `timeSeconds` advances across `durationSeconds`, it highlights the active step (`activeStepIndex`) and draws pulsing flow arrows along the path.
- If explicit `nodes` and `edges` are provided instead, it renders custom network topologies with cycle detection and custom labels.

**Result:** Person 1's Ollama/Mock planner outputs render immediately without requiring any intermediate data transformation.

---

## 4. Component Prop Contracts & Quickstart

All components are exported from `frontend/src/index.ts`.

### 4.1. SceneRenderer (Person 3 Contract)
```typescript
import { SceneRenderer, LessonScene } from './frontend/src';

<SceneRenderer
  scene={currentScene}          // TitleCardScene | DiagramScene | CodeWalkthroughScene
  timeSeconds={elapsedInScene}  // Scene-relative elapsed seconds (float)
  durationSeconds={sceneDuration} // Measured audio duration for this scene
  width={1280}                  // Optional, defaults to 1280
  height={720}                  // Optional, defaults to 720
  className="my-scene-stage"    // Optional
/>
```

### 4.2. CaptionTrack & getActiveCaption (Person 3 Contract)
```typescript
import { CaptionTrack, getActiveCaption, CaptionSegment } from './frontend/src';

// 1. Resolve current active caption from Person 1's audio manifest
const activeText = getActiveCaption(
  currentSceneAudioEntry.caption_segments || [],
  elapsedInScene
);

// 2. Render caption bar
<CaptionTrack
  text={activeText}
  visible={isCaptionsEnabled}
  language={currentLanguage} // e.g. "en", "hi", "te", "ta", "kn"
/>
```

### 4.3. NotesPreview (Person 3 Contract)
```typescript
import { NotesPreview, LessonNotes } from './frontend/src';

// Directly pass Person 1's generated study notes
<NotesPreview notes={lessonNotesData} />
```

---

## 5. End-to-End Player Reference Implementation

For Person 1 or Person 3 assembling the integrated browser player, here is the complete wiring pattern:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SceneRenderer,
  CaptionTrack,
  getActiveCaption,
  NotesPreview,
  LessonPlan,
  AudioManifest,
  LessonNotes
} from './frontend/src';

interface IntegratedLessonPlayerProps {
  lessonPlan: LessonPlan;
  audioManifest: AudioManifest;
  studyNotes: LessonNotes;
}

export const IntegratedLessonPlayer: React.FC<IntegratedLessonPlayerProps> = ({
  lessonPlan,
  audioManifest,
  studyNotes,
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [sceneTime, setSceneTime] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'notes'>('video');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scene = lessonPlan.scenes[currentSceneIndex];
  const audioEntry = audioManifest.entries[currentSceneIndex];
  const sceneDuration = audioEntry?.duration_seconds || 10;

  // Sync sceneTime from HTML5 audio playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setSceneTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    if (currentSceneIndex < lessonPlan.scenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setSceneTime(0);
    }
  };

  const activeCaption = getActiveCaption(audioEntry?.caption_segments || [], sceneTime);

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto p-4">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 rounded font-bold ${activeTab === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Animated Video Player
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded font-bold ${activeTab === 'notes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Study Notes
        </button>
      </div>

      {activeTab === 'video' ? (
        <div className="relative w-[1280px] h-[720px] bg-slate-950 overflow-hidden rounded-xl shadow-2xl">
          {/* Audio Engine */}
          <audio
            ref={audioRef}
            src={audioEntry?.audio_file}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            autoPlay
          />

          {/* 16:9 Deterministic Scene Stage */}
          <SceneRenderer
            scene={scene}
            timeSeconds={sceneTime}
            durationSeconds={sceneDuration}
          />

          {/* Multilingual Caption Overlay */}
          <CaptionTrack
            text={activeCaption}
            visible={showCaptions}
            language={audioManifest.language}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <NotesPreview notes={studyNotes} />
        </div>
      )}
    </div>
  );
};
```

---

## 6. Deterministic Frame Capture Protocol for Person 2 (FFmpeg / Puppeteer)

For the MP4 video generation pipeline (Person 2 and Person 1's export script):
- Every visual component calculates its layout and animations strictly via:
  $$\text{progress} = \text{clamp01}\left(\frac{\text{timeSeconds}}{\text{durationSeconds}}\right)$$
- There are no asynchronous CSS animations or timers that could desynchronize when capturing frames at 25 FPS or 30 FPS.
- Person 2's Puppeteer capture script simply executes:
  ```javascript
  for (let frame = 0; frame < totalFrames; frame++) {
    const timeSeconds = frame / 30.0;
    // Update React component timeSeconds prop or call window.__seek(timeSeconds)
    await page.evaluate((t) => window.__seekScene(t), timeSeconds);
    await page.screenshot({ path: `frame_${String(frame).padStart(5, '0')}.png` });
  }
  ```
- Then mux with Person 1's audio file (`scene_XX.wav`) using FFmpeg:
  ```bash
  ffmpeg -r 30 -i frame_%05d.png -i scene_01.wav -c:v libx264 -pix_fmt yuv420p -c:a aac output.mp4
  ```

---

## 7. Verification & Test Suite Results

All tests have been executed and verified in the environment.

### 7.1. Running the Test Suite
```powershell
cd frontend
npm.cmd run test -- --run
```

### 7.2. Test Results Summary
- **Test Files:** 7 passed (7 total)
- **Tests:** 39 passed (39 total)
- **Failures:** 0
- **Duration:** ~14 seconds

```text
 ✓ src/tests/animationUtils.test.ts (8 tests)
 ✓ src/tests/TitleCard.test.tsx (4 tests)
 ✓ src/tests/DiagramScene.test.tsx (5 tests)
 ✓ src/tests/CodeWalkthroughScene.test.tsx (4 tests)
 ✓ src/tests/CaptionTrack.test.tsx (9 tests)
 ✓ src/tests/SceneRenderer.test.tsx (5 tests)
 ✓ src/tests/NotesPreview.test.tsx (4 tests)
```

Key features covered by tests:
- **TitleCard**: Entrance, breath settling, key point badge rendering.
- **DiagramScene**: Custom graph nodes/edges, Person 1 `items` array fallback, active step progression, cycle detection.
- **CodeWalkthroughScene**: Syntax highlighting, line numbers, line highlighting, output box display, security (no code execution).
- **CaptionTrack**: Visibility toggling, multilingual scripts (Hindi, Kannada, Tamil, Telugu), whitespace handling, `getActiveCaption` interval lookup and tie-breaking.
- **SceneRenderer**: Dispatched rendering for all 3 scene types, graceful fallback on malformed scene data.
- **NotesPreview**: Complete study notes breakdown, glossary rendering, collapsible revision questions.

---

## 8. Frontend Workstream File Manifest

```text
frontend/
├── HANDOFF.md                                # Person 4 internal handoff & contract spec
├── index.html                                # Standalone preview mount
├── package.json                              # Vite, React 18, Lucide React, Vitest
├── tsconfig.json                             # Strict TypeScript configuration
├── vite.config.ts                            # Vite build setup
├── vitest.config.ts                          # Vitest testing environment (jsdom)
└── src/
    ├── index.ts                              # Public library exports for Person 1 & 3
    ├── main.tsx                              # Interactive developer testing harness
    ├── components/
    │   ├── CaptionTrack.tsx                  # Multilingual caption bar (<CaptionTrack text visible />)
    │   ├── NotesPreview.tsx                  # Educational study notes (<NotesPreview notes />)
    │   └── scenes/
    │       ├── index.ts                      # Barrel export for scene components
    │       ├── sceneTypes.ts                 # TypeScript types mirroring contracts/provisional_types.ts
    │       ├── animationUtils.ts             # Deterministic animation math (lerp, ease, clamp)
    │       ├── sceneStyles.css               # Scene-specific styling and layout
    │       ├── SceneRenderer.tsx             # Master 16:9 stage dispatcher
    │       ├── TitleCard.tsx                 # Animated title card scene
    │       ├── DiagramScene.tsx              # Animated flowchart / loop diagram scene
    │       └── CodeWalkthroughScene.tsx      # Syntax-highlighted code walkthrough scene
    ├── styles/
    │   ├── sceneTokens.css                   # Person 3 theme design tokens & colors
    │   └── fonts.css                         # System font fallbacks & Indian typography
    ├── fixtures/
    │   ├── sampleLesson.ts                   # 3-scene sample lesson matching Person 1's fixture
    │   ├── sampleNotes.ts                    # Sample study notes fixture
    │   └── sampleCaptions.ts                 # Multilingual caption fixtures (en, hi, ta, te, kn)
    └── tests/
        ├── setup.ts                          # Testing library setup
        ├── animationUtils.test.ts            # Math & timing unit tests
        ├── SceneRenderer.test.tsx            # Dispatcher unit tests
        ├── TitleCard.test.tsx                # TitleCard visual tests
        ├── DiagramScene.test.tsx             # Diagram & items[] array tests
        ├── CodeWalkthroughScene.test.tsx     # Code walkthrough tests
        ├── CaptionTrack.test.tsx             # Multilingual caption tests
        └── NotesPreview.test.tsx             # Study notes UI tests
```

---

## 9. Integration Checklist for Person 1

1. **Pull Branch `sudz`**:
   ```bash
   git fetch origin
   git checkout sudz
   ```
2. **Review Shared Contract**:
   Compare `contracts/provisional_types.ts` with `frontend/src/components/scenes/sceneTypes.ts`. Person 4's types are a 100% compatible superset that safely ingests all Person 1 payloads.
3. **Verify Frontend Build**:
   ```bash
   cd frontend
   npm.cmd install
   npm.cmd run test -- --run
   npm.cmd run build
   ```
4. **Merge to Main / Shared Integration Branch**:
   Since Person 4 only created files under `frontend/` and added `.gitignore` rules for node artifacts, merging `sudz` into your integration branch will produce zero merge conflicts with `backend/` or `scripts/`.

---

*Handoff prepared by Person 4 for Person 1 (Tanish) — Blu Visual Teacher Hackathon.*
