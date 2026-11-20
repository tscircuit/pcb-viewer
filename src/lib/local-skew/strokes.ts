import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairLocalSkew,
  PcbLocalSkewSegment,
} from "circuit-json"
import color from "color"
import { type LocalSkewColors, skewColor } from "./skew-color"

const MIN_STROKE_PIXELS = 2
const CASING_EXTRA_PIXELS = 4
const CASING_MAX_WIDTH_FACTOR = 2
const STROKE_WIDTH_FACTOR = 1.1

export type PaintedSegment = {
  key: string
  pair: PcbDifferentialPairLocalSkew
  segment: PcbLocalSkewSegment
  color: string
}

type StrokeGroup = { casing: string; lines: PaintedSegment[] }

export type SkewLayers = Map<LayerRef, Map<number, StrokeGroup>>

export function getSkewStrokeWidths(width: number, pixelsPerMm: number) {
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

export function groupSkewStrokes(
  elements: AnyCircuitElement[],
  colors?: LocalSkewColors,
  useLogScale?: boolean,
): SkewLayers {
  const layers: SkewLayers = new Map()
  for (const pair of elements) {
    if (pair.type !== "pcb_differential_pair_local_skew") continue
    for (const side of ["positive", "negative"] as const) {
      const trace = pair[side]
      trace.segments.forEach((segment, index) => {
        const { layer, width, start, end, local_skew } = segment
        let groups = layers.get(layer)
        if (!groups) layers.set(layer, (groups = new Map()))
        let group = groups.get(width)
        if (!group) groups.set(width, (group = { casing: "", lines: [] }))
        group.casing += `M${start.x} ${start.y}L${end.x} ${end.y}`
        group.lines.push({
          key: `${pair.pcb_differential_pair_local_skew_id}-${side}-${index}`,
          pair,
          segment,
          color: skewColor({
            skew: local_skew,
            positiveScale: trace.positive_skew_scale,
            negativeScale: trace.negative_skew_scale,
            colors,
            pair,
            useLogScale,
          }),
        })
      })
    }
  }
  return layers
}

export function getWebGpuSkewStrokes(
  layers: SkewLayers,
  pixelRatio: number,
): LayerStroke[] {
  const result: LayerStroke[] = []
  const palette = new Map<string, LayerStroke["color"]>()
  for (const [layer, groups] of layers) {
    const lines: LayerStroke[] = []
    for (const [width, group] of groups) {
      for (const { segment, color: css } of group.lines) {
        const stroke = {
          layer,
          start: segment.start,
          end: segment.end,
          width: STROKE_WIDTH_FACTOR * width,
          minWidthPixels: MIN_STROKE_PIXELS * pixelRatio,
        }
        let rgba = palette.get(css)
        if (!rgba) {
          const rgb = color(css).rgb()
          palette.set(
            css,
            (rgba = [
              rgb.red() / 255,
              rgb.green() / 255,
              rgb.blue() / 255,
              rgb.alpha(),
            ]),
          )
        }
        result.push({
          ...stroke,
          extraWidthPixels: CASING_EXTRA_PIXELS * pixelRatio,
          maxWidth: CASING_MAX_WIDTH_FACTOR * width,
          color: [0, 0, 0, 1],
        })
        lines.push({ ...stroke, color: rgba })
      }
    }
    for (const line of lines) result.push(line)
  }
  return result
}
