"""

Offline Deterministic MP4 Video Exporter for Blu Visual Teacher.



Capabilities:

1. Locates local FFmpeg and FFprobe without requiring internet connectivity.

2. Concatenates scene audio WAVs using Python's built-in wave module with timeline padding.

3. Renders 1280x720 video frames using Pillow (PIL) matching Person 4's visual stage:

   - TitleCard scenes (badges, animated entrance, typography)

   - Diagram scenes (flowchart nodes, directional connections, active step highlight)

   - CodeWalkthrough scenes (IDE window, line numbering, token styling, active line focus)

   - Burned-in caption track synchronized with AudioManifest caption segments.

4. Streams raw RGB24 frames directly into FFmpeg stdin for fast, diskless H.264 / AAC encoding.

5. Generates companion SubRip (.srt) subtitle files.

6. Verifies exported video integrity, codecs, dimensions, and duration.

"""



import os
import re

import shutil

import struct

import subprocess

import wave

from pathlib import Path

from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont



from backend.app.schemas.provisional_lesson import LessonPlan, TitleCardScene, DiagramScene, CodeWalkthroughScene

from backend.app.schemas.audio_manifest import AudioManifest, SceneAudioEntry





def find_ffmpeg_binaries() -> Tuple[Optional[str], Optional[str]]:

    """Locates ffmpeg and ffprobe executables on the host machine."""

    candidates_ffmpeg = [

        r"C:\Users\Tanish\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe",

        r"C:\Program Files\KeyShot12\bin\ffmpeg.exe",

        shutil.which("ffmpeg") or "",

    ]

    candidates_ffprobe = [

        r"C:\Users\Tanish\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffprobe.exe",

        r"C:\Program Files\KeyShot12\bin\ffprobe.exe",

        shutil.which("ffprobe") or "",

    ]



    ffmpeg_path = next((p for p in candidates_ffmpeg if p and os.path.isfile(p)), None)

    ffprobe_path = next((p for p in candidates_ffprobe if p and os.path.isfile(p)), None)



    return ffmpeg_path, ffprobe_path





