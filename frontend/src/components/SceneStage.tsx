import type { ComponentType, ReactNode } from 'react'
import type { Scene } from '../api/types'
import { ScenePlaceholder } from './placeholders/ScenePlaceholder'
import { SceneRenderer } from './scenes/SceneRenderer'

export interface SceneRendererProps {
  scene: Scene
  timeSeconds: number
  durationSeconds: number
}

export interface CaptionTrackProps {
  text: string
  visible: boolean
}

export interface NotesPreviewProps {
  notes: string
}

interface OptionalNotesPreviewProps extends NotesPreviewProps {
  children?: ReactNode
}

interface ScenePluginModule {
  SceneRenderer?: ComponentType<SceneRendererProps>
  CaptionTrack?: ComponentType<CaptionTrackProps>
  NotesPreview?: ComponentType<NotesPreviewProps>
}

const scenePlugins = import.meta.glob<ScenePluginModule>('./scenes/index.ts', {
  eager: true,
})
const scenePlugin: ScenePluginModule | undefined = Object.values(scenePlugins)[0] as ScenePluginModule | undefined

export function SceneStage({
  scene,
  timeSeconds,
  durationSeconds,
}: SceneRendererProps) {
  const Renderer = scenePlugin?.SceneRenderer ?? SceneRenderer
  const knownTypes = ['title_card', 'code_walkthrough', 'diagram']
  if (!Renderer || !knownTypes.includes(scene.type)) {
    return (
      <ScenePlaceholder
        scene={scene}
        timeSeconds={timeSeconds}
        durationSeconds={durationSeconds}
      />
    )
  }
  return (
    <Renderer
      scene={scene as any}
      timeSeconds={timeSeconds}
      durationSeconds={durationSeconds}
    />
  )
}

export function OptionalCaptionTrack({
  text,
  visible,
}: CaptionTrackProps) {
  const CaptionTrack = scenePlugin?.CaptionTrack
  if (CaptionTrack) {
    return <CaptionTrack text={text} visible={visible} />
  }
  if (!visible) return <span className="captions-hidden">Captions are off.</span>
  return <>{text}</>
}

export function OptionalNotesPreview({
  notes,
  children,
}: OptionalNotesPreviewProps) {
  const NotesPreview = scenePlugin?.NotesPreview
  if (!NotesPreview) return <>{children}</>
  return (
    <details className="optional-notes">
      <summary>Lesson notes</summary>
      <NotesPreview notes={notes} />
    </details>
  )
}
