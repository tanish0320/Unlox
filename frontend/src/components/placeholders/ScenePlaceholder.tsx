import type { Scene } from '../../api/types'

interface ScenePlaceholderProps {
  scene: Scene
  timeSeconds: number
  durationSeconds: number
}

function sceneTypeLabel(type: string) {
  switch (type) {
    case 'title_card':
      return 'Title card'
    case 'code_walkthrough':
      return 'Code walkthrough'
    case 'diagram':
      return 'Diagram'
    default:
      return 'Lesson scene'
  }
}

export function ScenePlaceholder({
  scene,
  timeSeconds,
  durationSeconds,
}: ScenePlaceholderProps) {
  const progress =
    durationSeconds > 0
      ? Math.min(100, Math.max(0, (timeSeconds / durationSeconds) * 100))
      : 0

  return (
    <article className="scene-placeholder">
      <span className="scene-type-label">{sceneTypeLabel(scene.type)}</span>
      <h2>{scene.heading}</h2>
      <div
        className="scene-time-track"
        role="progressbar"
        aria-label="Scene time"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={Math.min(timeSeconds, durationSeconds)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}
