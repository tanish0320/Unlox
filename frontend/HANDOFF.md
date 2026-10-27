# BLU VISUAL TEACHER — PERSON 4 MASTER INTEGRATION & HANDOFF MANUAL
*Updated for Person 3's Frontend Contract (`timeSeconds`, `durationSeconds`, `text`, `visible`, `notes`)*

---

## 1. Completed Components Summary

As **Person 4 (Scene Engine, Educational Visuals, and Notes UI)**, the complete workstream has been built, tested, and verified for offline-first, pure deterministic operation.

The components deliver:
- **`SceneRenderer`**: Central 16:9 stage (native 1280×720 canvas) dispatching approved scene types (`title_card`, `diagram`, `code_walkthrough`) using TypeScript discriminated unions, with safe fallback for unknown runtime types. Conforms strictly to Person 3's contract: `<SceneRenderer scene timeSeconds durationSeconds />`.
- **`TitleCard`**: High-contrast animated title card with entrance reveal (0–22%), stable presentation with subtle deterministic breath (22–80%), and gentle settling (80–100%), alongside orbital geometric SVG accents and topic badges.
- **`DiagramScene`**: Deterministic SVG flowchart and loop visual engine supporting 2-node chains, 3-node sequences, 4–6 node flowcharts, and cyclic loops. Nodes progress through inactive, active, and completed states (with checkmark icons). Edges animate progressively with directional arrows and pulse indicators. Invalid node references are safely filtered.
- **`CodeWalkthroughScene`**: IDE-styled educational code walkthrough preserving indentation, line numbering (1-indexed), and token syntax styling (keywords, functions, strings, numbers, comments). Supports deterministic progression across `highlight_lines`. Code is display-only: inert text rendering prevents arbitrary script execution or code evaluation.
- **`CaptionTrack`**: Pure visual presentation component conforming strictly to Person 3's contract: `<CaptionTrack text visible />`. Renders multilingual caption text faithfully in English, Hindi (Devanagari), Kannada, Tamil, or Telugu when `visible` is true, and hides smoothly when `visible` is false or text is empty.
- **`getActiveCaption`**: Exported pure helper utility for player / parent to resolve active caption text from timed `CaptionSegment[]` using `start_seconds <= timeSeconds < end_seconds` interval semantics with deterministic tie-breaking.
- **`NotesPreview`**: Structured study notes viewer conforming strictly to Person 3's contract: `<NotesPreview notes />`. Supports summary, learning objectives, key concepts, step-by-step breakdown, code examples with output, key takeaways, and revision questions.

---

## 2. Files Created and Modified

All files are strictly organized inside the shared frontend folder structure:

```text
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── HANDOFF.md
└── src/
    ├── index.ts
    ├── main.tsx
    ├── components/
    │   ├── CaptionTrack.tsx
    │   ├── NotesPreview.tsx
    │   └── scenes/
    │       ├── index.ts
    │       ├── sceneTypes.ts
    │       ├── animationUtils.ts
    │       ├── sceneStyles.css
    │       ├── SceneRenderer.tsx
    │       ├── TitleCard.tsx
    │       ├── DiagramScene.tsx
    │       └── CodeWalkthroughScene.tsx
    ├── styles/
    │   ├── sceneTokens.css
    │   └── fonts.css
    ├── fixtures/
    │   ├── sampleLesson.ts
    │   ├── sampleNotes.ts
    │   └── sampleCaptions.ts
    └── tests/
        ├── setup.ts
        ├── animationUtils.test.ts
        ├── SceneRenderer.test.tsx
        ├── TitleCard.test.tsx
        ├── DiagramScene.test.tsx
        ├── CodeWalkthroughScene.test.tsx
        ├── CaptionTrack.test.tsx
        └── NotesPreview.test.tsx
```

*No teammate files outside this scope were modified.*

---

## 3. Exported Component Names & Utilities

