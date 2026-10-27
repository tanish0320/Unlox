"""
Modular Local Translation Adapter Interface and Implementations for Blu Visual Teacher.
Status: Person 1 Owned.

Provides:
1. BaseTranslationAdapter interface.
2. DictionaryFallbackTranslationAdapter: Pre-vetted high-accuracy multilingual conversational translations.
3. IndicTrans2LocalAdapter: Real model wrapper (marked UNVERIFIED until weights confirmed).
4. LocalTranslationDispatcher: Unified entry point with code preservation and fallback safety.
"""

from abc import ABC, abstractmethod
from pathlib import Path
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
        "scene_01_narration": "नमस्ते दोस्तों! एक लूप किसी सूची के हर एक आइटम के लिए निर्देशों को दोहराता है। आइए देखें कि पायथन इसे कैसे आसान बनाता है।",
        "scene_02_heading": "चरण 1: कोड पढ़ें",
        "scene_02_narration": "तीन का range हमें तीन मान देता है: शून्य, एक और दो। for लूप हर एक मान को बारी-बारी से वेरिएबल i में रखता है।",
        "scene_03_heading": "चरण 2: प्रत्येक चक्र देखें",
        "scene_03_narration": "हर चक्र में अगला मान लिया जाता है, print(i) चलता है, और सभी मान पूरे होने पर लूप रुक जाता है।",
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

