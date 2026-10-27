"""
Ollama Local Lesson Planner Adapter for Blu Visual Teacher.
Status: Person 1 Owned.

Provides structured schema-constrained JSON generation via Ollama,
with bounded 1-retry, strict Pydantic validation, timeout handling,
and deterministic offline fallback.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import httpx
from pydantic import ValidationError

from backend.app.schemas.provisional_lesson import LessonPlan


PLANNER_SYSTEM_PROMPT = """You are Blu Visual Teacher, an expert educational curriculum planner.
You turn a concept into a clear, engaging, step-by-step visual lesson.
You must output valid, clean JSON strictly adhering to the schema below.
Never include markdown formatting, backticks, conversational pleasantries, or code outside the JSON object.

RULES:
1. Output MUST be a valid JSON object matching the LessonPlan schema.
2. The lesson must contain between 3 and 6 scenes.
3. Allowed scene 'type' values are ONLY: 'title_card', 'diagram', 'code_walkthrough'.
4. In 'code_walkthrough', 'highlight_lines' must be 1-indexed and within the total lines of 'code'.
5. Narration must be natural, engaging spoken teaching text.
6. Return JSON ONLY. Do not execute or request execution of code.
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

        self._cached_fallback: Optional[LessonPlan] = None

    def get_fallback_lesson(self, topic: Optional[str] = None) -> LessonPlan:
        """Loads and returns the verified deterministic fallback lesson fixture."""
        if self._cached_fallback is None:
            with open(self.fallback_fixture_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._cached_fallback = LessonPlan.model_validate(data)
        plan = self._cached_fallback.model_copy(deep=True)
        if topic:
            plan.topic = topic
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
        return (
            f"Topic: {topic}\n"
            f"Learner Level: {level}\n"
            f"Target Duration: {target_duration_seconds} seconds\n\n"
            "Create a structured lesson plan with 3 to 6 scenes covering this topic.\n"
            "Ensure on-screen content and narration build conceptual understanding step by step.\n"
            "Output valid JSON only."
        )

    def plan_lesson(
        self,
        topic: str,
        level: str = "beginner",
        target_duration_seconds: int = 60,
        client: Optional[httpx.Client] = None,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        """
        Generates a lesson plan via Ollama with schema enforcement.
        Returns: (LessonPlan, fallback_used: bool, error_reason: Optional[str])
        """
        prompt = self.build_prompt(topic, level, target_duration_seconds)

        # Attempt 1
        raw_response, call_err = self._call_ollama(prompt, client=client)
        if call_err:
            # Model unreachable or timed out -> fallback directly
            return self.get_fallback_lesson(topic), True, f"Ollama call failed: {call_err}"

        plan, val_err = self._parse_and_validate(raw_response)
        if plan:
            return plan, False, None

        # Bounded Retry (Attempt 2 with corrective feedback)
        correction_prompt = (
            f"The previous output was invalid.\n"
            f"Validation Error: {val_err}\n"
            f"Original Topic: {topic}\n"
            f"Correct the mistake and return ONLY valid JSON matching the LessonPlan schema."
        )
        retry_raw, retry_err = self._call_ollama(correction_prompt, client=client)
        if not retry_err:
            retry_plan, retry_val_err = self._parse_and_validate(retry_raw)
            if retry_plan:
                return retry_plan, False, None
            final_err = f"Validation failed after retry: {retry_val_err}"
        else:
            final_err = f"Retry call failed: {retry_err}"

        # Fallback after failed retry
        return self.get_fallback_lesson(topic), True, final_err

    def _call_ollama(
        self, prompt: str, client: Optional[httpx.Client] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """Invokes Ollama API /api/generate with JSON format restriction."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": PLANNER_SYSTEM_PROMPT,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            },
        }

        should_close = False
        if client is None:
            client = httpx.Client(timeout=self.timeout_seconds)
            should_close = True

        try:
            res = client.post(f"{self.base_url}/api/generate", json=payload)
            if res.status_code != 200:
                return None, f"HTTP {res.status_code}: {res.text}"
            data = res.json()
            return data.get("response", ""), None
        except httpx.TimeoutException:
            return None, f"Timeout after {self.timeout_seconds}s"
        except httpx.ConnectError:
            return None, f"Could not connect to Ollama at {self.base_url}"
        except Exception as e:
            return None, str(e)
        finally:
            if should_close:
                client.close()

    def _parse_and_validate(
        self, raw_text: str
    ) -> Tuple[Optional[LessonPlan], Optional[str]]:
        """Parses JSON and performs Pydantic validation."""
        if not raw_text or not raw_text.strip():
            return None, "Empty response"

        try:
            parsed = json.loads(raw_text.strip())
        except json.JSONDecodeError as e:
            return None, f"JSONDecodeError: {e}"

        try:
            plan = LessonPlan.model_validate(parsed)
            return plan, None
        except ValidationError as e:
            return None, f"Schema ValidationError: {e}"
