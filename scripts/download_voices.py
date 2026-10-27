"""
Offline Voice Model Setup Utility for Blu Visual Teacher.

Downloads and installs high-quality offline neural voices for:
- Hindi (hi_IN): hi_IN-pratham-medium.onnx
- Telugu (te_IN): te_IN-padmavathi-medium.onnx
- English (Kokoro): kokoro-v1.0.onnx + voices-v1.0.bin

Usage:
    python scripts/download_voices.py [--all] [--language hi|te|kokoro]
"""

import argparse
import os
from pathlib import Path
import urllib.request
import sys

VOICE_CATALOG = {
    "hi": {
        "name": "Hindi (Pratham)",
        "folder": "hi_IN",
        "files": [
            ("https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx", "hi_IN-pratham-medium.onnx"),
            ("https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx.json", "hi_IN-pratham-medium.onnx.json"),
        ]
    },
    "te": {
        "name": "Telugu (Padmavathi)",
        "folder": "te_IN",
        "files": [
            ("https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/padmavathi/medium/te_IN-padmavathi-medium.onnx", "te_IN-padmavathi-medium.onnx"),
            ("https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/padmavathi/medium/te_IN-padmavathi-medium.onnx.json", "te_IN-padmavathi-medium.onnx.json"),
        ]
    },
    "kokoro": {
        "name": "Kokoro-82M English Multi-Voice",
        "folder": "kokoro",
        "files": [
            ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx", "kokoro-v1.0.onnx"),
            ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin", "voices-v1.0.bin"),
        ]
    }
}

BASE_DIR = Path(__file__).resolve().parent.parent / "backend" / "app" / "services" / "tts" / "voices"


def download_voice(key: str):
    if key not in VOICE_CATALOG:
        print(f"Unknown voice target: {key}. Available: {list(VOICE_CATALOG.keys())}")
        return

    meta = VOICE_CATALOG[key]
    target_dir = BASE_DIR / meta["folder"]
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"==> Installing {meta['name']} into {target_dir}...")

    for url, filename in meta["files"]:
        dest = target_dir / filename
        if not dest.is_file():
            print(f"  Downloading {filename} from {url}...")
            try:
                # Use a custom user agent to prevent 403 on GitHub / HuggingFace
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
                    total_size = int(resp.headers.get("Content-Length", 0))
                    downloaded = 0
                    while True:
                        chunk = resp.read(64 * 1024)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            sys.stdout.write(f"\r    [{percent:.1f}%] {downloaded // 1024 // 1024}MB / {total_size // 1024 // 1024}MB")
                            sys.stdout.flush()
                print(f"\n  Saved {filename} ({dest.stat().st_size // 1024 // 1024} MB)")
            except Exception as e:
                print(f"\n  Failed to download {filename}: {e}")
                if dest.exists():
                    dest.unlink()
        else:
            print(f"  {filename} already installed ({dest.stat().st_size // 1024 // 1024} MB).")

    print(f"==> {meta['name']} is ready!\n")


def main():
    parser = argparse.ArgumentParser(description="Download voice models for Blu Visual Teacher")
    parser.add_argument("--language", "-l", choices=["hi", "te", "kokoro"], help="Voice target to download")
    parser.add_argument("--all", action="store_true", help="Download all available voices")
    args = parser.parse_args()

    if args.language:
        download_voice(args.language)
    elif args.all:
        for k in VOICE_CATALOG:
            download_voice(k)
    else:
        # Default download hi and te
        download_voice("hi")
        download_voice("te")


if __name__ == "__main__":
    main()
