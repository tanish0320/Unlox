# HANDOFF: Person 3 (Frontend Shell + Player)

Project: Blu Visual Teacher | Folder: `frontend/`

> **Status legend:** `[ ]` not done or not verified, `[~]` in progress, `[x]` done and tested.
> Items marked **TO CONFIRM** need an answer from the named person.
> Anything not marked `[x]` must not be assumed to work.

---

## 1. What I implemented

| Feature | Status |
|---|---|
| Vite + React + TypeScript app shell, light/dark theme, offline pill, mock-data badge | [x] |
| Design tokens in `src/theme/tokens.css` and shared base styles | [x] |
| API client and timed fake job stages in mock mode | [x] |
| Generation form with topic, level, language, and duration | [x] |
| Progress stepper with stages, timings, fallback banner, error, retry, and sample action | [x] |
| Lesson player controls and optional scene renderer slot | [x] |
| Audio-driven timing; mock timing uses manifest durations and a 0.6-second scene pause | [x] |
| Interactive / MP4 toggle | [x] |
| Overview, Notes, and Details result tabs | [x] |
| MP4, notes JSON, and optional SRT download controls; Copy notes | [x] |
| Language-specific mock lessons and development language test page | [x] |
| Tests listed in section 8 | [x] |
| Browser checks at 360px, 390px, and 768px; no horizontal overflow and visible buttons at least 44px | [x] |

Implemented functionality is not evidence that the real backend or real-device playback has been tested. See sections 8 and 10.

## 2. Files changed

These are the frontend implementation and test files recorded for this handoff. The current source tree contains each listed path.

```text
frontend/src/App.css
frontend/src/App.tsx
frontend/src/index.css
frontend/src/adapters/normalize.ts
frontend/src/adapters/normalize.test.ts
frontend/src/api/client.ts
frontend/src/api/client.test.ts
frontend/src/api/mockData.ts
frontend/src/api/types.ts
frontend/src/components/GenerationForm.tsx
frontend/src/components/GenerationForm.test.tsx
frontend/src/components/GenerationProgress.tsx
frontend/src/components/LanguageCheck.tsx
frontend/src/components/LessonIllustration.tsx
frontend/src/components/LessonPlayer.tsx
frontend/src/components/ResultView.tsx
frontend/src/components/ResultView.test.tsx
frontend/src/components/SceneStage.tsx
frontend/src/components/SceneStage.test.tsx
frontend/src/components/placeholders/ScenePlaceholder.tsx
frontend/src/config/brand.ts
frontend/src/config/languages.ts
frontend/src/hooks/useLessonJob.ts
frontend/src/hooks/usePlayback.ts
frontend/src/hooks/usePlayback.test.tsx
frontend/src/pages/Home.tsx
frontend/src/pages/Home.backend.test.tsx
frontend/src/test/setup.ts
frontend/src/theme/base.css
frontend/src/theme/tokens.css
frontend/vite.config.ts
frontend/package.json
frontend/.env.example
```

`src/components/shell/` from the template does not exist. The language test page is `src/components/LanguageCheck.tsx`; the dev proxy is configured in `vite.config.ts`.

## 3. Dependencies

These are the version declarations in `frontend/package.json` (ranges as written there), not a claim that each dependency was installed at exactly that version.

Frontend package version: `0.0.0`

Runtime dependencies:

| Package | Version declaration |
|---|---:|
| `@fontsource/caveat` | `^5.3.0` |
| `@fontsource/inter` | `^5.3.0` |
| `@fontsource/noto-sans-devanagari` | `^5.3.0` |
| `@fontsource/noto-sans-kannada` | `^5.3.0` |
| `@fontsource/noto-sans-tamil` | `^5.3.0` |
| `@fontsource/noto-sans-telugu` | `^5.3.0` |
| `@fontsource/young-serif` | `^5.3.0` |
| `lucide-react` | `^1.62.0` |
| `react` | `^19.3.1` |
| `react-dom` | `^19.3.1` |

Development dependencies:

