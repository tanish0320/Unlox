"""
Mock Translation Service for Blu Visual Teacher.
Status: Person 1 Owned.

Translates lesson narration and headings while preserving code blocks,
technical identifiers, and schema keys. Provides offline fallback translations.
"""

from typing import Dict, Tuple
from backend.app.schemas.provisional_lesson import LessonPlan


# Vetted fallback translation mappings for the sample Python loop lesson
SAMPLE_TRANSLATIONS: Dict[str, Dict[str, str]] = {
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
        "scene_01_narration": "ஒரு லூப் ஒரு வரிசையில் உள்ள ஒவ்வொரு மதிப்புக்கும் ஒரு வழிமுறையை மீண்டும் செய்கிறது.",
        "scene_02_heading": "படி 1: குறியீட்டைப் படியுங்கள்",
        "scene_02_narration": "range(3) மூன்று மதிப்புகளை வழங்குகிறது: பூஜ்ஜியம், ஒன்று மற்றும் இரண்டு.",
        "scene_03_heading": "படி 2: ஒவ்வொரு சுழற்சியையும் கவனியுங்கள்",
        "scene_03_narration": "ஒவ்வொரு சுழற்சியும் அடுத்த மதிப்பை எடுத்துக்கொண்டு print(i) ஐ இயக்குகிறது.",
    },
}


class MockTranslationService:
    def __init__(self):
        self.supported_languages = {"en", "hi", "ta", "te", "kn", "bn", "mr"}

    def translate_lesson(
        self, lesson: LessonPlan, target_language: str
    ) -> Tuple[LessonPlan, bool]:
        """
        Translates a lesson plan into target_language.
        Returns (translated_lesson, fallback_used).
        Preserves code, identifiers, and schema types.
        """
        if target_language == "en" or target_language == lesson.language:
            # No translation needed
            return lesson.model_copy(deep=True), False

        translated = lesson.model_copy(deep=True)
        translated.language = target_language

        # Check if pre-vetted translation dictionary exists
        if target_language in SAMPLE_TRANSLATIONS and "loop" in lesson.topic.lower():
            mapping = SAMPLE_TRANSLATIONS[target_language]
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

            return translated, False

        # Simulated fallback translation with technical term preservation:
        # In mock mode, prefixes language tag to simulate translation without mangling code
        prefix = f"[{target_language.upper()}] "
        translated.title = f"{prefix}{lesson.title}"
        for scene in translated.scenes:
            scene.heading = f"{prefix}{scene.heading}"
            scene.narration = f"{prefix}{scene.narration}"
            # Notice: scene.code and scene.highlight_lines are untouched!

        return translated, True
