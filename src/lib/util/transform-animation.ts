import type { Matrix } from "transformation-matrix"

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

const interpolateTransform = (
  start: Matrix,
  end: Matrix,
  progress: number,
): Matrix => ({
  a: start.a + (end.a - start.a) * progress,
  b: start.b + (end.b - start.b) * progress,
  c: start.c + (end.c - start.c) * progress,
  d: start.d + (end.d - start.d) * progress,
  e: start.e + (end.e - start.e) * progress,
  f: start.f + (end.f - start.f) * progress,
})

export const cancelTransformAnimation = (animationFrameId: number | null) => {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId)
  }
}

export const animateTransform = ({
  startTransform,
  endTransform,
  durationMs,
  onUpdate,
  setAnimationFrameId,
  onComplete,
}: {
  startTransform: Matrix
  endTransform: Matrix
  durationMs: number
  onUpdate: (transform: Matrix) => void
  setAnimationFrameId: (animationFrameId: number | null) => void
  onComplete?: () => void
}): number => {
  const startTime = performance.now()

  const tick = (timestamp: number): void => {
    const elapsed = timestamp - startTime
    const rawProgress = Math.min(1, elapsed / durationMs)
    const easedProgress = easeOutCubic(rawProgress)

    onUpdate(interpolateTransform(startTransform, endTransform, easedProgress))

    if (rawProgress < 1) {
      setAnimationFrameId(window.requestAnimationFrame(tick))
      return
    }

    setAnimationFrameId(null)
    onComplete?.()
  }

  const animationFrameId = window.requestAnimationFrame(tick)
  setAnimationFrameId(animationFrameId)
  return animationFrameId
}