| Package | Version declaration |
|---|---:|
| `@testing-library/jest-dom` | `^7.0.1` |
| `@testing-library/react` | `^16.3.3` |
| `@types/node` | `^24.19.2` |
| `@types/react` | `^19.3.0` |
| `@types/react-dom` | `^19.3.0` |
| `@vitejs/plugin-react` | `^6.1.2` |
| `jsdom` | `^29.1.1` |
| `oxlint` | `^1.88.0` |
| `typescript` | `~6.0.3` |
| `vite` | `^8.3.4` |
| `vitest` | `^5.0.5` |

## 4. How to run

From `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
npm test
npm run build
npm run lint
```

Mock mode is enabled by default in `.env.example`; it does not need a backend. To use the backend, set `VITE_USE_MOCK=false`, start the local backend on port `8000`, and keep `VITE_API_BASE=/api`. The Vite development server proxies `/api` to `http://localhost:8000` and removes the `/api` prefix.

## 5. Interface contract

The following describes the current frontend implementation, not a confirmed backend contract. The frontend client uses `VITE_API_BASE` (default `/api`) and these paths:

| Method + path | Request | Frontend expects |
|---|---|---|
| `POST {VITE_API_BASE}/jobs` | `GenerateRequest`: `{topic, level, language, target_duration_seconds}` | Object with non-empty `job_id` or `id`; the client returns `{job_id}` |
| `GET {VITE_API_BASE}/jobs/{id}` | None | `JobStatus`: `{status, stage, progress_percent, message, fallback_used}` |
| `GET {VITE_API_BASE}/jobs/{id}/lesson` | None | `LessonResponse` described below |
| `GET {VITE_API_BASE}/jobs/{id}/video` | None | Used as the video URL |
| `GET {VITE_API_BASE}/jobs/{id}/notes` | None | Used as the notes download URL |
| `GET {VITE_API_BASE}/jobs/{id}/subtitles` | None | Used if the lesson manifest has a non-empty `subtitles_url` |

`GenerateRequest` has `level: "beginner" | "intermediate"` and a string language code. `JobStatus.status` is `"queued" | "running" | "ready" | "failed"`; `stage` is typed as a string. The mock job progresses through validating, planning, translating, narrating, rendering, exporting, and ready.

`LessonResponse` has:

```ts
{
  lesson_plan: {
    topic: string
    level: "beginner" | "intermediate"
    language: string
    target_duration_seconds: number
    scenes: Array<{
      id: string
      type: "title_card" | "code_walkthrough" | "diagram"
      heading: string
      narration: string
      code?: string
      highlight_lines?: number[]
      items?: Array<string | { id?: string; label: string; description?: string }>
    }>
  }
  notes: string
  artifact_manifest: {
    audio: Array<{ scene_id: string; audio_url: string; duration_seconds: number }>
    timings_by_stage: Record<string, number>
    video_url?: string
    notes_url?: string
    subtitles_url?: string
  }
}
```

The normalizer accepts lesson language from `lesson_plan.target_language ?? lesson_plan.language ?? response.target_language ?? response.language`. The request normalizer accepts `target_language ?? language`, but the client sends `language` in its POST body. The client does not normalize or require a status field in the `POST /jobs` response.

### 5.1 Backend questions retained from the template

- `stage` values I expect: `validating, planning, translating, narrating, rendering, exporting, ready` (**TO CONFIRM: Person 2**)
- `status` values I expect: `queued, running, ready, failed` (**TO CONFIRM: Person 2**)

**What I NEED INSIDE `GET /api/lessons/{id}` (TO CONFIRM: Person 2):** The template describes this route and a manifest containing `lesson_id`, `language`, `duration_seconds`, `fallback_used`, timings, audio, video, notes and optional `subtitle_url`. The actual client instead calls `GET {VITE_API_BASE}/jobs/{id}/lesson`; the TypeScript manifest has `audio`, `timings_by_stage`, and optional `video_url`, `notes_url`, and `subtitles_url`. Please confirm the backend endpoint and schema that should be used.

