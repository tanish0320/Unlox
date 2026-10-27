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

## 13. Blu Academy 2D RPG — Navigation, Collision & Room Transition Architecture

### 13.1 Root Cause Analysis of Previous Navigation Bugs
1. **Upper Doorways Blocked by Solid Corridor Wall**:
   - The Grand Hallway (`corridor`) defined an unbroken wall `{ x: 0, y: 0, width: 26, height: 2 }` across columns 0–25.
   - Door triggers were placed at `y = 1`. Because `CollisionSystem.isSolid()` evaluated wall collision before door triggers, the player's collision body hit the solid wall rectangle and could never step onto the door trigger tile.
   - **Fix**: Cut explicit 2-tile doorway openings in the corridor top wall at `x: [3, 4]`, `[12, 13]`, `[21, 22]` and bottom wall at `x: [3, 4]`, `[12, 13]`, `[21, 22]`.
2. **Player Stranded / Out-of-Bounds on Room Change**:
   - `GameCanvas` maintained local `playerPos` in React state without resynchronizing when `currentRoom` changed. Entering a 14-tile-high classroom from `y = 16` in the corridor left the player at `y = 16`, which exceeded `room.gridHeight` and caused `isSolid()` to return `true` unconditionally, locking player movement.
   - **Fix**: Synchronized `playerPos` and `posRef.current` in `useEffect([currentRoom.id, spawnPosition])` and updated `handleRoomChange` in `BluAcademyView` to pass explicit, safe destination spawn coordinates.
3. **Classroom Exits Blocked & Transition Bounce Loops**:
   - Maths, CS, and Physics had solid bottom walls across `y = 13`, and Chemistry, Biology, and Social had solid top walls at `y = 1`. Exit triggers were placed inside solid wall rectangles.
   - Spawning immediately on or adjacent to a doorway trigger caused reverse transition bouncing without a cooldown buffer.
   - **Fix**: Split classroom perimeter walls to create clear 2-tile doorway openings, placed exit triggers cleanly inside the threshold, established a 600ms transition cooldown (`transitionCooldownRef`), and positioned return spawns in the corridor comfortably outside the trigger zone (`y = 2.4` for north towers, `y = 14.8` for south wings).
4. **Collision Box Snapping**:
   - The collision system used discrete integer rounding `Math.round(x)`, causing jerky snapping near corners and desks.
   - **Fix**: Implemented a continuous AABB feet collision box (`w: 0.6, h: 0.35, offsetX: 0.2, offsetY: 0.6`) so the player moves smoothly at 4.8 tiles/sec with sub-tile precision and slides naturally through aisles and doorways.

### 13.2 Visual Collision Debug Mode
- Accessible by appending `?debugCollisions=1` to the URL.
- Live canvas overlay renders:
  - **Red rectangles**: Wall collision boxes.
  - **Orange rectangles**: Solid furniture colliders.
  - **Yellow rectangles**: Door trigger zones with target room labels.
  - **Cyan reticles**: Destination spawn positions.
  - **Purple dashed circles**: Teacher interaction proximity zones (2.2 tiles).
  - **Green / Red bounding box**: Player feet hitbox (green when walkable, red when colliding) with live coordinates.

### 13.3 Automated Regression Test Suite
- Comprehensive automated regression tests added to `frontend/src/tests/BluAcademy.test.tsx` verifying:
  - Hallway has 6 distinct doors connecting to Maths, CS, Physics, Chemistry, Biology, and Social Sciences.
  - Every classroom has a return door to the corridor.
  - All destination spawn positions are 100% walkable (`!CollisionSystem.isSolid()`).
  - Cooldown prevents bounce loops upon spawning.
  - Doorway openings in corridor and classroom walls are physically passable.
  - All 6 teachers are approachable and their interaction zones are reachable.
  - Central walking aisles are open and unobstructed.
- **Vitest Suite**: 8/8 test files passed, 59/59 tests passed.

---

## 14. Blu Academy — NPC Population, Character Scaling & Signboard Polish

