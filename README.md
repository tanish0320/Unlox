# Blu Visual Teacher — Local AI Pipeline & System Integration
**Hackathon Project:** Blu Visual Teacher (24-Hour Offline-First Educational Video Generator)  
**Branch:** `Tanish`  
**Lead / Subsystem:** Person 1 (Local AI Pipeline, Model Integration & Final System Integration)

---

## 1. Overview
Blu Visual Teacher transforms a user-provided topic into a short, narrated, animated educational lesson in English and Indian languages without contacting external cloud APIs.

### Key Capabilities:
- **Offline & CPU-Capable:** Operates 100% offline with zero cloud API dependencies.
- **Deterministic Structured Planning:** Pydantic v2 discriminated union for scenes (`title_card`, `diagram`, `code_walkthrough`) with bounded 1-retry and deterministic fallback.
- **Audio-First Scene Timing:** Real measured audio duration drives video and scene playback length ($\text{Scene Duration} = \text{Audio Length} + \text{Padding}$).
- **Multilingual Support:** Audited native-script translations (Devanagari, Tamil, Telugu) with strict code and identifier preservation.
- **Synchronized Captions:** Scene-relative timestamps for interactive component preview + lesson-global timestamps for FFmpeg subtitle muxing.
- **Study Notes:** Consistent educational notes (`lesson-notes.json`) generated directly from validated lesson data.

---

## 2. Directory Structure
```
├── backend/
│   └── app/
│       ├── schemas/
│       │   ├── provisional_lesson.py    # Pydantic v2 LessonPlan schema
│       │   ├── audio_manifest.py        # Measured audio durations & captions
│       │   └── lesson_notes.py          # Structured study notes schema
│       └── services/
│           ├── planner/                 # Ollama adapter with retry & fallback
│           ├── tts/                     # Windows local TTS & mock waveform generator
│           ├── translation/             # Indic translation & code preservation
│           ├── mock_pipeline.py         # End-to-end local generation pipeline
│           └── notes_generator.py       # Canonical notes derivation service
├── contracts/
│   └── provisional_types.ts             # Synchronized TypeScript discriminated unions for Person 4
├── fixtures/
│   ├── sample-lesson.json               # Canonical 3-scene Python loop lesson
│   └── sample-notes.json                # Matching educational study notes fixture
├── outputs/
│   └── integration_fixtures/
│       ├── en/                          # Verified English bundle (real Windows SAPI5 audio)
│       └── hi/                          # Verified Hindi bundle (Devanagari script + audio)
├── scripts/
│   └── build_integration_fixtures.py    # Fixture generation & duration audit script
└── tests/
    ├── test_mock_pipeline.py            # Validation & pipeline tests
    ├── test_ollama_planner.py           # Mocked model responses, retry & fallback tests
    └── test_timeline_and_adapters.py    # Caption timelines, Unicode & real TTS tests
```

---

## 3. Running the Test Suite
Ensure dependencies (`pydantic>=2.0`, `pytest`, `httpx`, `pyttsx3`) are installed:
```powershell
python -m pytest tests/ -v
```
All 22 automated tests pass offline in ~10 seconds.

---

## 4. Hardware Tested & Licenses
- **Tested Machine:** Windows 11 64-bit, 16 GB RAM, Intel i5, NVIDIA RTX 3050 Laptop GPU (6 GB VRAM).
- **Runtimes:** Python 3.11 / 3.14, Node.js v24.13.0.
- **Code License:** MIT License.
- **Voice Assets:** Windows SAPI5 / Desktop Voices (`Microsoft Zira`, `Microsoft David`) licensed under host Windows OS EULA for local execution.
