import type { Matrix } from "transformation-matrix"

// Enough spare pixels for ordinary drags without allocating board-sized textures.
export const PAN_RENDER_MARGIN = 192

export interface PanRenderSnapshot {
  transform: Matrix
  scene: object
}

/** Reuse pixels only when the entire viewport remains inside the cached image. */
export const getCachedPanOffset = (
  snapshot: PanRenderSnapshot | null,
  transform: Matrix | undefined,
  scene: object,
): { x: number; y: number } | null => {
  if (!snapshot || !transform || snapshot.scene !== scene) return null
  const previous = snapshot.transform
  if (
    previous.a !== transform.a ||
    previous.b !== transform.b ||
    previous.c !== transform.c ||
    previous.d !== transform.d
  )
    return null

  const x = transform.e - previous.e
  const y = transform.f - previous.f
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > PAN_RENDER_MARGIN ||
    Math.abs(y) > PAN_RENDER_MARGIN
  )
    return null
  return { x, y }
}

export const getBufferedRenderTransform = (transform: Matrix): Matrix => ({
  ...transform,
  e: transform.e + PAN_RENDER_MARGIN,
  f: transform.f + PAN_RENDER_MARGIN,
})