def format_srt_timestamp(seconds: float) -> str:

    """Formats seconds as SRT timestamp: HH:MM:SS,mmm."""

    hrs = int(seconds // 3600)

    mins = int((seconds % 3600) // 60)

    secs = int(seconds % 60)

    millis = int(round((seconds - int(seconds)) * 1000))

    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"





def generate_srt_file(manifest: AudioManifest, output_srt_path: Path) -> Path:

    """Generates a standard .srt subtitle file from the audio manifest."""

    lines: List[str] = []

    counter = 1



    for entry in manifest.entries:

        for seg in entry.caption_segments:

            g_start = seg.global_start_seconds if seg.global_start_seconds is not None else seg.start_seconds

            g_end = seg.global_end_seconds if seg.global_end_seconds is not None else seg.end_seconds



            lines.append(str(counter))

            lines.append(f"{format_srt_timestamp(g_start)} --> {format_srt_timestamp(g_end)}")

            lines.append(seg.text)

            lines.append("")

            counter += 1



    output_srt_path.parent.mkdir(parents=True, exist_ok=True)

    output_srt_path.write_text("\n".join(lines), encoding="utf-8")

    return output_srt_path





def build_concatenated_audio(

    manifest: AudioManifest,

    workspace_root: Path,

    output_wav_path: Path,

    padding_seconds: float = 0.3

) -> Path:

    """Concatenates scene WAV files with inter-scene silence into a single master audio track."""

    output_wav_path.parent.mkdir(parents=True, exist_ok=True)



    sample_rate = 22050

    channels = 1

    sample_width = 2



    # Determine master audio format from first existing audio file

    first_entry = manifest.entries[0] if manifest.entries else None

    first_wav = workspace_root / first_entry.audio_file if first_entry else None



    if first_wav and first_wav.is_file():

        with wave.open(str(first_wav), "rb") as wf:

            channels = wf.getnchannels()

            sample_width = wf.getsampwidth()

            sample_rate = wf.getframerate()



    silence_frames = int(sample_rate * padding_seconds)

    silence_bytes = b"\x00" * (silence_frames * channels * sample_width)



    with wave.open(str(output_wav_path), "wb") as master_wf:

        master_wf.setnchannels(channels)

        master_wf.setsampwidth(sample_width)

        master_wf.setframerate(sample_rate)



        for i, entry in enumerate(manifest.entries):

            wav_file = workspace_root / entry.audio_file

            if wav_file.is_file():

                with wave.open(str(wav_file), "rb") as wf:

                    frames = wf.readframes(wf.getnframes())

                    master_wf.writeframes(frames)

            else:

                # Generate synthetic silence if audio missing

                dummy_frames = int(sample_rate * entry.duration_seconds)

                master_wf.writeframes(b"\x00" * (dummy_frames * channels * sample_width))



            # Add padding between scenes (not after final scene)

            if i < len(manifest.entries) - 1 and padding_seconds > 0:

                master_wf.writeframes(silence_bytes)



    return output_wav_path





class FrameRenderer:

    """Renders 1280x720 RGB frames matching Person 4's deterministic styling."""



    def __init__(self, width: int = 1280, height: int = 720):

        self.width = width

        self.height = height



        # Palette tokens

        self.bg_color = (251, 249, 244)          # #FBF9F4 Warm editorial paper
        self.surface_color = (255, 255, 255)     # #FFFFFF Pure white card
        self.border_color = (232, 226, 213)      # #E8E2D5 Muted parchment border
        self.primary_blue = (35, 78, 60)         # #234E3C Forest green
        self.accent_green = (200, 122, 100)      # #C87A64 Terracotta
        self.text_white = (28, 43, 56)           # #1C2B38 Deep charcoal
        self.text_muted = (100, 116, 139)        # #64748B Slate gray
        self.code_bg = (35, 45, 60)              # #232D3C Slate dark for code



        # Load fonts safely with Indic Unicode font support (Nirmala.ttc on Windows)

        nirmala = "C:/Windows/Fonts/Nirmala.ttc"

        nirmala_b = "C:/Windows/Fonts/NirmalaB.ttc"

        has_nirmala = os.path.isfile(nirmala)



        try:

            if has_nirmala:

                title_font = nirmala_b if os.path.isfile(nirmala_b) else nirmala

                self.font_title = ImageFont.truetype(title_font, 40)

                self.font_heading = ImageFont.truetype(title_font, 30)

                self.font_body = ImageFont.truetype(nirmala, 22)
                self.font_small = ImageFont.truetype(nirmala, 16)

                self.font_caption = ImageFont.truetype(nirmala, 22)

                self.font_badge = ImageFont.truetype(title_font, 16)

            else:

                self.font_title = ImageFont.truetype("arial.ttf", 40)

                self.font_heading = ImageFont.truetype("arial.ttf", 30)

                self.font_body = ImageFont.truetype("arial.ttf", 22)
                self.font_small = ImageFont.truetype("arial.ttf", 16)

                self.font_caption = ImageFont.truetype("arial.ttf", 22)

                self.font_badge = ImageFont.truetype("arial.ttf", 16)

            self.font_code = ImageFont.truetype("consola.ttf", 20)

        except Exception:

            self.font_title = ImageFont.load_default()

            self.font_heading = ImageFont.load_default()

            self.font_body = ImageFont.load_default()
            self.font_small = ImageFont.load_default()

            self.font_code = ImageFont.load_default()

            self.font_caption = ImageFont.load_default()

            self.font_badge = ImageFont.load_default()



    def render_frame(

        self,

        scene,

        time_seconds: float,

        duration_seconds: float,

        caption_text: str = ""

    ) -> Image.Image:

        """Draws one 1280x720 video frame for a given scene and timestamp."""

        img = Image.new("RGB", (self.width, self.height), self.bg_color)

        draw = ImageDraw.Draw(img)



        progress = min(1.0, max(0.0, time_seconds / max(0.1, duration_seconds)))



        # 1. Render Scene Content

        if isinstance(scene, TitleCardScene) or getattr(scene, "type", "") == "title_card":

            self._draw_title_card(draw, scene, progress)

        elif isinstance(scene, DiagramScene) or getattr(scene, "type", "") == "diagram":

            self._draw_diagram(draw, scene, progress)

        elif isinstance(scene, CodeWalkthroughScene) or getattr(scene, "type", "") == "code_walkthrough":

            self._draw_code_walkthrough(draw, scene, progress)

        else:

            self._draw_fallback(draw, scene)



        # 2. Render Progress Bar (Thin subtle line above captions)

        bar_y = 615

        draw.line([(0, bar_y), (self.width, bar_y)], fill=(30, 41, 59), width=2)

        active_x = int(self.width * progress)

        if active_x > 0:

            draw.line([(0, bar_y), (active_x, bar_y)], fill=self.primary_blue, width=2)



        # 3. Render Burned-In Caption Track

        if caption_text and caption_text.strip():

            self._draw_caption_track(draw, caption_text.strip())



        return img



    def _draw_title_card(self, draw: ImageDraw.ImageDraw, scene: TitleCardScene, progress: float):

        # Header Badge

        badge_text = "LESSON OVERVIEW"

        draw.rounded_rectangle([520, 160, 760, 200], radius=8, fill=(23, 36, 59), outline=self.primary_blue, width=1)

        draw.text((640, 180), badge_text, fill=self.primary_blue, font=self.font_badge, anchor="mm")



        # Main Heading

        heading = getattr(scene, "heading", "Welcome")

        draw.text((640, 270), heading, fill=self.text_white, font=self.font_title, anchor="mm")



        # Subtitle

        subtitle = getattr(scene, "subtitle", "")

        if subtitle:

            draw.text((640, 340), subtitle, fill=self.text_muted, font=self.font_body, anchor="mm")



        # Key Points

        key_points = getattr(scene, "key_points", [])

        if key_points:

            start_y = 420

            card_width = 300

            total_cards = len(key_points)

            gap = 24

            total_width = total_cards * card_width + (total_cards - 1) * gap

            start_x = (self.width - total_width) // 2



            for idx, pt in enumerate(key_points):

                cx = start_x + idx * (card_width + gap)

                draw.rounded_rectangle([cx, start_y, cx + card_width, start_y + 90], radius=12, fill=self.surface_color, outline=self.border_color, width=1)

                draw.text((cx + 16, start_y + 20), f"Step {idx + 1}", fill=self.accent_green, font=self.font_badge)

                draw.text((cx + 16, start_y + 50), pt[:32], fill=self.text_white, font=self.font_body)



    def _draw_diagram(self, draw: ImageDraw.ImageDraw, scene: DiagramScene, progress: float):
        # Scene Header
        heading = getattr(scene, "heading", "Visual Diagram")
        draw.text((100, 70), heading, fill=self.text_white, font=self.font_heading)

        diag_type = getattr(scene, "diagram_type", "flowchart")
        if diag_type == "proportion_table" or getattr(scene, "proportion_table", None):
            self._draw_proportion_table_diagram(draw, scene, progress)
            return
        elif diag_type == "science_diagram" or getattr(scene, "science_diagram", None):
            self._draw_science_diagram(draw, scene, progress)
            return
        elif diag_type == "number_line" or getattr(scene, "number_line", None):
            self._draw_number_line_diagram(draw, scene, progress)
            return

        items = getattr(scene, "items", []) or []
        if not items and hasattr(scene, "nodes") and scene.nodes:
            items = [n.get("label", "") if isinstance(n, dict) else getattr(n, "label", str(n)) for n in scene.nodes]
        elif not items and hasattr(scene, "structured_nodes") and scene.structured_nodes:
            items = [n.get("label", "") if isinstance(n, dict) else getattr(n, "label", str(n)) for n in scene.structured_nodes]

        node_count = len(items)
        if node_count == 0:
            return

        active_idx = min(node_count - 1, int(progress * node_count))

        # Check if single row or multi-row layout is needed
        max_label_len = max([len(item) for item in items], default=0)
        use_multi_row = (node_count >= 5) or (node_count == 4 and max_label_len > 22)

        def _wrap_label_lines(text: str, max_chars: int = 18) -> list[str]:
            words = text.strip().split()
            lines = []
            curr = ""
            for w in words:
                if not curr:
                    curr = w
                elif len(curr) + 1 + len(w) <= max_chars:
                    curr += " " + w
                else:
                    lines.append(curr)
                    curr = w
            if curr:
                lines.append(curr)
            return lines[:3] or [text]

        if not use_multi_row:
            # Single horizontal row layout with guaranteed non-overlapping spacing
            total_width = 1100
            spacing = total_width / (node_count + 1)
            start_x = (self.width - total_width) // 2
            cy = 320
            node_width = max(160, min(230, int(spacing - 35)))
            node_height = 80

            # Draw arrows between adjacent nodes
            for i in range(node_count - 1):
                x1 = int(start_x + spacing * (i + 1) + node_width // 2)
                x2 = int(start_x + spacing * (i + 2) - node_width // 2)
                line_color = self.accent_green if i < active_idx else self.border_color
                if x2 > x1:
                    draw.line([(x1, cy), (x2, cy)], fill=line_color, width=3)
                    draw.polygon([(x2, cy), (x2 - 10, cy - 6), (x2 - 10, cy + 6)], fill=line_color)

            # Draw nodes
            for i, item in enumerate(items):
                cx = int(start_x + spacing * (i + 1))
                is_active = (i == active_idx)
                is_past = (i < active_idx)
                fill_c = (235, 243, 238) if is_active else self.surface_color
                stroke_c = self.primary_blue if is_active else (self.accent_green if is_past else self.border_color)
                w = 3 if is_active else 1

                left = cx - node_width // 2
                top = cy - node_height // 2
                draw.rounded_rectangle([left, top, left + node_width, top + node_height], radius=14, fill=fill_c, outline=stroke_c, width=w)

                # Indicator dot
                dot_color = self.primary_blue if is_active else (self.accent_green if is_past else self.text_muted)
                draw.ellipse([left + 14, cy - 6, left + 26, cy + 6], fill=dot_color)

                # Wrapped text lines
                wrapped_lines = _wrap_label_lines(item, max_chars=int(node_width // 10))
                font = self.font_small if len(wrapped_lines) > 1 else self.font_body
                line_h = 20 if font == self.font_small else 24
                total_text_h = len(wrapped_lines) * line_h
                start_text_y = cy - total_text_h // 2 + line_h // 2

                for line_idx, line_str in enumerate(wrapped_lines):
                    draw.text(
                        (left + 36, start_text_y + line_idx * line_h),
                        line_str,
                        fill=self.text_white if is_active else self.text_muted,
                        font=font,
                        anchor="lm"
                    )
        else:
            # 2-Row multi-flow layout with corridor routing preventing any overlapping
            row1_count = (node_count + 1) // 2
            row2_count = node_count - row1_count
            total_width = 1100
            start_x = (self.width - total_width) // 2
            spacing1 = total_width / (row1_count + 1)
            spacing2 = total_width / (row2_count + 1)
            cy1 = 220
            cy2 = 420
            corridor_y = 320
            node_width = max(150, min(220, int(min(spacing1, spacing2) - 35)))
            node_height = 80

            # Calculate positions
            positions = []
            for i in range(node_count):
                if i < row1_count:
                    cx = int(start_x + spacing1 * (i + 1))
                    cy = cy1
                    row = 0
                else:
                    col = i - row1_count
                    cx = int(start_x + spacing2 * (col + 1))
                    cy = cy2
                    row = 1
                positions.append((cx, cy, row))

            # Draw connecting lines and arrows
            for i in range(node_count - 1):
                from_x, from_y, from_row = positions[i]
                to_x, to_y, to_row = positions[i + 1]
                line_color = self.accent_green if i < active_idx else self.border_color

                if from_row == to_row:
                    x1 = from_x + node_width // 2
                    x2 = to_x - node_width // 2
                    if x2 > x1:
                        draw.line([(x1, from_y), (x2, from_y)], fill=line_color, width=3)
                        draw.polygon([(x2, from_y), (x2 - 10, from_y - 6), (x2 - 10, from_y + 6)], fill=line_color)
                else:
                    # Transition between Row 1 and Row 2 through empty corridor (corridor_y = 320)
                    start_pt = (from_x, from_y + node_height // 2)
                    mid_pt1 = (from_x, corridor_y)
                    mid_pt2 = (to_x, corridor_y)
                    end_pt = (to_x, to_y - node_height // 2)

                    draw.line([start_pt, mid_pt1], fill=line_color, width=3)
                    draw.line([mid_pt1, mid_pt2], fill=line_color, width=3)
                    draw.line([mid_pt2, end_pt], fill=line_color, width=3)
                    # Downward arrow head at end_pt
                    draw.polygon([(end_pt[0], end_pt[1]), (end_pt[0] - 6, end_pt[1] - 10), (end_pt[0] + 6, end_pt[1] - 10)], fill=line_color)

            # Draw nodes
            for i, item in enumerate(items):
                cx, cy, row = positions[i]
                is_active = (i == active_idx)
                is_past = (i < active_idx)
                fill_c = (235, 243, 238) if is_active else self.surface_color
                stroke_c = self.primary_blue if is_active else (self.accent_green if is_past else self.border_color)
                w = 3 if is_active else 1

                left = cx - node_width // 2
                top = cy - node_height // 2
                draw.rounded_rectangle([left, top, left + node_width, top + node_height], radius=14, fill=fill_c, outline=stroke_c, width=w)

                # Indicator dot
                dot_color = self.primary_blue if is_active else (self.accent_green if is_past else self.text_muted)
                draw.ellipse([left + 14, cy - 6, left + 26, cy + 6], fill=dot_color)

                # Wrapped text lines
                wrapped_lines = _wrap_label_lines(item, max_chars=int(node_width // 10))
                font = self.font_small if len(wrapped_lines) > 1 else self.font_body
                line_h = 20 if font == self.font_small else 24
                total_text_h = len(wrapped_lines) * line_h
                start_text_y = cy - total_text_h // 2 + line_h // 2

                for line_idx, line_str in enumerate(wrapped_lines):
                    draw.text(
                        (left + 36, start_text_y + line_idx * line_h),
                        line_str,
                        fill=self.text_white if is_active else self.text_muted,
                        font=font,
                        anchor="lm"
                    )




    def _draw_proportion_table_diagram(self, draw: ImageDraw.ImageDraw, scene, progress: float):
        pt = getattr(scene, "proportion_table", None)
        headers = ["Quantity A", "Quantity B"]
        rows = [[3, 4], [6, 8], [9, 12]]
        if pt:
            if hasattr(pt, "headers"):
                headers = pt.headers
            elif isinstance(pt, dict) and "headers" in pt:
                headers = pt["headers"]
            if hasattr(pt, "rows"):
                rows = [r.values if hasattr(r, "values") else r.get("values", []) for r in pt.rows]
            elif isinstance(pt, dict) and "rows" in pt:
                rows = [r.get("values", []) if isinstance(r, dict) else getattr(r, "values", []) for r in pt["rows"]]

        # Draw Table Container
        tx, ty, tw, th = 140, 160, 500, 360
        draw.rounded_rectangle([tx, ty, tx + tw, ty + th], radius=14, fill=self.surface_color, outline=self.border_color, width=1)

        # Table Headers
        col_w = tw // max(1, len(headers))
        for i, h in enumerate(headers):
            draw.text((tx + i * col_w + col_w // 2, ty + 30), str(h), fill=self.primary_blue, font=self.font_badge, anchor="mm")
        draw.line([(tx + 16, ty + 60), (tx + tw - 16, ty + 60)], fill=self.border_color, width=1)

        # Table Rows with progressive reveal
        visible_rows = max(1, int(progress * (len(rows) + 1)))
        for r_idx, row_vals in enumerate(rows[:visible_rows]):
            ry = ty + 95 + r_idx * 55
            for c_idx, val in enumerate(row_vals):
                val_str = f"{int(val)}" if float(val).is_integer() else f"{val:.1f}"
                draw.text((tx + c_idx * col_w + col_w // 2, ry), val_str, fill=self.text_white, font=self.font_body, anchor="mm")

        # Draw Fraction Comparison Bar
        fb_x, fb_y, fb_w, fb_h = 680, 200, 460, 280
        draw.rounded_rectangle([fb_x, fb_y, fb_x + fb_w, fb_y + fb_h], radius=14, fill=(15, 23, 42), outline=self.primary_blue, width=1)
        draw.text((fb_x + fb_w // 2, fb_y + 40), "PROPORTION EQUALITY", fill=self.accent_green, font=self.font_badge, anchor="mm")

        # Split bar
        bar_x1, bar_y1, bar_w, bar_h = fb_x + 40, fb_y + 90, fb_w - 80, 50
        part_a_w = int(bar_w * (3.0 / 7.0))
        draw.rectangle([bar_x1, bar_y1, bar_x1 + part_a_w, bar_y1 + bar_h], fill=self.primary_blue)
        draw.rectangle([bar_x1 + part_a_w, bar_y1, bar_x1 + bar_w, bar_y1 + bar_h], fill=self.accent_green)
        draw.text((bar_x1 + part_a_w // 2, bar_y1 + bar_h // 2), "3 / 7", fill=self.text_white, font=self.font_badge, anchor="mm")
        draw.text((bar_x1 + part_a_w + (bar_w - part_a_w) // 2, bar_y1 + bar_h // 2), "4 / 7", fill=(11, 15, 23), font=self.font_badge, anchor="mm")

        # Equation banner
        draw.text((fb_x + fb_w // 2, fb_y + 190), "3 : 4  =  6 : 8  =  9 : 12", fill=self.text_white, font=self.font_title, anchor="mm")
        draw.text((fb_x + fb_w // 2, fb_y + 240), "Constant Scaling Invariant", fill=self.text_muted, font=self.font_body, anchor="mm")

    def _draw_science_diagram(self, draw: ImageDraw.ImageDraw, scene, progress: float):
        sd = getattr(scene, "science_diagram", None)
        subject = getattr(sd, "subject", "Biological System") if sd else "Biological System"
        elements = getattr(sd, "elements", []) if sd else []

        draw.rounded_rectangle([140, 150, 1140, 530], radius=14, fill=self.surface_color, outline=self.border_color, width=1)
        draw.text((640, 185), f"System Architecture: {subject}", fill=self.primary_blue, font=self.font_badge, anchor="mm")

        if not elements:
            elements = [
                type("E", (), {"name": "Light Energy", "role": "Photons absorbed", "x": 25, "y": 45}),
                type("E", (), {"name": "Chloroplast", "role": "ATP/NADPH generator", "x": 50, "y": 45}),
                type("E", (), {"name": "Glucose", "role": "Chemical storage", "x": 75, "y": 45}),
            ]

        for el in elements:
            ename = getattr(el, "name", "Element") if hasattr(el, "name") else el.get("name", "Element")
            erole = getattr(el, "role", "") if hasattr(el, "role") else el.get("role", "")
            ex_pct = getattr(el, "x", 50) if hasattr(el, "x") else el.get("x", 50)
            ey_pct = getattr(el, "y", 50) if hasattr(el, "y") else el.get("y", 50)

            cx = int(140 + (1000 * (ex_pct / 100.0)))
            cy = int(150 + (380 * (ey_pct / 100.0)))
            nw, nh = 180, 70
            draw.rounded_rectangle([cx - nw // 2, cy - nh // 2, cx + nw // 2, cy + nh // 2], radius=10, fill=(23, 36, 59), outline=self.primary_blue, width=1)
            draw.text((cx, cy - 10), ename[:20], fill=self.text_white, font=self.font_badge, anchor="mm")
            if erole:
                draw.text((cx, cy + 14), erole[:24], fill=self.text_muted, font=self.font_badge, anchor="mm")

    def _draw_number_line_diagram(self, draw: ImageDraw.ImageDraw, scene, progress: float):
        nl = getattr(scene, "number_line", None)
        min_v = getattr(nl, "min_val", 0.0) if nl else 0.0
        max_v = getattr(nl, "max_val", 10.0) if nl else 10.0

        draw.rounded_rectangle([140, 160, 1140, 520], radius=14, fill=self.surface_color, outline=self.border_color, width=1)
        draw.text((640, 200), f"Geometric Number Line [{min_v} -> {max_v}]", fill=self.accent_green, font=self.font_badge, anchor="mm")

        ax_x1, ax_x2, ax_y = 220, 1060, 340
        draw.line([(ax_x1, ax_y), (ax_x2, ax_y)], fill=self.text_white, width=4)
        draw.polygon([(ax_x1, ax_y), (ax_x1 + 12, ax_y - 8), (ax_x1 + 12, ax_y + 8)], fill=self.text_white)
        draw.polygon([(ax_x2, ax_y), (ax_x2 - 12, ax_y - 8), (ax_x2 - 12, ax_y + 8)], fill=self.text_white)

        steps = 10
        span = ax_x2 - ax_x1 - 40
        for i in range(steps + 1):
            tx = ax_x1 + 20 + int(i * (span / steps))
            draw.line([(tx, ax_y - 10), (tx, ax_y + 10)], fill=self.border_color, width=2)
            draw.text((tx, ax_y + 24), str(i), fill=self.text_muted, font=self.font_badge, anchor="mm")

        start_x = ax_x1 + 20 + int(2 * (span / steps))
        end_x = ax_x1 + 20 + int(7 * (span / steps))
        arc_cx = (start_x + end_x) // 2
        draw.arc([start_x, ax_y - 80, end_x, ax_y + 20], start=180, end=0, fill=self.primary_blue, width=3)
        draw.text((arc_cx, ax_y - 95), "Interval Jump (+5)", fill=self.primary_blue, font=self.font_badge, anchor="mm")

    def _draw_code_walkthrough(self, draw: ImageDraw.ImageDraw, scene: CodeWalkthroughScene, progress: float):

        # Scene Header

        heading = getattr(scene, "heading", "Code Walkthrough")

        draw.text((100, 70), heading, fill=self.text_white, font=self.font_heading)



        # Code Container Window

        cx, cy, cw, ch = 120, 130, 1040, 440

        draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=14, fill=self.code_bg, outline=self.border_color, width=1)



        # Window Header

        draw.rounded_rectangle([cx, cy, cx + cw, cy + 40], radius=14, fill=(17, 24, 39))

        draw.rectangle([cx, cy + 26, cx + cw, cy + 40], fill=(17, 24, 39)) # flatten bottom border

        draw.ellipse([cx + 18, cy + 14, cx + 28, cy + 24], fill=(239, 68, 68))   # Red

        draw.ellipse([cx + 34, cy + 14, cx + 44, cy + 24], fill=(245, 158, 11))  # Yellow

        draw.ellipse([cx + 50, cy + 14, cx + 60, cy + 70], fill=(16, 185, 129)) # Green



        filename = getattr(scene, "filename", "main.py")

        draw.text((cx + cw // 2, cy + 20), filename, fill=self.text_muted, font=self.font_badge, anchor="mm")



        # Code Lines

        code = getattr(scene, "code", "")

        lines = code.splitlines() if code else []

        highlight_lines = getattr(scene, "highlight_lines", []) or []



        # Determine active highlighted line

        active_hl_line = None

        if highlight_lines:

            hl_idx = min(len(highlight_lines) - 1, int(progress * len(highlight_lines)))

            active_hl_line = highlight_lines[hl_idx]



        line_y = cy + 60

        line_height = 36



        for idx, line_text in enumerate(lines[:9]):

            line_num = idx + 1

            is_active = (line_num == active_hl_line)

            is_highlighted = (line_num in highlight_lines)



            # Active line background box

            if is_active:

                draw.rectangle([cx + 2, line_y - 4, cx + cw - 2, line_y + line_height - 6], fill=(23, 37, 84))

            elif is_highlighted:

                draw.rectangle([cx + 2, line_y - 4, cx + cw - 2, line_y + line_height - 6], fill=(15, 29, 64))



            # Line number

            num_color = self.primary_blue if is_active else self.text_muted

            draw.text((cx + 24, line_y), str(line_num).rjust(2), fill=num_color, font=self.font_code)



            # Code text

            text_color = self.text_white if is_active else (226, 232, 240)

            draw.text((cx + 70, line_y), line_text, fill=text_color, font=self.font_code)



            line_y += line_height



    def _draw_fallback(self, draw: ImageDraw.ImageDraw, scene):

        draw.text((self.width // 2, self.height // 2), getattr(scene, "heading", "Lesson Scene"), fill=self.text_white, font=self.font_title, anchor="mm")



    def _draw_caption_track(self, draw: ImageDraw.ImageDraw, text: str):

        # Centered pill box at the bottom

        bbox = draw.textbbox((0, 0), text, font=self.font_caption)

        text_w = bbox[2] - bbox[0]

        box_w = min(1100, max(400, text_w + 60))

        box_h = 56

        bx = (self.width - box_w) // 2

        by = 635



        draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=12, fill=(255, 255, 255), outline=(232, 226, 213), width=1)

        draw.text((self.width // 2, by + box_h // 2), text, fill=self.text_white, font=self.font_caption, anchor="mm")





def export_mp4_video(

    lesson_plan: LessonPlan,

    manifest: AudioManifest,

    workspace_root: Path,

    output_mp4_path: Path,

    fps: int = 25,

    use_remotion: bool = True,

) -> Path:

    """Exports a genuine 1280x720 H.264 / AAC MP4 video with burned-in captions."""

    ffmpeg_path, ffprobe_path = find_ffmpeg_binaries()

    if not ffmpeg_path:

        raise RuntimeError("FFmpeg executable not found on host machine.")



    output_mp4_path.parent.mkdir(parents=True, exist_ok=True)

    master_wav_path = output_mp4_path.parent / "temp_master_audio.wav"



    # 1. Build concatenated audio track with padding

    build_concatenated_audio(manifest, workspace_root, master_wav_path, padding_seconds=0.3)



    # 2. Attempt Remotion React-based Video Export if enabled

    if use_remotion:

        remotion_script = workspace_root / "frontend" / "scripts" / "render_remotion.mjs"

        node_bin = shutil.which("node")

        if remotion_script.is_file() and node_bin:

            props_path = output_mp4_path.parent / f"{output_mp4_path.stem}_remotion_props.json"

            try:

                import json

                props_payload = {

                    "lessonPlan": lesson_plan.model_dump(),

                    "audioManifest": manifest.model_dump(),

                }

                props_path.write_text(json.dumps(props_payload, indent=2), encoding="utf-8")



                cmd_remotion = [

                    node_bin,

                    "scripts/render_remotion.mjs",

                    "--props", str(props_path),

                    "--out", str(output_mp4_path),

                    "--audio", str(master_wav_path),

                ]

                print("[Video Exporter] Launching Remotion rendering engine...")

                res = subprocess.run(

                    cmd_remotion,

                    cwd=str(workspace_root / "frontend"),

                    capture_output=True,

                    text=True,

                    timeout=300,

                )

                if res.returncode == 0 and output_mp4_path.is_file() and output_mp4_path.stat().st_size > 0:

                    print(f"[Video Exporter] Remotion export succeeded: {output_mp4_path} ({output_mp4_path.stat().st_size} bytes)")

                    try:

                        if props_path.exists():

                            props_path.unlink()

                        if master_wav_path.exists():

                            master_wav_path.unlink()

                    except Exception:

                        pass

                    return output_mp4_path

                else:

                    print(f"[Video Exporter] Remotion render exited with code {res.returncode}. Stderr: {res.stderr[:300]}. Falling back to Pillow.")

            except Exception as rem_err:

                print(f"[Video Exporter] Remotion renderer encountered error: {rem_err}. Falling back to Pillow.")



    # 3. Launch FFmpeg process with rawvideo input (Pillow fallback)

    cmd = [

        ffmpeg_path,

        "-y",

        "-loglevel", "error",

        "-f", "rawvideo",

        "-vcodec", "rawvideo",

        "-s", "1280x720",

        "-pix_fmt", "rgb24",

        "-r", str(fps),

        "-i", "-",                     # Pipe raw frames through stdin

        "-i", str(master_wav_path),     # Synchronized master audio

        "-c:v", "libx264",

        "-preset", "veryfast",

        "-crf", "23",

        "-pix_fmt", "yuv420p",

        "-c:a", "aac",

        "-b:a", "192k",

        "-shortest",

        str(output_mp4_path)

    ]



    renderer = FrameRenderer(1280, 720)

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)



    try:

        padding = 0.3

        for i, entry in enumerate(manifest.entries):

            # Locate matching scene

            scene = next((s for s in lesson_plan.scenes if s.id == entry.scene_id), None)

            if not scene and i < len(lesson_plan.scenes):

                scene = lesson_plan.scenes[i]



            scene_duration = entry.duration_seconds + (padding if i < len(manifest.entries) - 1 else 0.0)

            total_frames = int(round(scene_duration * fps))



            for frame_idx in range(total_frames):

                time_in_scene = frame_idx / fps



                # Find active caption segment

                active_caption = ""

                for seg in entry.caption_segments:

                    if seg.start_seconds <= time_in_scene < seg.end_seconds:

                        active_caption = seg.text

                        break



                img = renderer.render_frame(

                    scene=scene,

                    time_seconds=time_in_scene,

                    duration_seconds=scene_duration,

                    caption_text=active_caption

                )



                proc.stdin.write(img.tobytes())



        proc.stdin.close()

        proc.wait(timeout=120)



    except Exception as e:

        proc.kill()

        raise RuntimeError(f"Error during video rendering: {e}")

    finally:

        if master_wav_path.exists():

            try:

                master_wav_path.unlink()

            except Exception:

                pass



    if not output_mp4_path.is_file() or output_mp4_path.stat().st_size == 0:

        stderr_output = proc.stderr.read().decode("utf-8", errors="ignore") if proc.stderr else ""

        raise RuntimeError(f"FFmpeg failed to create valid MP4. Stderr:\n{stderr_output}")



    return output_mp4_path





def verify_video_file(video_path: Path) -> Dict[str, any]:

    """Inspects video file with FFprobe or FFmpeg to verify codecs and duration."""

    ffmpeg_path, ffprobe_path = find_ffmpeg_binaries()

    bin_path = ffprobe_path or ffmpeg_path



    if not bin_path or not video_path.is_file():

        return {"valid": False, "error": "Binary or video file not found"}



    cmd = [bin_path, "-i", str(video_path)]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")

    info = result.stderr + result.stdout



    has_h264 = "h264" in info.lower()

    has_aac = "aac" in info.lower()

    has_720p = "1280x720" in info

    duration = 0.0
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", info)
    if match:
        h, m, s = match.groups()
        duration = round(int(h) * 3600 + int(m) * 60 + float(s), 3)

    return {
        "valid": has_h264 and has_720p,
        "path": str(video_path),
        "size_bytes": video_path.stat().st_size,
        "is_h264": has_h264,
        "is_aac": has_aac,
        "is_1280x720": has_720p,
        "duration": duration,
        "raw_info_snippet": info[:600]
    }