**Field-name conflict (TO CONFIRM: Person 2):** the PRD says `source_language` / `target_language`, the workflow doc says `language`. The adapter reads `target_language ?? language` in the request, and the lesson adapter also accepts either `target_language` or `language` (preferring target language). The frontend request type and client use `language`. Please confirm the backend field name.

### 5.2 What I USE from Person 4 (TO CONFIRM: Person 4)

```tsx
<SceneRenderer scene={scene} timeSeconds={timeSeconds} durationSeconds={durationSeconds} />
<CaptionTrack text={text} visible={visible} />
<NotesPreview notes={notes} />
```

The optional exports are loaded from `src/components/scenes/index.ts` using `import.meta.glob`. That file is not present in the current source tree. Scene rendering uses the built-in placeholder until Person 4's components exist. The placeholder also safely handles an unknown scene type.

- Scenes should be pure functions of `timeSeconds` (no internal timers).
- Scene components should use the CSS variables in `src/theme/tokens.css`.

### 5.3 What I USE from Person 1

Nothing directly. The UI displays `fallback_used`, stage timings, and model names when available (**TO CONFIRM: Person 1 / Person 2** for `model_metadata` shape).

### 5.4 Current component props

```tsx
<LessonPlayer lesson={LessonResponse} lessonId={string} autoPlay?: boolean />
<GenerationForm onSubmit={(request: GenerateRequest) => void} disabled={boolean} />
<GenerationProgress
  status={JobStatus | null}
  isLoading={boolean}
  error={string | null}
  timingsByStage?: Record<string, number>
  onRetry={() => void}
  onUseSample={() => void}
  onMakeAnother={() => void}
  sampleUsed?: boolean
/>
```

These are the current source props; they differ from the template's `defaultMode` and progress props.

## 6. Example input/output

The mock fixture uses a Python loop lesson. Example request:

```json
{
  "topic": "How does a Python loop work?",
  "level": "beginner",
  "language": "hi",
  "target_duration_seconds": 45
}
```

Mock `POST /jobs` response:

```json
{ "job_id": "demo-1" }
```

Mock status starts queued, then advances through the job stages. A ready status has this shape:

```json
{
  "status": "ready",
  "stage": "ready",
  "progress_percent": 100,
  "message": "Your lesson is ready.",
  "fallback_used": false
}
```

The mock lesson response uses `lesson_plan.topic`, not `lesson_plan.title`, and a string `notes` field. It contains three scenes (`title_card`, `code_walkthrough`, `diagram`), with audio manifest durations of 5, 6, and 6 seconds and empty audio URLs. Notes in the mock fixture are serialized JSON text. The mock language is selected from the generation request.

## 7. Environment variables

Values below match `frontend/.env.example`:

```dotenv
VITE_USE_MOCK=true
VITE_API_BASE=/api
VITE_POLL_INTERVAL_MS=500
VITE_JOB_TIMEOUT_MS=60000
```

When unset, the client defaults API base to `/api`, polling to `500` ms, and timeout to `60000` ms. In mock mode, `?fail=1` triggers a failing job and `?fallback=1` sets `fallback_used`.

## 8. Testing

Test output recorded from a completed run on 2026-10-27:

```text
> frontend@0.0.0 test
> vitest run

 RUN  v5.0.5 C:/dev/Unlox/frontend

 Test Files  7 passed (7)
      Tests  15 passed (15)
   Start at  14:15:31
   Duration  12.97s (environment 72%, setup 14%, tests 12%, import 1%, transform 1%)
```

