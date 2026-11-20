import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairLocalSkew,
  PcbLocalSkewSegment,
} from "circuit-json"
import {
  type LocalSkewColors,
  type Rgb,
  resolveSkewPalette,
  skewColor,
} from "./skew-color"

/** Strokes are never thinner than this on screen, in CSS pixels. */
const MIN_STROKE_PIXELS = 2
/** The dark casing extends this far beyond the stroke in total, in CSS pixels. */
const CASING_EXTRA_PIXELS = 4
/** The casing is never wider than this many copper widths, so it stays inside neighbouring gaps at fit zoom. */
const CASING_MAX_WIDTH_FACTOR = 2
/** Strokes are this much wider than their copper, so no copper edge shows beside them. */
const STROKE_WIDTH_FACTOR = 1.1
/** The largest value of an 8-bit colour channel. */
const CHANNEL_MAX = 255

/** One stored segment and the colour it is painted with. */
export type PaintedSegment = {
  key: string
  pair: PcbDifferentialPairLocalSkew
  segment: PcbLocalSkewSegment
  rgb: Rgb
}

/** Painted segments by copper layer, then by copper width in mm. */
export type SkewLayers = Map<LayerRef, Map<number, PaintedSegment[]>>

/** A stroke's width and its casing's width, in mm. */
export type SkewStrokeWidths = { stroke: number; casing: number }

/** Stroke and casing widths for copper `width` at `pixelsPerMm`; Canvas draws no casing when it is not wider than the stroke. */
export function getSkewStrokeWidths({
  width,
  pixelsPerMm,
}: {
  width: number
  pixelsPerMm: number
}): SkewStrokeWidths {
  const stroke = Math.max(
    STROKE_WIDTH_FACTOR * width,
    MIN_STROKE_PIXELS / pixelsPerMm,
  )
  return {
    stroke,
    casing: Math.min(
      CASING_MAX_WIDTH_FACTOR * width,
      stroke + CASING_EXTRA_PIXELS / pixelsPerMm,
    ),
  }
}

/** Every stored segment, coloured with its pair's palette and grouped by layer and copper width. */
export function groupSkewStrokes({
  elements,
  colors,
  useLogScale,
}: {
  elements: AnyCircuitElement[]
  colors?: LocalSkewColors
  useLogScale?: boolean
}): SkewLayers {
  const layers: SkewLayers = new Map()
  for (const pair of elements) {
    if (pair.type !== "pcb_differential_pair_local_skew") continue
    const palette = resolveSkewPalette({ colors, pair })
    for (const side of ["positive", "negative"] as const) {
      const trace = pair[side]
      trace.segments.forEach((segment, index) => {
        let groups = layers.get(segment.layer)
        if (!groups) {
          groups = new Map()
          layers.set(segment.layer, groups)
        }
        let lines = groups.get(segment.width)
        if (!lines) {
          lines = []
          groups.set(segment.width, lines)
        }
        lines.push({
          key: `${pair.pcb_differential_pair_local_skew_id}-${side}-${index}`,
          pair,
          segment,
          rgb: skewColor({
            skew: segment.local_skew,
            positiveScale: trace.positive_skew_scale,
            negativeScale: trace.negative_skew_scale,
            palette,
            useLogScale,
          }),
        })
      })
    }
  }
  return layers
}

/**
 * The strokes circuit-json-webgpu draws inside each layer: per layer, every
 * segment's dark casing first, then its coloured stroke. Widths in CSS
 * pixels are scaled by `pixelRatio` to canvas pixels.
 */
export function getWebGpuSkewStrokes({
  layers,
  pixelRatio,
}: {
  layers: SkewLayers
  pixelRatio: number
}): LayerStroke[] {
  const casings: LayerStroke[] = []
  const strokes: LayerStroke[] = []
  for (const [layer, groups] of layers) {
    for (const [width, lines] of groups) {
      for (const { segment, rgb } of lines) {
        const line = {
          layer,
          start: segment.start,
          end: segment.end,
          width: STROKE_WIDTH_FACTOR * width,
          minWidthPixels: MIN_STROKE_PIXELS * pixelRatio,
        }
        casings.push({
          ...line,
          extraWidthPixels: CASING_EXTRA_PIXELS * pixelRatio,
          maxWidth: CASING_MAX_WIDTH_FACTOR * width,
          color: [0, 0, 0, 1],
        })
        strokes.push({
          ...line,
          color: [
            rgb[0] / CHANNEL_MAX,
            rgb[1] / CHANNEL_MAX,
            rgb[2] / CHANNEL_MAX,
            1,
          ],
        })
      }
    }
  }
  return [...casings, ...strokes]
}
