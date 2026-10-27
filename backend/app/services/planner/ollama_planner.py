"""
Ollama Local Lesson Planner Adapter for Blu Visual Teacher.
Status: Person 1 Owned.

Provides structured schema-constrained JSON generation via Ollama,
with bounded 1-retry, strict Pydantic validation, timeout handling,
instructional mode guidance, and deterministic offline fallback.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import httpx
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.services.planner.instructional_modes import detect_instructional_mode


PLANNER_SYSTEM_PROMPT = """You are Blu Visual Teacher, an expert educational curriculum planner.
You turn a concept into a clear, engaging, step-by-step visual lesson.
You must output valid, clean JSON strictly adhering to the schema below.
Never include markdown formatting, backticks, conversational pleasantries, or code outside the JSON object.

RULES:
1. Output MUST be a valid JSON object matching the LessonPlan schema.
2. The lesson must contain between 3 and 6 scenes.
3. INSTRUCTIONAL MODE ENFORCEMENT:
   - Mathematics (e.g. Ratio and proportion, fractions, geometry): Use 'title_card' and 'diagram' (diagram_type: 'proportion_table', 'fraction_bar', 'number_line'). NEVER output 'code_walkthrough' scenes or Python code for mathematics or general topics!
   - Science (e.g. Photosynthesis, cells, physics, chemistry): Use 'title_card' and 'diagram' (diagram_type: 'science_diagram' or 'flowchart').
   - Computer Programming (e.g. Python loops, JavaScript, variables): ONLY for explicit coding topics, use 'code_walkthrough' scenes with 'code', 'highlight_lines', and 'expected_output'.
   - Social Studies / Humanities: Use 'title_card' and 'diagram' (flowcharts, timelines).