From `frontend/src/index.ts` and `frontend/src/components/scenes/index.ts`:
- `SceneRenderer`
- `TitleCard`
- `DiagramSceneComponent`
- `CodeWalkthroughSceneComponent`
- `CaptionTrack`
- `getActiveCaption`
- `NotesPreview`
- Pure animation utilities: `clamp`, `clamp01`, `normalizedProgress`, `lerp`, `easeInOutQuad`, `easeOutCubic`, `segmentProgress`, `staggeredProgress`, `activeStepIndex`, `codeLineProgression`, `deterministicPulse`.

---

## 4. Exact Prop Interfaces (Updated for Person 3)

```typescript
// Main Scene Dispatcher
export interface SceneRendererProps {
  scene: LessonScene;
  timeSeconds: number;      // Scene-relative elapsed time
  durationSeconds: number;  // Resolved scene duration
  width?: number;           // Default: 1280
  height?: number;          // Default: 720
  className?: string;
  // Optional backwards compatibility aliases
  currentTime?: number;
  duration?: number;
}

// Caption Presentation Component (Person 3's exact contract)
export interface CaptionTrackProps {
  text: string;
  visible: boolean;
  className?: string;
  language?: string;        // Optional script font hint ("en", "hi", "kn", "ta", "te")
}

// Caption Resolution Helper
export function getActiveCaption(
  segments: CaptionSegment[],
  timeSeconds: number
): string;

// Structured Notes Component (Person 3's exact contract)
export interface NotesPreviewProps {
  notes: LessonNotes;
  className?: string;
}
```

---

## 5. Person 3 (Player / UI Shell) Integration Instructions

Mount the components inside your player viewport using the exact props you requested:

```tsx
import {
  SceneRenderer,
  CaptionTrack,
  NotesPreview,
  getActiveCaption,
  sampleLesson,
  sampleCaptions,
  sampleNotes
} from "./components";

function Player({ activeScene, sceneElapsed, sceneDuration, lessonElapsed, captionsEnabled }) {
  // Option A: If passing pre-resolved caption text:
  // <CaptionTrack text={currentCaptionText} visible={captionsEnabled} />

  // Option B: If resolving active caption using the provided helper:
  const activeText = getActiveCaption(lessonCaptions, lessonElapsed);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}>
      <SceneRenderer
        scene={activeScene}
        timeSeconds={sceneElapsed}
        durationSeconds={sceneDuration}
      />
      <CaptionTrack
        text={activeText}
        visible={captionsEnabled}
      />
    </div>
  );
}

// Notes preview tab/section:
<NotesPreview notes={lessonNotes} />
```

---

## 6. Person 2 (Backend & MP4 Exporter) Integration Instructions

For headless browser frame capture (Puppeteer/Playwright + FFmpeg):
1. Mount `SceneRenderer` with fixed dimensions: `width={1280}` and `height={720}`.
2. Advance `timeSeconds` deterministically for each video frame:
   ```ts
   const totalFrames = fps * durationSeconds;
   for (let frame = 0; frame < totalFrames; frame++) {
     const timeSeconds = frame / fps;
     // Update timeSeconds prop, await requestAnimationFrame, capture screenshot
   }
   ```
3. Zero wall-clock dependence guarantees frame 100 captured at 1x speed is identical to frame 100 captured at 0.1x speed.
4. Pure function of time: seeking backward instantly restores the exact earlier visual state.

---

## 7. Theme Token Dependencies

`frontend/src/styles/sceneTokens.css` defines fallback CSS variables mapped directly to Person 3's expected theme tokens:
- `--blu-bg`: `var(--app-bg, var(--color-bg, #0B1020))`
- `--blu-surface`: `var(--app-surface, var(--color-surface, #111A2E))`
- `--blu-primary`: `var(--app-primary, var(--color-primary, #38BDF8))`
- `--blu-secondary`: `var(--app-secondary, var(--color-secondary, #A78BFA))`
- `--blu-text`: `var(--app-text, var(--color-text, #F8FAFC))`