### 14.1 Populated NPCs
- **Grand Hallway (8 NPCs)**:
  - **Leo** (Student, reading near bulletin board)
  - **Priya** (Student, wandering between Maths and CS)
  - **Arjun** (Student, wandering with headphones near Physics)
  - **Caretaker Sam** (Academy Staff, patrolling central lobby)
  - **Maya** (Student, seated at study bench)
  - **Rohan** (Student, seated at study bench)
  - **Dr. Thorne** (Visiting Scholar, examining trophy case)
  - **Zoe** (Student, walking near south wings)
- **Classrooms (18 NPCs — 3 students per room)**:
  - **Maths Tower**: Dev, Tara, Kiran (seated at desks studying geometry and prime numbers)
  - **CS Lab**: Aiden, Lin, Vikram (typing at workstations with glowing monitors)
  - **Physics Observatory**: Nia, Omar, Sara (at optics bench, refractor telescope, and circuit tester)
  - **Chemistry Lab**: Anya, Kabir, Elena (at distillation bench, titration bench, and centrifuge)
  - **Biology Greenhouse**: Kai, Meera, Lucas (at fern sanctuary, microscope, and seedling nursery)
  - **Social Sciences Museum**: Zara, Anand, Chloe (at terra globe, maritime display, and treaties archive)
- **Behavior & Ambient Dialogue**:
  - Managed by `NPCManager.ts`. Seated students remain at their desks, wandering hallway NPCs patrol safe bounded zones without blocking doors or trapping the player.
  - Approaching within 1.8 tiles or clicking an NPC displays an animated pixel-art speech balloon above their head for 4.5 seconds with educational dialogue.
  - Ambient NPCs never launch fake lesson generation; existing teachers remain solely responsible for starting lessons.

### 14.2 Character Scaling & Visual Proportions
- **Character Sprites**: Enlarged from ~28px to 42px visual height (~1.5× scale factor), with distinct silhouettes, detailed hair highlights, directional pupils with specular glints, uniforms, and accessories (spectacles, backpacks, headphones, caps, safety goggles, scarves).
- **Collision Safety**: Visual sprites are anchored at the feet. Feet collision hitbox (`0.6 × 0.35` tiles) remains untouched, guaranteeing zero navigation or entrance/exit collision regressions.

### 14.3 Classroom Immersion & Camera Zoom
- **Camera Zoom Factor**:
  - Grand Hallway: $1.3\times$ zoom ($1082 \times 749\text{px}$ world view), smoothly tracking vertical exploration between north and south wings.
  - Classrooms: $1.45\times$ zoom ($928 \times 650\text{px}$ world view), comfortably filling the $1280 \times 720$ canvas with balanced framing and zero empty void.
- **Unified Click Transform**: Click-to-move and character click interactions map through `getCameraTransform()`, maintaining 100% click-to-tile coordinate accuracy.

### 14.4 Redesigned Classroom Signboards
- **Zero Edge Clipping**:
  - Top row doors (Maths, CS, Physics): Signboards positioned at $Y = 4\text{px}$ inside the top wall header ($0 \le Y \le 36\text{px}$), completely eliminating the previous top-edge clipping.
  - Bottom row doors (Chemistry, Biology, Social): Signboards positioned at $Y = 464\text{px}$ above the south archway, completely eliminating the previous bottom-edge clipping.
- **Two-Line Hierarchy**:
  - Main Title: Bold cream uppercase (e.g. `PHYSICS OBSERVATORY`, `MATHS TOWER`, `CS LAB`).
  - Subtitle: Pastel blue faculty designation (e.g. `Dr. Newton`, `Ms. Asha`, `Prof. Byte`).
- **Interactive Proximity Feedback**:
  - Signboard frame glows with animated gold breathing pulse when player is within 2.5 tiles.
  - Floating contextual prompt appears: `[W] or [↑] Enter {subject}` (North doors) or `[S] or [↓] Enter {subject}` (South doors).

### 14.5 Automated Test Results
- **Vitest Suite**: 8/8 test files passed, 64/64 tests passed.
- **Build**: `tsc && vite build` clean in 1.44s.


