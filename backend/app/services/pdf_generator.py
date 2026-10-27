"""
Offline PDF Study Notes Generator for Blu Visual Teacher.

Generates high-quality, beautifully formatted PDF study guides from
canonical LessonPlan and LessonNotes models.

Features:
- 100% offline generation using ReportLab.
- Native Unicode support for Devanagari (Hindi), Telugu, Tamil, and Kannada
  via Microsoft's Nirmala.ttc font (standard on Windows) with Helvetica fallback.
- Professional educational styling matching Blu Visual Teacher branding:
  Forest Green (#234E3C), Warm Terracotta (#C87A64), Sage Light (#DEF0E5).
- Comprehensive study sections:
  1. Header with Metadata (Topic, Level, Language, Generation Date)
  2. Summary Box with Key Objectives
  3. Key Takeaways
  4. Glossary & Concept Definitions (formatted table)
  5. Revision & Practice Questions
  6. Scene-by-Scene Visual Lesson Breakdown
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from backend.app.schemas.provisional_lesson import LessonPlan
from backend.app.schemas.lesson_notes import LessonNotes


# ---------------------------------------------------------------------------
# Font Registration (Universal Indic + Latin Support)
# ---------------------------------------------------------------------------

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

_font_registered = False

def _register_unicode_fonts():
    """Registers Unicode TrueType fonts (Nirmala UI for Indic & Devanagari support)."""
    global FONT_REGULAR, FONT_BOLD, _font_registered
    if _font_registered:
        return

    nirmala_path = Path("C:/Windows/Fonts/Nirmala.ttc")
    nirmala_bold_path = Path("C:/Windows/Fonts/NirmalaB.ttc")

    if nirmala_path.is_file():
        try:
            # Subfont index 0 in Nirmala.ttc is Nirmala UI
            pdfmetrics.registerFont(TTFont("NirmalaUI", str(nirmala_path), subfontIndex=0))
            FONT_REGULAR = "NirmalaUI"

            if nirmala_bold_path.is_file():
                pdfmetrics.registerFont(TTFont("NirmalaUI-Bold", str(nirmala_bold_path), subfontIndex=0))
                FONT_BOLD = "NirmalaUI-Bold"
            else:
                FONT_BOLD = "NirmalaUI"
            _font_registered = True
            return
        except Exception as e:
            # Fall back to standard Helvetica
            pass

    # Check for Mangal or Arial Unicode as alternative
    mangal_path = Path("C:/Windows/Fonts/mangal.ttf")
    if mangal_path.is_file():
        try:
            pdfmetrics.registerFont(TTFont("Mangal", str(mangal_path)))
            FONT_REGULAR = "Mangal"
            FONT_BOLD = "Mangal"
            _font_registered = True
            return
        except Exception:
            pass

    _font_registered = True


# Initialize font registration
_register_unicode_fonts()


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' in the footer."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont(FONT_REGULAR, 8.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.8)
        self.line(46, 36, 566, 36)

        # Footer text
        footer_left = "Blu Visual Teacher — Offline-First Educational System"
        footer_right = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(46, 24, footer_left)
        self.drawRightString(566, 24, footer_right)

        self.restoreState()


def generate_lesson_pdf(
    lesson: LessonPlan,
    notes: Optional[LessonNotes] = None,
    output_path: Optional[Path] = None,
) -> Path:
    """
    Renders a formatted PDF study guide from LessonPlan and LessonNotes.
    Saves to output_path and returns the Path object.
    """
    _register_unicode_fonts()

    if output_path is None:
        output_path = Path("study_notes.pdf")
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=46,
        rightMargin=46,
        topMargin=46,
        bottomMargin=50,
    )

    # Theme Colors
    c_forest = colors.HexColor("#234E3C")
    c_terra = colors.HexColor("#C87A64")
    c_sage_bg = colors.HexColor("#F4F8F5")
    c_card_border = colors.HexColor("#D1E2D8")
    c_text_main = colors.HexColor("#1C2B38")
    c_text_muted = colors.HexColor("#64748B")
    c_accent_blue = colors.HexColor("#0284C7")

    styles = getSampleStyleSheet()

    # Custom Typography Styles using registered Unicode font
    title_style = ParagraphStyle(
        "DocTitle",
        fontName=FONT_BOLD,
        fontSize=20,
        leading=25,
        textColor=c_forest,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        fontName=FONT_REGULAR,
        fontSize=11,
        leading=15,
        textColor=c_text_muted,
        spaceAfter=14,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        fontName=FONT_BOLD,
        fontSize=13,
        leading=18,
        textColor=c_forest,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        "DocBody",
        fontName=FONT_REGULAR,
        fontSize=9.5,
        leading=14,
        textColor=c_text_main,
    )
    bullet_style = ParagraphStyle(
        "DocBullet",
        fontName=FONT_REGULAR,
        fontSize=9.5,
        leading=14,
        textColor=c_text_main,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3,
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    table_term = ParagraphStyle(
        "TableTerm",
        fontName=FONT_BOLD,
        fontSize=9,
        leading=12,
        textColor=c_forest,
    )
    table_def = ParagraphStyle(
        "TableDef",
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=12,
        textColor=c_text_main,
    )
    q_title_style = ParagraphStyle(
        "QTitle",
        fontName=FONT_BOLD,
        fontSize=9.5,
        leading=13,
        textColor=c_text_main,
        spaceAfter=2,
    )
    q_ans_style = ParagraphStyle(
        "QAns",
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13,
        textColor=c_forest,
        leftIndent=12,
        spaceAfter=6,
    )

    story: List[Any] = []

    # -----------------------------------------------------------------------
    # 1. Header Banner & Metadata Badges
    # -----------------------------------------------------------------------
    lang_labels = {
        "en": "English",
        "hi": "हिन्दी (Hindi)",
        "ta": "தமிழ் (Tamil)",
        "te": "తెలుగు (Telugu)",
        "kn": "ಕನ್ನಡ (Kannada)",
    }
    lang_display = lang_labels.get(lesson.language, lesson.language.upper())
    level_display = lesson.level.capitalize() if lesson.level else "Beginner"

    meta_html = (
        f"<b>Blu Visual Teacher</b> &nbsp;|&nbsp; <b>Level:</b> {level_display} &nbsp;|&nbsp; "
        f"<b>Language:</b> {lang_display} &nbsp;|&nbsp; <b>Duration:</b> ~{lesson.target_duration_seconds}s"
    )
    story.append(Paragraph(meta_html, subtitle_style))
    story.append(Paragraph(lesson.title, title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_forest, spaceBefore=4, spaceAfter=12))

    # -----------------------------------------------------------------------
    # 2. Executive Summary Callout Box
    # -----------------------------------------------------------------------
    summary_text = getattr(lesson, "summary", "") or (notes.summary if notes else "")
    if summary_text:
        summary_html = f"<b>Overview & Summary:</b><br/>{summary_text}"
        summary_p = Paragraph(summary_html, body_style)
        summary_table = Table([[summary_p]], colWidths=[520])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_sage_bg),
            ("BOX", (0, 0), (-1, -1), 1, c_card_border),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 12))

    # -----------------------------------------------------------------------
    # 3. Learning Objectives
    # -----------------------------------------------------------------------
    objectives = getattr(lesson, "learning_objectives", []) or (notes.learning_objectives if notes else [])
    if objectives:
        story.append(Paragraph("Target Learning Objectives", section_heading))
        for obj in objectives:
            story.append(Paragraph(f"• &nbsp; {obj}", bullet_style))
        story.append(Spacer(1, 8))

    # -----------------------------------------------------------------------
    # 4. Key Takeaways
    # -----------------------------------------------------------------------
    takeaways = getattr(lesson, "key_takeaways", []) or (notes.key_takeaways if notes else [])
    if takeaways:
        story.append(Paragraph("Key Takeaways", section_heading))
        for idx, item in enumerate(takeaways, start=1):
            story.append(Paragraph(f"<b>{idx}.</b> &nbsp; {item}", bullet_style))
        story.append(Spacer(1, 8))

    # -----------------------------------------------------------------------
    # 5. Key Concepts & Glossary
    # -----------------------------------------------------------------------
    glossary_items = getattr(lesson, "glossary", []) or []
    if not glossary_items and notes and hasattr(notes, "key_concepts"):
        glossary_items = [{"term": c.term, "definition": c.definition} for c in notes.key_concepts]

    if glossary_items:
        story.append(Paragraph("Key Concepts & Glossary", section_heading))
        table_rows = [
            [
                Paragraph("<b>Term</b>", table_term),
                Paragraph("<b>Definition / Practical Meaning</b>", table_term),
            ]
        ]
        for item in glossary_items:
            term = item.get("term", "") if isinstance(item, dict) else getattr(item, "term", "")
            definition = item.get("definition", "") if isinstance(item, dict) else getattr(item, "definition", "")
            table_rows.append([
                Paragraph(term, table_term),
                Paragraph(definition, table_def),
            ])

        gloss_table = Table(table_rows, colWidths=[140, 380])
        gloss_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBF5EF")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(gloss_table)
        story.append(Spacer(1, 10))

    # -----------------------------------------------------------------------
    # 6. Revision & Practice Questions
    # -----------------------------------------------------------------------
    questions = getattr(lesson, "revision_questions", []) or []
    if not questions and notes and hasattr(notes, "revision_questions"):
        questions = [{"question": q.question, "answer": q.answer} for q in notes.revision_questions]

    if questions:
        story.append(Paragraph("Revision & Practice Questions", section_heading))
        for idx, q_item in enumerate(questions, start=1):
            q_text = q_item.get("question", "") if isinstance(q_item, dict) else getattr(q_item, "question", "")
            ans_text = q_item.get("answer", "") if isinstance(q_item, dict) else getattr(q_item, "answer", "")

            q_flowables = [
                Paragraph(f"<b>Q{idx}:</b> {q_text}", q_title_style),
                Paragraph(f"<b>Answer:</b> {ans_text}", q_ans_style),
            ]
            story.append(KeepTogether(q_flowables))
            story.append(Spacer(1, 4))

    # -----------------------------------------------------------------------
    # 7. Scene Breakdown (Visual Walkthrough)
    # -----------------------------------------------------------------------
    scenes = getattr(lesson, "scenes", []) or []
    if scenes:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Visual Lesson Breakdown", section_heading))
        scene_rows = [
            [
                Paragraph("<b>#</b>", table_term),
                Paragraph("<b>Scene Type</b>", table_term),
                Paragraph("<b>Visual Content / Description</b>", table_term),
            ]
        ]
        for idx, sc in enumerate(scenes, start=1):
            sc_type = getattr(sc, "type", "scene").replace("_", " ").title()
            heading = getattr(sc, "heading", "")
            narration = getattr(sc, "narration", "")

            details = f"<b>{heading}</b><br/>{narration}"
            scene_rows.append([
                Paragraph(str(idx), table_term),
                Paragraph(sc_type, table_term),
                Paragraph(details, table_def),
            ])

        scene_table = Table(scene_rows, colWidths=[24, 116, 380])
        scene_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(KeepTogether([scene_table]))

    # Build the document with dynamic two-pass page numbers
    doc.build(story, canvasmaker=NumberedCanvas)
    return output_path