| Test/check | Result |
|---|---|
| Mock client creates a job and reaches `ready` | [x] Passed |
| Mock client returns requested lesson language | [x] Passed |
| Playback timing and next/previous/replay/jump/last-scene behavior | [x] Passed |
| Form empty-topic error and valid request payload | [x] Passed |
| Unknown scene type shows safe placeholder | [x] Passed |
| Language normalizer supports `target_language` and `language` | [x] Passed |
| Result tabs switch; missing Details fields show `Not provided`; empty Notes message | [x] Passed |
| Backend fetch failure message and sample lesson action | [x] Passed |
| `npm run build` (`tsc -b && vite build`) | [x] Passed |
| `npm run lint` (`oxlint`) | [x] Passed |
| Browser width checks: 360px, 390px, 768px; no horizontal overflow; visible buttons at least 44px | [x] Passed |
| Browser check of ready mock lesson, dark theme, result tabs, and language test view | [x] Passed |
| Wi-Fi OFF: full flow on a real device in all languages | [ ] Not tested |
| No externally loaded fonts/images/scripts in `src/` and `index.html` | [x] Prior source scan found none; SVG namespace URLs are not asset loads |
| Real backend integration | [ ] Not tested |
| Production bundle (from completed build) | [x] JS 285.38 kB (gzip 88.83 kB); CSS 54.92 kB (gzip 9.44 kB) |

## 9. Integration instructions

**For Person 2 (backend):** the frontend currently calls `POST /api/jobs`, `GET /api/jobs/{id}`, and `GET /api/jobs/{id}/lesson` when `VITE_API_BASE=/api`. In development the Vite proxy forwards these to `localhost:8000` after stripping `/api`. Please confirm or align the backend paths and response shapes in section 5. Serve audio at the returned `audio_url` paths.

**For Person 4 (scenes):** export `SceneRenderer`, `CaptionTrack`, and `NotesPreview` from `frontend/src/components/scenes/index.ts` with the props in section 5.2. Until that file is provided, the frontend renders placeholders.

**For the integration lead (Person 1):**
1. Use the `frontend/` folder and install from `package-lock.json` with `npm ci`.
2. Copy `.env.example` to `.env`.
3. Keep `VITE_USE_MOCK=true` for the demo, or set it to `false` for backend work.
4. For backend work, start the API on port `8000`; then run `npm run dev`, or build and serve `dist/`.
5. Review the unresolved backend schema and route confirmations in section 5 before integration.

## 10. Known issues and TODOs

- Demo text in Hindi, Tamil, Telugu, and Kannada is AI-written and has not been reviewed by native speakers.
- Scene visuals are placeholders until Person 4's components exist.
- MP4 and download buttons are disabled in mock mode.
- Nothing has been tested against the real backend.
- MP4 captions need fonts from Person 2.
- The “Mock data” badge appears when `VITE_USE_MOCK=true`.
- [ ] Hindi/Tamil/Telugu/Kannada glyphs verified on a real device in captions and buttons.
- [ ] Phone playback tested on a real phone.
- [ ] Subtitle download behavior confirmed with the backend when no SRT is provided.
- [ ] Language switching on the result page (bonus): not built unless backend supports re-voice.
- **TO CONFIRM: Person 2** — backend job routes and response schema; stage/status values; language field.
- **TO CONFIRM: Person 4** — scene component exports, props, and diagram schema (`items` vs `nodes` + `edges`).
- **TO CONFIRM: Person 1 / Person 2** — `model_metadata` shape.
- `frontend/src/components/shell/` is named in the template but does not exist; the actual optional language check is `src/components/LanguageCheck.tsx`.
- The template describes `POST /api/lessons/generate`, `GET /api/lessons/{id}/status`, and a `lesson_id`/`status` generation response. The current client instead posts to `/api/jobs`, expects `job_id` or `id`, polls `/api/jobs/{id}`, and loads `/api/jobs/{id}/lesson`.
- The template's lesson example uses `lesson_plan.title` and object-valued `notes`; current types use `lesson_plan.topic` and `notes: string`.
- The template's manifest includes `subtitle_url`; the current type uses optional `subtitles_url`. The template also describes manifest fields not present in the current `ArtifactManifest` type.
- The actual unit-test command, `npm test`, includes 15 tests across 7 files. The template's Wi-Fi-off, real-device, and real-backend checks were not run.

## 11. Commit hash

- Stable commit: 
- HANDOFF.md added after (commit): 
- Date/time: 
