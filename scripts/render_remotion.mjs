/**
 * Deterministic Remotion MP4 Video Renderer for Blu Visual Teacher
 * Renders 1280x720 motion graphics educational video using React & Chromium.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");

// Parse arguments
const args = process.argv.slice(2);
let propsPath = null;
let outputPath = null;
let audioPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--props" && i + 1 < args.length) {
    propsPath = path.resolve(args[++i]);
  } else if (args[i] === "--out" && i + 1 < args.length) {
    outputPath = path.resolve(args[++i]);
  } else if (args[i] === "--audio" && i + 1 < args.length) {
    audioPath = path.resolve(args[++i]);
  }
}

if (!propsPath || !outputPath) {
  console.error("Usage: node scripts/render_remotion.mjs --props <props.json> --out <output.mp4> [--audio <audio.wav>]");
  process.exit(1);
}

async function main() {
  const startTime = Date.now();
  console.log(`[Remotion Engine] Loading lesson props from: ${propsPath}`);
  const propsRaw = fs.readFileSync(propsPath, "utf-8");
  const props = JSON.parse(propsRaw);

  const lessonPlan = props.lessonPlan;
  const audioManifest = props.audioManifest;

  const fps = 25;
  const paddingPerScene = 0.3;
  let totalDurationSec = 0;

  if (audioManifest && Array.isArray(audioManifest.entries) && audioManifest.entries.length > 0) {
    for (let i = 0; i < audioManifest.entries.length; i++) {
      const entry = audioManifest.entries[i];
      const dur = (entry.duration_seconds || 5.0) + (i < audioManifest.entries.length - 1 ? paddingPerScene : 0.0);
      totalDurationSec += dur;
    }
  } else {
    totalDurationSec = (lessonPlan.scenes?.length || 3) * 6.0;
  }

  const durationInFrames = Math.max(fps * 2, Math.round(totalDurationSec * fps));
  console.log(`[Remotion Engine] Target: 1280x720 @ ${fps}fps | Duration: ${totalDurationSec.toFixed(2)}s (${durationInFrames} frames)`);

  const entryPoint = path.resolve(FRONTEND_DIR, "src", "remotion", "index.ts");
  console.log(`[Remotion Engine] Bundling Remotion composition from: ${entryPoint}...`);

  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log(`[Remotion Engine] Bundle ready at: ${bundleLocation}`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "LessonVideo",
    inputProps: props,
  });

  const tempVideoOnly = outputPath.replace(/\.mp4$/i, "_temp_raw.mp4");
  const targetRenderOut = audioPath ? tempVideoOnly : outputPath;

  console.log(`[Remotion Engine] Rendering frames to ${targetRenderOut}...`);

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
      fps,
      width: 1280,
      height: 720,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: targetRenderOut,
    inputProps: props,
    chromiumOptions: {
      headless: true,
    },
    onProgress: ({ renderedFrames, encodedFrames, progress }) => {
      const pct = (progress * 100).toFixed(1);
      process.stdout.write(`\r[Remotion Engine] Render: ${pct}% (${encodedFrames}/${durationInFrames} frames)`);
    },
  });

  console.log("\n[Remotion Engine] Video frames rendered successfully.");

  // If audio track is provided, mux with FFmpeg for clean, synchronized MP4
  if (audioPath && fs.existsSync(audioPath)) {
    console.log(`[Remotion Engine] Multiplexing audio track: ${audioPath}`);
    const ffmpegCandidates = [
      "C:\\Users\\Tanish\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe",
      "C:\\Program Files\\KeyShot12\\bin\\ffmpeg.exe",
      "ffmpeg",
    ];
    let ffmpegBin = ffmpegCandidates.find((c) => fs.existsSync(c)) || "ffmpeg";

    const muxArgs = [
      "-y",
      "-i", targetRenderOut,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outputPath,
    ];

    const muxRes = spawnSync(ffmpegBin, muxArgs, { stdio: "inherit" });
    if (muxRes.status !== 0) {
      console.warn("[Remotion Engine] FFmpeg audio muxing exited with code", muxRes.status);
    } else {
      console.log(`[Remotion Engine] Clean master MP4 generated: ${outputPath}`);
      try {
        fs.unlinkSync(tempVideoOnly);
      } catch (e) {}
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Remotion Engine] Export completed in ${elapsed}s: ${outputPath}`);
}

main().catch((err) => {
  console.error("[Remotion Engine] Fatal render error:", err);
  process.exit(1);
});
