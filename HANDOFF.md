# HANDOFF: Person 3 (Frontend Shell + Player)

Project: Blu Visual Teacher | Branch: `feat/ui-player` | Folder: `frontend/`

> **Status legend:** `[ ]` not done, `[~]` in progress, `[x]` done and tested.
> Items marked **TO CONFIRM** need an answer from the named person.
> Anything not marked `[x]` must not be assumed to work.

---

## 1. What I implemented

| Feature | Status |
|---|---|
| Vite + React + TypeScript app shell, light/dark theme, offline pill | [ ] |
| Design tokens (`src/theme/tokens.css`), shared with Person 4 | [ ] |
| API client with mock mode (`VITE_USE_MOCK`) | [ ] |
| Generation form (topic, level, language, duration) | [ ] |
| Progress stepper (7 stages, timings, fallback banner, error + retry) | [ ] |
| Lesson player (play, pause, prev, next, replay, captions, speed, fullscreen) | [ ] |
| Audio-driven scene timing | [ ] |
| Interactive / MP4 toggle | [ ] |
| Result page (Overview, Notes, Details tabs) | [ ] |
| Downloads: MP4, Notes JSON, Subtitles (SRT, optional) | [ ] |
| Tests (Vitest) | [ ] |

**Incomplete / not planned:** history, chatbot, accounts, video editing.

## 2. Files changed

Only these paths are mine. I do not edit any other path.

```
frontend/src/pages/Home.tsx
frontend/src/components/GenerationForm.tsx
frontend/src/components/GenerationProgress.tsx
frontend/src/components/LessonPlayer.tsx
frontend/src/components/ResultView.tsx
frontend/src/components/shell/
frontend/src/api/types.ts
frontend/src/api/client.ts
frontend/src/api/mockData.ts
frontend/src/hooks/useLessonJob.ts
frontend/src/hooks/usePlayback.ts
frontend/src/adapters/normalize.ts
frontend/src/config/languages.ts
frontend/src/theme/tokens.css
frontend/src/theme/base.css
frontend/.env.example
```

Entry points: `src/main.tsx` -> `src/App.tsx` -> `src/pages/Home.tsx`.

## 3. Dependencies