4. DURATION & DEPTH: Total spoken narration across all scenes must provide sufficient depth for target_duration_seconds (~2.2 words per second of duration).
5. In 'code_walkthrough', 'highlight_lines' must be 1-indexed and within the total lines of 'code'.
6. Narration must be natural, engaging spoken teaching text.
7. Return JSON ONLY. Do not execute or request execution of code.
"""


class OllamaLessonPlanner:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        model: str = "qwen2.5:3b",
        timeout_seconds: float = 30.0,
        fallback_fixture_path: Optional[Path] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds

        if fallback_fixture_path is not None:
            self.fallback_fixture_path = fallback_fixture_path
        else:
            found_path = None
            for p in Path(__file__).resolve().parents:
                candidate = p / "fixtures" / "sample-lesson.json"
                if candidate.exists():
                    found_path = candidate
                    break
            self.fallback_fixture_path = found_path or (Path("fixtures") / "sample-lesson.json")

    def get_fallback_lesson(
        self,
        topic: Optional[str] = None,
        target_duration_seconds: int = 60,
        level: str = "beginner",
        language: str = "en",
    ) -> LessonPlan:
        """Loads and returns an instruction-mode aware deterministic fallback lesson with proper duration scaling."""
        from backend.app.services.planner.mock_planner import MockLessonPlanner
        planner = MockLessonPlanner()
        plan, _ = planner.plan_lesson(
            topic=topic or "How Python Loops Work",
            level=level if level in ["beginner", "intermediate"] else "beginner",
            language=language,
            target_duration_seconds=target_duration_seconds,
        )
        return plan

    def is_available(self) -> bool:
        """Checks if the local Ollama service is reachable and responsive."""
        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def build_prompt(self, topic: str, level: str, target_duration_seconds: int) -> str:
        mode = detect_instructional_mode(topic)
        mode_instruction = ""
        if mode == "math":
            mode_instruction = (
                "Instructional Mode: MATHEMATICS.\n"
                "Use 'title_card' and 'diagram' (with diagram_type: 'proportion_table', 'fraction_bar', or 'number_line').\n"
                "CRITICAL: Do NOT generate code_walkthrough scenes or Python code. Teach using visual math models."
            )
        elif mode == "science":
            mode_instruction = (
                "Instructional Mode: SCIENCE.\n"
                "Use 'title_card' and 'diagram' (with diagram_type: 'science_diagram').\n"
                "Focus on system nodes, roles, and process steps."
            )
        elif mode == "programming":
            mode_instruction = (
                "Instructional Mode: PROGRAMMING.\n"
                "Use 'title_card', 'code_walkthrough' (with executable snippet), and 'diagram' for execution flow."
            )
        else:
            mode_instruction = (
                "Instructional Mode: CONCEPTUAL EXPLANATION.\n"
                "Use 'title_card' and 'diagram' (flowcharts, comparison cards)."
            )

        return (
            f"Topic: {topic}\n"
            f"Learner Level: {level}\n"
            f"Target Duration: {target_duration_seconds} seconds\n"
            f"{mode_instruction}\n\n"
            f"Create a structured lesson plan with 3 to 6 scenes covering this topic.\n"
            f"Ensure narration provides sufficient spoken duration (~{int(target_duration_seconds * 2.2)} words total across scenes).\n"
            "Output valid JSON only."
        )

    def plan_lesson(
        self,
        topic: str,
        level: str = "beginner",
        target_duration_seconds: int = 60,
        client: Optional[httpx.Client] = None,
        language: str = "en",
        **kwargs,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        """
        Generates a lesson plan via Ollama with schema enforcement.
        Returns: (LessonPlan, fallback_used: bool, error_reason: Optional[str])
        """
        prompt = self.build_prompt(topic, level, target_duration_seconds)

        # Attempt 1
        raw_response, call_err = self._call_ollama(prompt, client=client)
        if raw_response:
            plan, val_err = self._parse_and_validate(raw_response)
            if plan is not None:
                plan.language = language
                return plan, False, None

            # Attempt 2: Bounded 1-retry with error feedback
            retry_prompt = (
                f"{prompt}\n\n"
                f"Your previous output failed validation with error: {val_err}\n"
                f"Please fix and output ONLY valid JSON matching the LessonPlan schema."
            )
            raw_retry, _ = self._call_ollama(retry_prompt, client=client)
            if raw_retry:
                retry_plan, retry_err = self._parse_and_validate(raw_retry)
                if retry_plan is not None:
                    retry_plan.language = language
                    return retry_plan, False, None
                err_msg = f"Validation failed after retry: {retry_err}"
            else:
                err_msg = "Retry call to Ollama returned empty"
        else:
            err_msg = call_err or "Ollama unreachable or timed out"

        # Deterministic offline fallback
        fallback_plan = self.get_fallback_lesson(
            topic=topic,
            target_duration_seconds=target_duration_seconds,
            level=level,
            language=language,
        )
        fallback_plan.level = level if level in ["beginner", "intermediate"] else "beginner"
        fallback_plan.target_duration_seconds = target_duration_seconds
        fallback_plan.language = language
        return fallback_plan, True, err_msg

    def _call_ollama(
        self, prompt: str, client: Optional[httpx.Client] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": PLANNER_SYSTEM_PROMPT,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
            },
        }

        should_close = False
        if client is None:
            client = httpx.Client(timeout=self.timeout_seconds)
            should_close = True

        try:
            res = client.post(f"{self.base_url}/api/generate", json=payload)
            if res.status_code == 200:
                body = res.json()
                return body.get("response", ""), None
            return None, f"Ollama returned HTTP {res.status_code}: {res.text[:200]}"
        except httpx.TimeoutException:
            return None, f"Ollama request Timeout after {self.timeout_seconds}s"
        except Exception as exc:
            return None, f"Could not connect to Ollama service: {str(exc)}"
        finally:
            if should_close:
                client.close()

    def _parse_and_validate(
        self, raw_json_str: str
    ) -> Tuple[Optional[LessonPlan], Optional[str]]:
        try:
            cleaned = raw_json_str.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
            data = json.loads(cleaned)
            lesson = LessonPlan.model_validate(data)
            return lesson, None
        except json.JSONDecodeError as jde:
            return None, f"Malformed JSON: {str(jde)}"
        except ValidationError as ve:
            return None, f"Schema violation: {str(ve)}"
        except Exception as exc:
            return None, f"Unexpected error: {str(exc)}"