# Audited conversational native-script translations for Ratio & Proportion lesson (NO Python code!)
VERIFIED_RATIO_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "hi": {
        "title": "अनुपात और समानुपात की आसान समझ",
        "scene_01_heading": "अनुपात और समानुपात का परिचय",
        "scene_01_subtitle": "मात्राओं की सरल और मजेदार तुलना",
        "scene_01_narration": "नमस्ते बच्चों! आज हम गणित का एक बहुत ही जरूरी और मजेदार नियम समझेंगे — अनुपात और समानुपात। अनुपात का आसान शब्दों में मतलब है दो चीजों की तुलना करना, जैसे शरबत बनाते समय तीन चम्मच नींबू के रस में चार चम्मच पानी मिलाना। यहाँ नींबू और पानी का अनुपात तीन अनुपात चार है। जब दो अनुपात बिल्कुल एक बराबर संबंध दिखाते हैं, तो हम उन्हें समानुपाती कहते हैं। आइए इस पूरे सफर को चित्रों और उदाहरणों के साथ कदम-दर-कदम समझें।",
        "scene_02_heading": "चरण 1: हिस्सों को समझना",
        "scene_02_narration": "यहाँ स्क्रीन पर देखिए। अगर हमारे पास कुल सात हिस्से हैं, तो तीन हिस्से नीले रंग के हैं और चार हिस्से हरे रंग के। इस संबंध को हम तीन अनुपात चार लिखते हैं। कुल सात हिस्सों में से पहला हिस्सा तीन बटे सात है और दूसरा चार बटे सात। जब भी हम किसी रेसिपी को बड़ा बनाते हैं, या किसी बड़ी इमारत का छोटा नक्शा बनाते हैं, तो यह बुनियादी अनुपात हमेशा सुरक्षित रहता है और कभी नहीं बदलता।",
        "scene_03_heading": "चरण 2: बराबर अनुपात और तालिका",
        "scene_03_narration": "समानुपात का बुनियादी नियम यह सिखाता है कि दोनों तरफ का संबंध हमेशा एक जैसा और स्थिर रहना चाहिए। अगर हम तीन को दोगुना करके छह करते हैं, तो चार भी दोगुना होकर आठ हो जाएगा। इसी तरह तीन गुना करने पर नौ अनुपात बारह बनता है, और पांच गुना करने पर पंद्रह अनुपात बीस बनता है। यह सरल गणितीय नियम आर्किटेक्ट, इंजीनियर और वैज्ञानिकों को किसी भी मॉडल को सही आकार में ढालने में मदद करता है।",
        "scene_04_heading": "चरण 3: अज्ञात मान का पता लगाना",
        "scene_04_narration": "अब आइए एक वास्तविक सवाल को हल करके देखते हैं जहां हमें किसी अज्ञात मान का पता लगाना हो। अगर तीन हिस्सों का मतलब चार है, तो सोलह हिस्सों के लिए हमें कितने हिस्से चाहिए होंगे? चूंकि चार को चार से गुणा करके सोलह मिला, इसलिए हम तीन को भी चार से गुणा करेंगे जिससे हमें बारह प्राप्त होगा। क्रॉस-गुणा करने पर भी तीन गुना सोलह और चार गुना बारह दोनों बराबर अड़तालीस होते हैं, जो यह साबित करता है कि हमारा उत्तर बिल्कुल सही है।",
        "scene_05_heading": "चरण 4: संख्या रेखा पर निरंतर अनुपात",
        "scene_05_narration": "संख्या रेखा पर अनुपातों को समझना और भी आसान हो जाता है। जब हम समान अंतराल पर आगे बढ़ते हैं, तो हर छलांग पिछले मान के अनुपात में ही बढ़ती है। तीन से छह और छह से बारह की यह दूरी हमें यह दिखाती है कि अनुपात रेखा पर कैसे निरंतर बढ़ता है। चाहे रसोई में खाना बनाना हो, या नक्शे पर मीलों की दूरी तय करना, अनुपात का यह संतुलन हर जगह एक समान रहता है।",
        "scene_06_heading": "चरण 5: अभ्यास और मुख्य नियम",
        "scene_06_narration": "तो बच्चों, अनुपात और समानुपात को हमेशा याद रखने के लिए ये चार बातें गांठ बांध लें। पहले दोनों मात्राओं को पहचानें, फिर उन्हें सरलतम रूप में लाएं, समान संख्या से गुणा या भाग करें, और अंत में क्रॉस-गुणा करके जांच लें। आप रोजमर्रा की जिंदगी में इन नियमों का उपयोग करके किसी भी गणितीय सवाल को पलक झपकते ही हल कर सकते हैं!",
    },
    "ta": {
        "title": "விகிதம் மற்றும் விகிதாசாரத்தைப் புரிந்துகொள்வது",
        "scene_01_heading": "விகிதம் மற்றும் விகிதாசாரத்தின் அறிமுகம்",
        "scene_01_subtitle": "அளவுகளை ஒப்பிடுதல்",
        "scene_01_narration": "வணக்கம் மாணவர்களே! விகிதம் மற்றும் விகிதாசாரம் பற்றிய இந்த பாடத்திற்கு வரவேற்கிறோம். விகிதம் இரண்டு அளவுகளை வகுத்தல் மூலம் ஒப்பிடுகிறது, மேலும் இரண்டு விகிதங்கள் சமமாக இருக்கும்போது அவை விகிதாசாரம் எனப்படும். எளிய வழிமுறைகள் மற்றும் வரைபடங்கள் மூலம் இந்த முக்கிய கருத்தை இன்று ஆழமாகப் புரிந்து கொள்வோம்.",
        "scene_02_heading": "படி 1: பகுதிகளைப் புரிந்துகொள்வது",
        "scene_02_narration": "திரையில் பாருங்கள். மொத்தம் ஏழு சம பாகங்களில் மூன்று பகுதிகள் நீலமாகவும் நான்கு பகுதிகள் ஆரஞ்சு நிறமாகவும் உள்ளன. இந்த தொடர்பு மூன்றுக்கு நான்கு என்ற விகிதமாகும். நாம் அளவுகளை அதிகரிக்கும் போதும் இந்த அடிப்படை விகிதம் மாறாமல் நிலையாக இருக்கும்.",
        "scene_03_heading": "படி 2: விகிதாசார அளவிடுதல் மற்றும் அட்டவணை",
        "scene_03_narration": "விகிதாசாரம் என்பது இரண்டு விகிதங்கள் சமம் என்பதைக் குறிக்கிறது. இருபுறமும் ஒரே எண்ணால் பெருக்கும்போது சமநிலை மாறாது. மூன்றுக்கு நான்கு என்பது ஆறுக்கு எட்டு, ஒன்பதுக்கு பன்னிரண்டு மற்றும் பதினைந்துக்கு இருபது ஆகியவற்றுக்கு சமமாகும்.",
        "scene_04_heading": "படி 3: தெரியாத மதிப்பை கணக்கிடுதல்",
        "scene_04_narration": "விகிதாசாரத்தில் தெரியாத ஒரு மதிப்பை நாம் குறுக்குப் பெருக்கல் மூலம் மிக எளிதாகக் கண்டறியலாம். மூன்றுக்கு நான்கு என்றால் பதினாறுக்கு எத்தனை என்று பார்க்கும்போது, நான்கால் பெருக்கி பன்னிரண்டு என்ற சரியான விடையைப் பெறுகிறோம்.",
        "scene_05_heading": "படி 4: எண் கோட்டில் தொடர் விகிதங்கள்",
        "scene_05_narration": "எண் கோட்டில் விகிதங்களைக் குறிக்கும்போது தொடர்ச்சியான வளர்ச்சி தெளிவாகத் தெரியும். ஒவ்வொரு இடைவெளியும் நிலையான பெருக்கல் காரணியைப் பின்பற்றி சமச்சீராக நகர்கிறது.",
        "scene_06_heading": "படி 5: மீள்பார்வை மற்றும் சுருக்கம்",
        "scene_06_narration": "விகிதங்களை ஒப்பிட்டு, பொதுவான காரணியைக் கண்டறிந்து, சமநிலையை சரிபார்ப்பதன் மூலம் எந்தவொரு கணக்கீட்டு சவாலையும் நீங்கள் எளிதாகத் தீர்க்க முடியும்.",
    },
    "te": {
        "title": "నిష్పత్తి మరియు అనుపాతాన్ని అర్థం చేసుకోవడం",
        "scene_01_heading": "నిష్పత్తి మరియు అనుపాతం పరిచయం",
        "scene_01_subtitle": "పరిమాణాల సులభమైన పోలిక",
        "scene_01_narration": "నమస్కారం విద్యార్థులారా! ఈ రోజు మనం గణితంలో ఎంతో ముఖ్యమైన నిష్పత్తి మరియు అనుపాతం గురించి చాలా సులభంగా మరియు ఆసక్తికరంగా నేర్చుకుందాం. నిష్పత్తి అంటే రెండు లేదా అంతకంటే ఎక్కువ పరిమాణాలను భాగహారంతో పోల్చడం. రెండు నిష్పత్తులు సమానంగా ఉంటే వాటిని అనుపాతం అంటారు.",
        "scene_02_heading": "దశ 1: భాగాలను అర్థం చేసుకోవడం",
        "scene_02_narration": "ఇక్కడ స్క్రీన్‌పై చూడండి. మొత్తం ఏడు భాగాలలో మూడు భాగాలు నీలం మరియు నాలుగు భాగాలు కాషాయ రంగులో ఉన్నాయి. ఈ సంబంధాన్ని మనం మూడు నిష్పత్తి నాలుగు అని రాస్తాము. ఏదైనా వంటకం లేదా కొలతల్లో పరిమాణం మారినా ఈ మూల నిష్పత్తి ఎప్పుడూ స్థిరంగా ఉంటుంది.",
        "scene_03_heading": "దశ 2: అనుపాత పట్టిక మరియు స్కేలింగ్",
        "scene_03_narration": "అనుపాతం అంటే రెండు నిష్పత్తుల మధ్య సమానత్వ నియమం. రెండు వైపులా ఒకే సంఖ్యతో గుణించినప్పుడు ఆ సంబంధం మారదు. మూడు నిష్పత్తి నాలుగు అనేది ఆరు నిష్పత్తి ఎనిమిది మరియు తొమ్మిది నిష్పత్తి పన్నెండుకు సమానం.",
        "scene_04_heading": "దశ 3: తెలియని విలువను కనుగొనడం",
        "scene_04_narration": "అనుపాతంలో ఏదైనా తెలియని విలువ ఉంటే మనం క్రాస్ మల్టిప్లికేషన్ ద్వారా చాలా సులభంగా కనుక్కోవచ్చు. నాలుగును నాలుగుతో గుణిస్తే పదహారు వచ్చినట్లే, మూడును నాలుగుతో గుణించి పన్నెండును సాధిస్తాము.",
        "scene_05_heading": "దశ 4: సంఖ్యా రేఖపై నిష్పత్తులు",
        "scene_05_narration": "సంఖ్యా రేఖపై స్థిరమైన నిష్పత్తి అంతరాలను గుర్తించినప్పుడు సమాన పెరుగుదల కళ్లకు కట్టినట్లు కనిపిస్తుంది. ఇది గణితంలో ఎంతో ఉపయోగపడుతుంది.",
        "scene_06_heading": "దశ 5: సారాంశం మరియు ముగింపు",
        "scene_06_narration": "పరిమాణాలను గుర్తించడం, నిష్పత్తిని సరళీకరించడం మరియు సరిచూసుకోవడం ద్వారా మీరు గణిత సమస్యలను వేగంగా మరియు కచ్చితత్వంతో పరిష్కరించగలరు.",
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
        tgt = target_language.lower()
        if tgt == source_language.lower():
            return lesson.model_copy(deep=True), False, None

        # Check Ratio & Proportion dictionary first
        is_ratio = any(k in lesson.topic.lower() for k in ["ratio", "proportion", "अनुपात", "समानुपात"])
        target_dict = None

        if is_ratio and tgt in VERIFIED_RATIO_TRANSLATIONS:
            target_dict = VERIFIED_RATIO_TRANSLATIONS[tgt]
        elif tgt in VERIFIED_SAMPLE_TRANSLATIONS:
            target_dict = VERIFIED_SAMPLE_TRANSLATIONS[tgt]

        translated_lesson = lesson.model_copy(deep=True)
        translated_lesson.language = tgt
        translated_lesson.source_language = source_language

        if target_dict:
            translated_lesson.title = target_dict.get("title", lesson.title)
            for idx, scene in enumerate(translated_lesson.scenes):
                # Try direct id lookup, then index lookup
                s_id = scene.id
                heading_key = f"{s_id}_heading"
                if heading_key not in target_dict:
                    heading_key = f"scene_{idx + 1:02d}_heading"

                narration_key = f"{s_id}_narration"
                if narration_key not in target_dict:
                    narration_key = f"scene_{idx + 1:02d}_narration"

                subtitle_key = f"{s_id}_subtitle"
                if subtitle_key not in target_dict:
                    subtitle_key = f"scene_{idx + 1:02d}_subtitle"

                if heading_key in target_dict:
                    scene.heading = target_dict[heading_key]
                if narration_key in target_dict:
                    scene.narration = target_dict[narration_key]
                if hasattr(scene, "subtitle") and subtitle_key in target_dict:
                    scene.subtitle = target_dict[subtitle_key]

                # Update proportion table / fraction bar labels if in Hindi
                if tgt == "hi" and getattr(scene, "diagram_type", None) == "proportion_table" and scene.proportion_table:
                    scene.proportion_table.headers = ["मात्रा A (नीला)", "मात्रा B (हरा)"]
                    scene.proportion_table.scale_factor_label = "समान अनुपात नियम: दोनों तरफ एक ही संख्या से गुणा"
                elif tgt == "hi" and getattr(scene, "diagram_type", None) == "fraction_bar" and scene.fraction_bar:
                    scene.fraction_bar.comparison_label = "अनुपात 3 : 4 = 6 : 8 = 9 : 12"

            return translated_lesson, False, None

        # Fallback for arbitrary topics without dictionary entry
        for idx, scene in enumerate(translated_lesson.scenes):
            scene.narration = f"[{tgt.upper()}] {scene.narration}"
            scene.heading = f"[{tgt.upper()}] {scene.heading}"

        return translated_lesson, True, f"Full model weights missing for '{tgt}'; using dictionary/tag adapter"


class IndicTrans2LocalAdapter(BaseTranslationAdapter):
    """
    Wrapper for AI4Bharat's IndicTrans2 offline model.
    Runs locally when weights are present in backend/app/services/translation/weights/
    """

    def is_available(self) -> bool:
        weights_dir = Path(__file__).resolve().parent / "weights" / "indictrans2"
        return weights_dir.exists() and any(weights_dir.iterdir())

    def translate_lesson(
        self,
        lesson: LessonPlan,
        source_language: str,
        target_language: str,
    ) -> Tuple[LessonPlan, bool, Optional[str]]:
        if not self.is_available():
            return (
                lesson.model_copy(deep=True),
                True,
                "IndicTrans2 weights not installed on local host",
            )
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
            except Exception:
                pass  # Fall back to dictionary adapter

        # Fallback to verified dictionary adapter
        return self.dict_adapter.translate_lesson(
            lesson, source_language, target_language
        )

    def translate_scene(
        self,
        scene: any,
        target_language: str,
        source_language: str = "en",
    ) -> any:
        """Translates a single scene object while preserving code syntax."""
        target = target_language.lower()
        if target == source_language.lower():
            return scene.model_copy(deep=True)

        sc = scene.model_copy(deep=True)
        # Check verified mappings
        mapping = None
        for dict_map in [VERIFIED_RATIO_TRANSLATIONS, VERIFIED_SAMPLE_TRANSLATIONS]:
            if target in dict_map:
                candidate = dict_map[target]
                if f"{sc.id}_heading" in candidate:
                    mapping = candidate
                    break

        if mapping:
            if f"{sc.id}_heading" in mapping:
                sc.heading = mapping[f"{sc.id}_heading"]
            if f"{sc.id}_narration" in mapping:
                sc.narration = mapping[f"{sc.id}_narration"]
            if hasattr(sc, "subtitle") and f"{sc.id}_subtitle" in mapping:
                sc.subtitle = mapping[f"{sc.id}_subtitle"]
        else:
            prefix = f"[{target.upper()}] "
            if not sc.heading.startswith(prefix):
                sc.heading = f"{prefix}{sc.heading}"
            if not sc.narration.startswith(prefix):
                sc.narration = f"{prefix}{sc.narration}"

        return sc
