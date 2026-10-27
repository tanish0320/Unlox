# Blu Visual Teacher — Full Product Integration & Documentation
**Hackathon Project:** Blu Visual Teacher (24-Hour Offline-First Educational Video Generator)  
**Branch:** `Tanish`  
**System Status:** **COMPLETE & VERIFIED** (27/27 Python tests passing, 39/39 Vitest tests passing, 100% Offline & Deterministic)

---

## 1. Executive Summary

**Blu Visual Teacher** transforms any learning topic into an animated, narrated video lesson with synchronized native-script captions and structured study notes — running entirely offline without external cloud AI dependencies.

This implementation successfully integrates:
1. **Person 1's Local AI & Audio Pipeline**: Pydantic v2 schemas, Ollama planner with deterministic fallbacks, offline Windows SAPI5 speech synthesis with exact duration measurement, native-script translation adapters, and structured study notes derivation.
2. **Person 4's Frontend Scene Engine**: 16:9 1280×720 deterministic animated canvas (`TitleCard`, `DiagramSceneComponent`, `CodeWalkthroughSceneComponent`), `CaptionTrack`, and `NotesPreview`.
3. **Supplied Human-Centered UI Design**: Faithfully reproduced warm cream layout (`#FBF9F4`) with dot grid, editorial serif headings, hand-drawn landscape header, 4-step progress stepper, quick-idea category pills, and integrated animated player.
4. **Offline MP4 Video Exporter**: Direct FFmpeg pipeline encoding 1280×720 H.264 video, AAC audio, and burned-in captions verified via FFprobe, plus companion `.srt` subtitle generation.

---

## 2. Quickstart & How to Run on Windows

### A. Start the FastAPI Backend Server
In PowerShell:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
*API is accessible at `http://127.0.0.1:8000/docs`.*

### B. Start the Frontend Application
In a second PowerShell window:
```powershell
cd frontend
npm run dev
```
*Open `http://localhost:5173` in Microsoft Edge, Google Chrome, or any modern browser.*

---

## 3. Test Suites & Verification Results

### A. Python Backend & Exporter Test Suite (27/27 Passed)
```powershell
python -m pytest -v
```
- `tests/test_api_and_exporter.py`: Health checks, sample fixture delivery, audio streaming, video streaming, subtitle delivery, MP4 rendering and FFprobe verification (**6 passed**).
- `tests/test_mock_pipeline.py`: Pydantic validation, scene bounds, duplicate ID rejection, code walkthrough highlight lines, notes derivation, and pipeline E2E (**10 passed**).
- `tests/test_ollama_planner.py`: Ollama schema enforcement, bounded 1-retry, connection failure fallback, and timeout recovery (**6 passed**).
- `tests/test_timeline_and_adapters.py`: Scene-relative vs. global captions, multi-language duration independence, Unicode script preservation, and real offline Windows SAPI5 speech synthesis (**5 passed**).

### B. Frontend Vitest Component Suite (39/39 Passed)
```powershell
cd frontend
npm run test
```
- `animationUtils.test.ts`: Pure timestamp math, lerp, easing, clamp (**8 passed**).
- `TitleCard.test.tsx`: 3-phase animation (reveal, breath, settle) and badges (**4 passed**).
- `DiagramScene.test.tsx`: Flowchart layout, active step highlight, and `items[]` dual-mode (**5 passed**).
- `CodeWalkthroughScene.test.tsx`: Syntax highlighting, line numbers, highlight lines (**4 passed**).
- `CaptionTrack.test.tsx`: Multilingual scripts (English, Hindi, Kannada, Tamil, Telugu) and `getActiveCaption` resolver (**9 passed**).
- `NotesPreview.test.tsx`: Summary, objectives, glossary, and revision Q&A (**4 passed**).
- `SceneRenderer.test.tsx`: Master 16:9 stage dispatcher (**5 passed**).

### C. Frontend Typecheck & Build
```powershell
cd frontend
npm run build
```
- `tsc --noEmit` exited with 0 errors.
- Vite optimized bundle built in `<1s` to `dist/`.

---

## 4. Key Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Reports offline engine status, local voice availability, and FFmpeg detection. |
| `/api/lessons/fixtures/sample` | `GET` | Instantly returns the vetted 3-scene English bundle with browser-accessible audio URLs. |
| `/api/lessons/generate` | `POST` | Enqueues a generation job for `{ topic, level, language, target_duration_seconds }`. |
| `/api/lessons/jobs/{job_id}` | `GET` | Live progress polling (`generating_script` -> `synthesizing_audio` -> `exporting_video` -> `completed`). |
| `/api/lessons/{id}` | `GET` | Canonical `LessonPlan v1.0` JSON. |
| `/api/lessons/{id}/manifest` | `GET` | `AudioManifest` JSON with relative URLs to synthesized WAV files. |
| `/api/lessons/{id}/notes` | `GET` | Structured educational notes (`summary`, `key_concepts`, `revision_questions`). |
| `/api/lessons/{id}/video` | `GET` | Streams or downloads the exported 1280×720 H.264/AAC MP4 video file. |
| `/api/lessons/{id}/captions` | `GET` | Downloads the generated `.srt` subtitles. |
| `/api/audio/{lesson_id}/{file}` | `GET` | Streams synthesized audio WAV files for browser `<audio>` playback. |

---

## 5. Exported Artifacts

- **Verified MP4 Video:** `outputs/exported_videos/en/lesson_en.mp4` (1280×720, H.264, AAC audio, 22.75s timeline duration, 311 KB).
- **Verified Subtitles:** `outputs/exported_videos/en/lesson_en.srt` (Standard SubRip format, scene-aligned timestamps).
- **Verified Study Notes:** `outputs/integration_fixtures/en/lesson-notes.json` (PRD-compliant study notes).
- **UI Screenshot:** `outputs/verification_screenshot.png` (Playwright-captured full-page browser rendering matching design references).

---

## 6. Offline Operation & Safety Guarantees

1. **Zero External AI APIs:** All planning, speech synthesis, and video encoding operate on the local machine.
2. **Display-Only Code Rendering:** Code walkthroughs are tokenized and rendered as inert SVG/text; code is never executed.
3. **Graceful Fallbacks:** If Ollama is offline or IndicTrans2 model checkpoints are not installed, the system activates audited deterministic sample fallbacks and flags them in metadata (`fallback_used: true`).