When Person 3 drops in `theme/tokens.css`, all scene components will automatically inherit her app styling without any changes.

---

## 8. Pending Confirmations from Person 2 (Recorded for Person 1)

1. **Language field names**: Whether `LessonPlan` uses `language` or `source_language`/`target_language`. (Person 4 fixtures include `language`).
2. **Per-scene audio timing**: Whether `GET /api/lessons/{id}` provides per-scene `duration_seconds` and `audio_url`.
3. **Diagram optional layout**: Whether `DiagramScene` includes optional `layout?: "linear" | "loop" | "tree" | "auto"`. (Person 4 engine auto-detects loops if omitted).

---

## 9. Scene & Caption Timing Semantics

- **Scene Animation**: `progress = clamp01(timeSeconds / durationSeconds)`. Time is scene-relative (0 to `durationSeconds`).
- **Caption Intervals**: `start_seconds <= timeSeconds < end_seconds`. Interval bounds are evaluated on the lesson-global audio timeline.

---

## 10. Multilingual Font Requirements

Offline-first local font stacks defined in [`frontend/src/styles/fonts.css`](file:///C:/Users/sudha/frontend/src/styles/fonts.css):
- **Latin (English)**: `Noto Sans`, system-ui, sans-serif
- **Devanagari (Hindi/Marathi)**: `Noto Sans Devanagari`, `Nirmala UI`, `Mangal`
- **Kannada**: `Noto Sans Kannada`, `Nirmala UI`, `Tunga`
- **Tamil**: `Noto Sans Tamil`, `Nirmala UI`, `Latha`
- **Telugu**: `Noto Sans Telugu`, `Nirmala UI`, `Gautami`
- **Monospace (Code)**: `JetBrains Mono`, `Fira Code`, `Cascadia Code`, `Consolas`

Zero remote CDN calls (no Google Fonts). Person 2's capture environment should ensure system fonts or bundled local font files are loaded before capture starts (`document.fonts.ready`).

---

## 11. Test & Build Commands and Results

From `frontend/`:
```bash
# Run test suite
npm test

# Type-check TypeScript
npm run typecheck

# Production build
npm run build
```

**Actual Results**:
- **Vitest Suite**: **7 test files passed (7/7), 38 tests passed (38/38) — 100% pass rate**.
- **Typecheck**: `tsc --noEmit` exited with code 0 (zero errors).
- **Vite Build**: Compiled in 1.14s producing optimized `dist/` bundle.

---

## 12. Checklist for Person 1 (Integration Lead)

- [x] All three required scene types built and verified.
- [x] Conforms to Person 3's exact prop contract (`timeSeconds`, `durationSeconds`, `text`, `visible`, `notes`).
- [x] Helper utility `getActiveCaption` provided for timed caption resolution.
- [x] Multilingual Unicode verified for English, Hindi (Devanagari), and Kannada.
- [x] Deterministic rendering verified (frame-by-frame seeking test passed).
- [x] Code display verified inert (no eval or script execution).
- [x] Structured study notes display verified for all PRD sections.
- [x] Zero external network or cloud AI dependencies.

---

## 13. Playwright Video Export Route (/render) Specification

Person 4 has implemented and verified the dedicated /render export viewport for Person 2's Playwright + FFmpeg export pipeline.

### 13.1. Route URL Format & Query Parameters
**Base URL:** `http://localhost:5173/render`

| Parameter | Aliases | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `lesson` | `lesson_id`, `lessonId` | string | `"default"` | Lesson plan to render. Built-in fixtures: `"default"`, `"p1"`, `"hi"`, `"kn"`. If a custom lesson ID is supplied, attempts to load from `http://localhost:8000/api/lessons/{id}`. |
| `scene` | `scene_index`, `sceneIndex`, `scene_id`, `sceneId` | string / int | `0` | Scene index (`0`, `1`, `2`) or exact scene ID (`"scene_01"`, `"scene-1"`). |
| `t` | `time`, `time_seconds`, `timeSeconds` | float | `0.0` | Scene-relative elapsed time in seconds (e.g. `2.5`). Clamped to `0.0`. |
| `duration` | `duration_seconds`, `durationSeconds` | float | Manifest / 10.0 | Total scene duration in seconds. Uses explicit URL value, falls back to measured audio manifest duration (`p1AudioManifestDurations`), then lesson duration. |
| `captions` | `show_captions` | boolean | `false` | Pass `"true"` or `"1"` to overlay captions. Defaults to `"false"` to provide clean canvas for FFmpeg SRT subtitle burning. |

### 13.2. Example Export URLs
- **Title Card (Scene 0 at 1.5s):**  
  `http://localhost:5173/render?lesson=default&scene=0&t=1.5`
- **Code Walkthrough (Person 1 Scene 2 at 4.0s with real duration):**  
  `http://localhost:5173/render?lesson=p1&scene=scene_02&t=4.0&duration=7.833`
- **Diagram (Person 1 Scene 3 items[] at 2.0s):**  
  `http://localhost:5173/render?lesson=p1&scene=scene_03&t=2.0&duration=6.998`
- **Multilingual Script (Hindi Devanagari Title Card at 1.0s):**  
  `http://localhost:5173/render?lesson=hi&scene=0&t=1.0`

### 13.3. DOM Readiness Contract for Playwright
The capture page provides a strict DOM signaling contract:

``html
<div
  id="render-root"
  data-testid="render-root"
  data-render-ready="true"
  data-render-error="false"
  data-lesson-title="How a Python loop works"
  data-scene-index="1"
  data-scene-id="scene_02"
  data-scene-type="code_walkthrough"
  data-time-seconds="4.0"
  data-duration-seconds="7.833"
  style="width: 1280px; height: 720px; overflow: hidden; position: relative; background-color: #0B1020;"
>
  <!-- Active SceneRenderer Component -->
</div>
``

- **Readiness State:** `data-render-ready="true"` appears **only** after lesson data is verified, active scene is mounted, and `document.fonts.ready` has resolved all local glyphs.
- **Unready State:** While initializing or resolving resources, `data-render-ready="false"`.
- **Error State:** If an invalid scene index or missing lesson is requested, `data-render-ready="false"` and `data-render-error="true"`, with human-readable error diagnostics rendered inside `#render-error`.
- **Playwright Capture Snippet:**
  ``javascript
  await page.goto('http://localhost:5173/render?lesson=p1&scene=scene_02&t=2.0&duration=7.833');
  const target = await page.waitForSelector('#render-root[data-render-ready="true"]');
  await target.screenshot({ path: 'frame_00060.png' });
  ``

### 13.4. High-Performance Programmatic Seeking API
To capture 30 FPS sequences without reloading the browser page on every frame, Person 4 exposes a global seeking helper on `window`:
``javascript
// Seek frame instantly in Playwright without reloading the page:
await page.evaluate(({ t, dur }) => {
  window.__BLU_SEEK_FRAME__(t, dur);
}, { t: frame / 30.0, dur: 7.833 });

await page.waitForSelector('#render-root[data-render-ready="true"]');
await page.locator('#render-root').screenshot({ path: rame_.png });
``

### 13.5. Verification & Test Metrics
- **Tests Passed:** 8 test files, 47 unit tests passed (including 8 comprehensive tests for `RenderPage` testing dimensions, parameter handling, error states, and caption visibility).
- **Build Verified:** `npm run build` succeeds cleanly (`dist/` generated with zero TypeScript or bundle warnings).
- **Local Dev Server Verified:** `http://localhost:5173/render` serves HTTP 200 OK offline.