- Node 20 or newer, npm
- Runtime: `react`, `react-dom`, `lucide-react`
- Fonts (bundled, no CDN): `@fontsource/inter`, `@fontsource/noto-sans-devanagari`, `@fontsource/noto-sans-tamil`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-kannada`
- Dev: `vite`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- System tools needed: none. Models needed: none. (Pure frontend.)

Exact versions: see `frontend/package.json` and `package-lock.json` (fill after final build).

## 4. How to run (clean checkout)

```
git checkout feat/ui-player
cd frontend
npm ci
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev                 # http://localhost:5173
npm test
npm run build
```

Mock mode (default): works with no backend. Real backend: set `VITE_USE_MOCK=false` and run FastAPI on port 8000 (Vite proxies `/api`).

## 5. Interface contract

### 5.1 What I CALL (Person 2 must provide)

| Method + path | Request | Response |
|---|---|---|
| `POST /api/lessons/generate` | `{topic, level, language, target_duration_seconds}` | `{lesson_id, status}` |
| `GET /api/lessons/{id}/status` | none | `{status, stage, progress_percent, message, fallback_used}` |
| `GET /api/lessons/{id}` | none | `{lesson_plan, notes, artifact_manifest}` |
| `GET /api/lessons/{id}/video` | none | `video/mp4` |
| `GET /api/lessons/{id}/notes` | none | `application/json` attachment |
| `GET /api/lessons/{id}/subtitles` | none | SRT (optional; button hidden if missing) |

- `level`: `"beginner"` or `"intermediate"`
- `language`: `en`, `hi`, `ta`, `te`, `kn` ... (final demo set is in `src/config/languages.ts`)
- `target_duration_seconds`: 30 to 90
- `stage` values I expect: `validating, planning, translating, narrating, rendering, exporting, ready` (**TO CONFIRM: Person 2**)
- `status` values I expect: `queued, running, ready, failed` (**TO CONFIRM: Person 2**)

### 5.2 What I NEED INSIDE `GET /api/lessons/{id}` (**TO CONFIRM: Person 2**)

```
artifact_manifest: {
  lesson_id, language, duration_seconds, fallback_used,
  timings_by_stage: { planning: 4.2, translating: 3.1, ... },
  audio: [ { scene_id, audio_url, duration_seconds } ],
  video_url, notes_url, subtitle_url?   // subtitle_url optional
}
```

Without `audio_url` + `duration_seconds` per scene, the player falls back to a timer (mock only) and cannot stay in sync with audio.

**Field-name conflict (TO CONFIRM: Person 2):** the PRD says `source_language` / `target_language`, the workflow doc says `language`. My adapter (`src/adapters/normalize.ts`) reads `target_language ?? language`, so either works, but please pick one.

### 5.3 What I USE from Person 4 (**TO CONFIRM: Person 4**)

```tsx
<SceneRenderer scene={scene} timeSeconds={t} durationSeconds={d} />
<CaptionTrack text={string} visible={boolean} />
<NotesPreview notes={notes} />
```

- Scenes must be pure functions of `timeSeconds` (no internal timers).
- Unknown scene `type` must not crash. I show a safe placeholder if a component is missing.
- Tokens: please use the CSS variables in `src/theme/tokens.css`.

### 5.4 What I USE from Person 1

Nothing directly. I only display `fallback_used`, stage timings and model names that arrive in the manifest/notes (**TO CONFIRM: Person 1 / Person 2** for `model_metadata` shape).

### 5.5 My component props

```tsx
<LessonPlayer lesson={LessonResponse} lessonId={string} defaultMode="interactive" | "video" />
<GenerationForm onSubmit={(req: GenerateRequest) => void} disabled={boolean} />
<GenerationProgress status={JobStatus} onRetry={() => void} onUseSample={() => void} />
```

## 6. Example input / output (this is also my mock fixture)

**Request**
```json
{ "topic": "How does a Python loop work?", "level": "beginner", "language": "hi", "target_duration_seconds": 45 }
```

**Generate response**
```json
{ "lesson_id": "demo-001", "status": "queued" }
```

**Status response**
```json
{ "status": "running", "stage": "narrating", "progress_percent": 55, "message": "Creating voice", "fallback_used": false }
```

**Lesson response (trimmed)**
```json
{
  "lesson_plan": {
    "schema_version": "1.0",
    "title": "How a Python loop works",
    "level": "beginner",
    "language": "hi",
    "target_duration_seconds": 45,
    "scenes": [
      { "id": "s1", "type": "title_card", "heading": "How does a Python loop work?", "narration": "..." },
      { "id": "s2", "type": "code_walkthrough", "heading": "Step 1: Read the code",
        "code": "for i in range(3):\n    print(i)", "highlight_lines": [1], "narration": "..." },
      { "id": "s3", "type": "diagram", "heading": "Step 2: Watch each iteration",
        "items": ["i = 0", "i = 1", "i = 2"], "narration": "..." }
    ]
  },
  "notes": { "title": "...", "summary": "...", "key_concepts": [], "revision_questions": [] },
  "artifact_manifest": {
    "lesson_id": "demo-001", "language": "hi", "duration_seconds": 18.4, "fallback_used": false,
    "timings_by_stage": { "planning": 4.2, "translating": 3.1, "narrating": 6.0, "rendering": 5.5, "exporting": 2.2 },
    "audio": [
      { "scene_id": "s1", "audio_url": "/api/lessons/demo-001/audio/s1.wav", "duration_seconds": 5.2 },
      { "scene_id": "s2", "audio_url": "/api/lessons/demo-001/audio/s2.wav", "duration_seconds": 6.8 },
      { "scene_id": "s3", "audio_url": "/api/lessons/demo-001/audio/s3.wav", "duration_seconds": 6.4 }
    ]
  }
}
```

Diagram fields (`items` vs `nodes` + `edges`) are **TO CONFIRM: Person 4 / Person 2**. I follow whatever the frozen schema says.

## 7. Environment variables (`frontend/.env.example`)

```
VITE_USE_MOCK=true            # true = fake data, false = real backend
VITE_API_BASE=/api            # base path of the FastAPI backend
VITE_POLL_INTERVAL_MS=800     # how often to check job status
VITE_JOB_TIMEOUT_MS=180000    # stop waiting after 3 minutes
```

No secrets. No API keys. Nothing is loaded from the internet.

Mock URL switches: `?fail=1` (job fails), `?fallback=1` (fallback banner).

## 8. Testing

```
cd frontend
npm test
npm run build
```

| Test | Expected | Result |
|---|---|---|
| Mock client reaches `ready` | passes | [ ] |
| Playback: scene length = `duration_seconds` + 0.6s; next/prev/replay | passes | [ ] |
| Form: empty topic shows error; valid input submits correct payload | passes | [ ] |
| Unknown scene type shows placeholder, no crash | passes | [ ] |
| No `http://` or `https://` asset links in `src/` and `index.html` | none found | [ ] |
| Wi-Fi OFF: full flow in all 3 languages | works | [ ] |
| 360px phone width, no horizontal scroll | works | [ ] |
| Bundle size (production) | _fill in_ | [ ] |

Known limits: _fill in after testing_.

## 9. Integration instructions

**For Person 2 (backend):** return the shapes in 5.1 and 5.2. In dev, FastAPI must listen on `localhost:8000`. I proxy `/api`, so no CORS setup is needed. Serve audio files at the `audio_url` paths.

**For Person 4 (scenes):** export `SceneRenderer`, `CaptionTrack`, `NotesPreview` from `frontend/src/components/scenes/index.ts`. I import them from that one file only. Until it exists I use placeholders with the same props.

**For the integration lead (Person 1):**
1. Copy `frontend/` from my branch (or merge `feat/ui-player`).
2. `cd frontend && npm ci && cp .env.example .env`
3. Set `VITE_USE_MOCK=false`.
4. Start backend, then `npm run dev` (or `npm run build` and serve `dist/`).
5. Any mismatch in field names is fixed in `src/adapters/normalize.ts`. Please do not edit other files without telling me.

## 10. Known issues and TODOs

_Fill honestly at handoff time. Examples to check:_
- [ ] Hindi/Tamil/Telugu/Kannada glyphs verified in captions and buttons
- [ ] Phone playback tested on a real phone
- [ ] Subtitle download hidden when backend has no SRT
- [ ] Language switch on result page (bonus): not built unless backend supports re-voice

## 11. Commit hash

- Stable commit: `__________`
- HANDOFF.md added after (commit): `__________`
- Date/time: `__________`
