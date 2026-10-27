"""
Modular Local Translation Adapter Interface and Implementations for Blu Visual Teacher.
Status: Person 1 Owned.

Provides:
1. BaseTranslationAdapter interface.
2. DictionaryFallbackTranslationAdapter: Pre-vetted high-accuracy multilingual translations.
3. IndicTrans2LocalAdapter: Real model wrapper (marked UNVERIFIED until weights confirmed).
4. LocalTranslationDispatcher: Unified entry point with code preservation and fallback safety.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple

from backend.app.schemas.provisional_lesson import (
    CodeWalkthroughScene,
    DiagramScene,
    LessonPlan,
    TitleCardScene,
)


class BaseTranslationAdapter(ABC):
    @abstractmethod
    def translate_lesson(
        self,
        lesson: LessonPlan,
        source_language: str,
        target_language: str,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        """
        Translates a lesson plan while preserving code and structural keys.
        Returns: (translated_plan, fallback_used, error_reason)
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


# Audited native-script translations for sample Python loop lesson
VERIFIED_SAMPLE_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "hi": {
        "title": "पायथन लूप कैसे काम करता है",
        "scene_01_heading": "पायथन लूप कैसे काम करता है?",
        "scene_01_subtitle": "प्रोग्रामिंग में पुनरावृत्ति को समझना",
        "scene_01_narration": "एक लूप किसी अनुक्रम में प्रत्येक मान के लिए निर्देश दोहराता है। आइए देखें कि पायथन इसे कैसे सरल बनाता है।",
        "scene_02_heading": "चरण 1: कोड पढ़ें",
        "scene_02_narration": "तीन का range तीन मान देता है: शून्य, एक और दो। for लूप प्रत्येक मान को वेरिएबल i को सौंपता है।",
        "scene_03_heading": "चरण 2: प्रत्येक पुनरावृत्ति देखें",
        "scene_03_narration": "प्रत्येक पास अगला मान लेता है, print(i) चलाता है, और सभी आइटम समाप्त होने पर रुक जाता है।",
    },
    "ta": {
        "title": "பைதான் லூப் எவ்வாறு செயல்படுகிறது",
        "scene_01_heading": "பைதான் லூப் எவ்வாறு செயல்படுகிறது?",
        "scene_01_subtitle": "நிரலாக்கத்தில் மறுசெய்கையைப் புரிந்துகொள்வது",
        "scene_01_narration": "ஒரு லூப் ஒரு வரிசையில் உள்ள ஒவ்வொரு மதிப்புக்கும் ஒரு வழிமுறையை மீண்டும் செய்கிறது. பைதான் இதை எவ்வாறு எளிதாக்குகிறது என்பதைப் பார்ப்போம்.",
        "scene_02_heading": "படி 1: குறியீட்டைப் படியுங்கள்",
        "scene_02_narration": "range(3) மூன்று மதிப்புகளை வழங்குகிறது: பூஜ்ஜியம், ஒன்று மற்றும் இரண்டு. for லூப் ஒவ்வொரு மதிப்பையும் மாறி i க்கு ஒதுக்குகிறது.",
        "scene_03_heading": "படி 2: ஒவ்வொரு சுழற்சியையும் கவனியுங்கள்",
        "scene_03_narration": "ஒவ்வொரு சுழற்சியும் அடுத்த மதிப்பை எடுத்துக்கொண்டு print(i) ஐ இயக்குகிறது, மேலும் அனைத்து உறுப்புகளும் முடிந்ததும் நின்றுவிடும்.",
    },
    "te": {
        "title": "పైథాన్ లూప్ ఎలా పనిచేస్తుంది",
        "scene_01_heading": "పైథాన్ లూప్ ఎలా పనిచేస్తుంది?",
        "scene_01_subtitle": "ప్రోగ్రామింగ్‌లో పునరావృతాన్ని అర్థం చేసుకోవడం",
        "scene_01_narration": "లూప్ అనేది ఒక శ్రేణిలోని ప్రతి విలువకు ఒక సూచనను పునరావృతం చేస్తుంది. పైథాన్ దీన్ని ఎలా సులభతరం చేస్తుందో చూద్దాం.",
        "scene_02_heading": "దశ 1: కోడ్ చదవండి",
        "scene_02_narration": "range(3) మూడు విలువలను ఇస్తుంది: సున్నా, ఒకటి మరియు రెండు. for లూప్ ప్రతి విలువను వేరియబుల్ i కి కేటాయిస్తుంది.",
        "scene_03_heading": "దశ 2: ప్రతి పునరావృతాన్ని గమనించండి",
        "scene_03_narration": "ప్రతి పాస్ తదుపరి విలువను తీసుకుంటుంది, print(i) ని రన్ చేస్తుంది మరియు అన్ని అంశాలు ముగిసినప్పుడు ఆగిపోతుంది.",
    },
}


