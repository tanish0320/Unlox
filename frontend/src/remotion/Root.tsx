import React from "react";
import { Composition } from "remotion";
import { LessonComposition, LessonCompositionProps } from "./LessonComposition";
import { sampleLesson } from "../fixtures/sampleLesson";
import { sampleCaptions } from "../fixtures/sampleCaptions";
import { AudioManifest } from "../components/scenes/sceneTypes";

const defaultManifest: AudioManifest = {
  lesson_id: "sample_en",
  total_duration_seconds: 18.0,
  entries: [
    {
      scene_id: "scene-1",
      audio_file: "outputs/generated/sample_en/audio/scene_01_en.wav",
      duration_seconds: 5.5,
      language: "en",
      voice_id: "af_heart",
      caption_segments: [
        {
          start_seconds: 0.0,
          end_seconds: 5.5,
          global_start_seconds: 0.0,
          global_end_seconds: 5.5,
          text: sampleLesson.scenes[0].narration,
        },
      ],
    },
    {
      scene_id: "scene-2",
      audio_file: "outputs/generated/sample_en/audio/scene_02_en.wav",
      duration_seconds: 6.0,
      language: "en",
      voice_id: "af_heart",
      caption_segments: [
        {
          start_seconds: 0.0,
          end_seconds: 6.0,
          global_start_seconds: 5.8,
          global_end_seconds: 11.8,
          text: sampleLesson.scenes[1].narration,
        },
      ],
    },
    {
      scene_id: "scene-3",
      audio_file: "outputs/generated/sample_en/audio/scene_03_en.wav",
      duration_seconds: 6.5,
      language: "en",
      voice_id: "af_heart",
      caption_segments: [
        {
          start_seconds: 0.0,
          end_seconds: 6.5,
          global_start_seconds: 12.1,
          global_end_seconds: 18.6,
          text: sampleLesson.scenes[2].narration,
        },
      ],
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LessonVideo"
        component={LessonComposition as any}
        durationInFrames={475} // ~19s at 25fps
        fps={25}
        width={1280}
        height={720}
        defaultProps={{
          lessonPlan: sampleLesson,
          audioManifest: defaultManifest,
        }}
      />
    </>
  );
};
