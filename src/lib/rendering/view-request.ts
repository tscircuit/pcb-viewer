import { applyToPoint, inverse, type Matrix } from "transformation-matrix"
import type { LayerRenderRequest, ViewBox } from "./types"

export function getViewBox(
  transform: Matrix,
  width: number,
  height: number,
): ViewBox {
  const inv = inverse(transform)
  const points = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => applyToPoint(inv, { x, y }))
  const x = Math.min(...points.map((p) => p.x))
  const y = Math.min(...points.map((p) => p.y))
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  }
}

/** Quantized zoom and overscanned, snapped regions allow reuse across small pans. */
export function createViewRequest(
  transform: Matrix,
  width: number,
  height: number,
  pixelRatio: number,
): Omit<LayerRenderRequest, "layer"> {
  const view = getViewBox(transform, width, height)
  const scale = Math.hypot(transform.a, transform.b)
  const zoom = Math.min(
    2 ** (Math.ceil(Math.log2(scale) * 2) / 2) * pixelRatio,
    4096 / (Math.max(view.width, view.height) * 2),
  )
  const step = 128 / zoom
  const x = Math.floor((view.x - view.width * 0.2) / step) * step
  const y = Math.floor((view.y - view.height * 0.2) / step) * step
  const right = Math.ceil((view.x + view.width * 1.2) / step) * step
  const top = Math.ceil((view.y + view.height * 1.2) / step) * step
  const imageWidth = Math.max(1, Math.round((right - x) * zoom))
  const imageHeight = Math.max(1, Math.round((top - y) * zoom))
  return {
    viewBox: { x, y, width: imageWidth / zoom, height: imageHeight / zoom },
    transform: { a: zoom, b: 0, c: 0, d: -zoom, e: -x * zoom, f: top * zoom },
    width: imageWidth,
    height: imageHeight,
    key: [
      zoom,
      Math.round(x / step),
      Math.round(y / step),
      imageWidth,
      imageHeight,
    ].join(":"),
  }
}