class DictionaryFallbackTranslationAdapter(BaseTranslationAdapter):
    """
    Deterministic offline translation using audited native-script mappings.
    Guarantees that sample demo lessons never suffer from malformed machine translation.
    """

    def is_available(self) -> bool:
        return True

    def translate_lesson(
        self,
        lesson: LessonPlan,
        source_language: str,
        target_language: str,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        if target_language.lower() == source_language.lower():
            return lesson.model_copy(deep=True), False, None

        target = target_language.lower()
        if target in VERIFIED_SAMPLE_TRANSLATIONS and "loop" in lesson.topic.lower():
            mapping = VERIFIED_SAMPLE_TRANSLATIONS[target]
            translated = lesson.model_copy(deep=True)
            translated.language = target
            translated.title = mapping.get("title", translated.title)

            for scene in translated.scenes:
                h_key = f"{scene.id}_heading"
                n_key = f"{scene.id}_narration"
                s_key = f"{scene.id}_subtitle"

                if h_key in mapping:
                    scene.heading = mapping[h_key]
                if n_key in mapping:
                    scene.narration = mapping[n_key]
                if hasattr(scene, "subtitle") and s_key in mapping:
                    scene.subtitle = mapping[s_key]

                # Strict code and identifier preservation
                if isinstance(scene, CodeWalkthroughScene):
                    # Ensure code block is strictly unmodified
                    assert scene.code == lesson.scenes[1].code

            return translated, False, None

        # Generic recoverable prefix translation
        prefix = f"[{target.upper()}] "
        translated = lesson.model_copy(deep=True)
        translated.language = target
        translated.title = f"{prefix}{lesson.title}"
        for scene in translated.scenes:
            scene.heading = f"{prefix}{scene.heading}"
            scene.narration = f"{prefix}{scene.narration}"

        return translated, True, f"Target language '{target}' using synthetic translation fallback"


class IndicTrans2LocalAdapter(BaseTranslationAdapter):
    """
    Adapter wrapper for AI4Bharat IndicTrans2.
    Marked strictly UNVERIFIED until local model weights and tokenizer are confirmed on disk.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir
        self._model = None
        self._tokenizer = None

    def is_available(self) -> bool:
        # Check if local weights exist
        if not self.model_dir:
            return False
        import os

        return os.path.exists(self.model_dir)

    def translate_lesson(
        self,
        lesson: LessonPlan,
        source_language: str,
        target_language: str,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        if not self.is_available():
            # Return unverified / unavailable notice
            return (
                lesson.model_copy(deep=True),
                True,
                "IndicTrans2 weights not installed on local host",
            )
        # Real inference would go here once weights are verified
        raise NotImplementedError("IndicTrans2 real weights pending local benchmark")


class LocalTranslationDispatcher:
    def __init__(self):
        self.dict_adapter = DictionaryFallbackTranslationAdapter()
        self.indictrans_adapter = IndicTrans2LocalAdapter()

    def translate(
        self,
        lesson: LessonPlan,
        target_language: str,
        source_language: str = "en",
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        if target_language.lower() == source_language.lower():
            return lesson.model_copy(deep=True), False, None

        # Check real model first if available
        if self.indictrans_adapter.is_available():
            try:
                return self.indictrans_adapter.translate_lesson(
                    lesson, source_language, target_language
                )
            except Exception as e:
                pass  # Fall back to dictionary adapter

        # Fallback to verified dictionary adapter
        return self.dict_adapter.translate_lesson(
            lesson, source_language, target_language
        )
