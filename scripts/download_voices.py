"""
Offline Voice Model Setup Utility for Blu Visual Teacher.

Downloads and installs high-quality offline Piper ONNX neural voices for:
- Hindi (hi_IN): hi_IN-pratham-medium.onnx
- Telugu (te_IN): te_IN-padmavathi-medium.onnx
- Tamil (ta_IN): ta_IN-tamil_male-medium.onnx
- Kannada (kn_IN): kn_IN-kannada_female-medium.onnx

Usage:
    python scripts/download_voices.py [--all] [--language hi|te|ta|kn]
"""

import argparse
import os
from pathlib import Path
import urllib.request

VOICE_CATALOG = {
    "hi": {
        "name": "Hindi (Pratham)",
        "folder": "hi_IN",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx.json",
        "onnx_filename": "hi_IN-pratham-medium.onnx",
        "json_filename": "hi_IN-pratham-medium.onnx.json",
    },
    "te": {
        "name": "Telugu (Padmavathi)",
        "folder": "te_IN",
        "onnx_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/padmavathi/medium/te_IN-padmavathi-medium.onnx",
        "json_url": "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/padmavathi/medium/te_IN-padmavathi-medium.onnx.json",
        "onnx_filename": "te_IN-padmavathi-medium.onnx",
        "json_filename": "te_IN-padmavathi-medium.onnx.json",
    },
}

BASE_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "services" / "tts" / "voices"


def download_voice(lang: str):
    if lang not in VOICE_CATALOG:
        print(f"Unknown language: {lang}. Available: {list(VOICE_CATALOG.keys())}")
        return

    meta = VOICE_CATALOG[lang]
    target_dir = BASE_DIR / meta["folder"]
    target_dir.mkdir(parents=True, exist_ok=True)

    onnx_dest = target_dir / meta["onnx_filename"]
    json_dest = target_dir / meta["json_filename"]

    print(f"==> Installing {meta['name']} into {target_dir}...")

    if not onnx_dest.is_file():
        print(f"  Downloading {meta['onnx_filename']}...")
        urllib.request.urlretrieve(meta["onnx_url"], onnx_dest)
        print(f"  Saved ({onnx_dest.stat().st_size // 1024 // 1024} MB)")
    else:
        print(f"  {meta['onnx_filename']} already installed.")

    if not json_dest.is_file():
        print(f"  Downloading {meta['json_filename']}...")
        urllib.request.urlretrieve(meta["json_url"], json_dest)
        print(f"  Saved ({json_dest.stat().st_size} bytes)")
    else:
        print(f"  {meta['json_filename']} already installed.")

    print(f"==> {meta['name']} voice is ready for 100% offline synthesis!\n")


def main():
    parser = argparse.ArgumentParser(description="Download Piper ONNX voices for Blu Visual Teacher")
    parser.add_argument("--language", "-l", choices=["hi", "te"], help="Language code to download")
    parser.add_argument("--all", action="store_true", help="Download all available voices")
    args = parser.parse_args()

    if args.language:
        download_voice(args.language)
    else:
        for lang in VOICE_CATALOG:
            download_voice(lang)


if __name__ == "__main__":
    main()
