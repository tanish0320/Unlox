/**
 * Pure deterministic animation and layout helpers for Blu Visual Teacher.
 * Every visual frame is a pure mathematical function of (timeSeconds, durationSeconds).
 * Zero wall-clock dependence, zero setInterval/setTimeout, zero Math.random.
 */

export interface Point {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function normalizedProgress(
  timeSeconds: number,
  durationSeconds: number
): number {
  if (
    !Number.isFinite(timeSeconds) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return 0;
  }
  return clamp01(timeSeconds / durationSeconds);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp01(t);
}

export function easeInOutQuad(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInQuad(t: number): number {
  const c = clamp01(t);
  return c * c;
}

export function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Returns a 0-1 progress within a normalized time segment [start, end].
 */
export function segmentProgress(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}

/**
 * Computes individual 0-1 progress for items in a sequence.
 * Supports smooth overlapping entrances.
 */
export function staggeredProgress(
  overallProgress: number,
  index: number,
  totalCount: number,
  overlap: number = 0.2
): number {
  if (totalCount <= 0) return 1;
  if (totalCount === 1) return overallProgress;

  const effectiveSpan = (1 - overlap) / totalCount;
  const itemStart = index * effectiveSpan;
  const itemEnd = Math.min(1, itemStart + effectiveSpan + overlap);

  return segmentProgress(overallProgress, itemStart, itemEnd);
}

/**
 * Returns the currently active index (0 to totalCount - 1) based on overall progress.
 */
export function activeStepIndex(progress: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const index = Math.floor(clamp01(progress) * totalCount);
  return Math.min(index, totalCount - 1);
}

/**
 * Determines which line from highlightLines is active at progress.
 */
export function codeLineProgression(
  progress: number,
  highlightLines: number[]
): { activeLine: number | null; activeIndex: number } {
  if (!highlightLines || highlightLines.length === 0) {
    return { activeLine: null, activeIndex: -1 };
  }
  const idx = activeStepIndex(progress, highlightLines.length);
  return {
    activeLine: highlightLines[idx],
    activeIndex: idx,
  };
}

/**
 * Deterministic pulse oscillation in range [0, 1].
 */
export function deterministicPulse(progress: number, frequency: number = 2): number {
  return (Math.sin(progress * frequency * Math.PI * 2 - Math.PI / 2) + 1) / 2;
}

/**
 * Evaluate a quadratic Bezier curve at t.
 */
export function pointOnQuadBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * p0.x + 2 * u * t * p1.x + tt * p2.x,
    y: uu * p0.y + 2 * u * t * p1.y + tt * p2.y,
  };
}
