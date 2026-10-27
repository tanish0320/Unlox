"""
Instructional Mode Classifier for Blu Visual Teacher.

Determines the pedagogical presentation mode based on the user's topic and intent:
- 'math': Worked mathematical examples, proportion tables, fraction bars, number lines (NO code scenes).
- 'science': Visual science diagrams, biological/physical systems, process flowcharts.
- 'programming': Code walkthrough, syntax highlighting, active line focus (ONLY when explicitly requested).
- 'social_studies': Timelines, historical concepts, comparisons, geographic maps.
- 'general': Conceptual breakdown, comparison cards, structured diagrams.
"""

import re
from typing import Literal

InstructionalMode = Literal["math", "science", "programming", "social_studies", "general"]

PROGRAMMING_KEYWORDS = [
    r"\bpython\b", r"\bjavascript\b", r"\bjs\b", r"\bcode\b", r"\bcoding\b",
    r"\bprogramming\b", r"\bloop\b", r"\bfor loop\b", r"\bwhile loop\b",
    r"\bfunction\b", r"\bvariable\b", r"\barray\b", r"\blist comprehension\b",
    r"\balgorithm\b", r"\bdebugging\b", r"\bhtml\b", r"\bcss\b", r"\bclass\b",
    r"\bobject-oriented\b", r"\brecursion\b", r"\bsyntax\b", r"\bcompiler\b"
]

MATH_KEYWORDS = [
    r"\bratios?\b", r"\bproportions?\b", r"\bfractions?\b", r"\bpercentages?\b", r"\bpercents?\b",
    r"\bnumber lines?\b", r"\bintegers?\b", r"\bpythagor\w*\b", r"\btriangles?\b", r"\bhypotenuse\b",
    r"\balgebra\b", r"\bgeometry\b", r"\bequations?\b", r"\bmultiplications?\b", r"\bdivisions?\b",
    r"\badditions?\b", r"\bsubtractions?\b", r"\btrigonometry\b", r"\bcalculus\b", r"\bprime numbers?\b",
    r"\bgcd\b", r"\bhcf\b", r"\blcm\b", r"\bdecimals?\b", r"\bmaths?\b",
    r"\bmathematics\b", r"अनुपात", r"समानुपात", r"भिन्न", r"गणित"
]

SCIENCE_KEYWORDS = [
    r"\bphotosynthesis\b", r"\bplant\b", r"\bcell\b", r"\batom\b", r"\bmolecule\b",
    r"\bgravity\b", r"\bphysics\b", r"\bchemistry\b", r"\bbiology\b", r"\benergy\b",
    r"\blight\b", r"\bwater cycle\b", r"\bdna\b", r"\belectron\b", r"\bplanet\b",
    r"\bsolar system\b", r"\bevolution\b", r"\bforces?\b", r"\bmotion\b", r"\bnewton\w*\b",
    r"\bcircuits?\b", r"\bmechanics\b", r"\bdynamics\b", r"\b प्रकाश संश्लेषण\b", r"कोशिका", r"गुरुत्वाकर्षण", r"विज्ञान"
]

SOCIAL_STUDIES_KEYWORDS = [
    r"\bhistory\b", r"\bgeography\b", r"\btrade route\b", r"\bdemocracy\b",
    r"\bmap\b", r"\bcompass\b", r"\bsettlement\b", r"\bgovernment\b",
    r"\bconstitution\b", r"\bcivilizations?\b", r"\brevolution\b", r"\belection\b",
    r"\briver valley\b", r"\bindus\b", r"\bharappa\b", r"\bmohenjo\b", r"\bmesopotamia\b",
    r"\bnile\b", r"\btigris\b", r"\beuphrates\b", r"\bancient\b", r"\barchaeology\b"
]


def detect_instructional_mode(topic: str) -> InstructionalMode:
    """Classifies a user prompt into the most appropriate pedagogical instructional mode."""
    t_clean = topic.lower().strip()

    # 1. Programming (requires explicit programming/coding keywords)
    for pattern in PROGRAMMING_KEYWORDS:
        if re.search(pattern, t_clean):
            return "programming"

    # 2. Mathematics
    for pattern in MATH_KEYWORDS:
        if re.search(pattern, t_clean):
            return "math"

    # 3. Science
    for pattern in SCIENCE_KEYWORDS:
        if re.search(pattern, t_clean):
            return "science"

    # 4. Social Studies / Humanities
    for pattern in SOCIAL_STUDIES_KEYWORDS:
        if re.search(pattern, t_clean):
            return "social_studies"

    # 5. Default General Concept
    return "general"
