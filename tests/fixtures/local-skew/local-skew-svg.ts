import type { AnyCircuitElement, CircuitJson, LayerRef } from "circuit-json"
import { LAYER_NAME_TO_COLOR } from "../../../src/lib/Drawer"
import colors from "../../../src/lib/colors"
import { computeLocalSkew } from "../../../src/lib/local-skew/compute-local-skew"
import { skewColor, skewScaleFor } from "../../../src/lib/local-skew/skew-color"

/** Board millimetres to snapshot pixels. */
const PIXELS_PER_MM = 40

/** Space around the routed copper, in mm. */
const MARGIN = 1

/** Width of the skew overlay relative to the trace, matching KiCad's 1.1× inflation. */
const SKEW_WIDTH_FACTOR = 1.1

/** Copper is dimmed so pads and un-overlaid traces aren't mistaken for the red negative-skew colour. */
const COPPER_OPACITY = 0.35

/** Bottom first, so top copper and its skew paint over it, as in the viewer. */
const LAYER_ORDER: LayerRef[] = ["bottom", "inner1", "inner2", "top"]

/**
 * An SVG of a board's routed copper with its local skew drawn on top, in
 * KiCad's overlay colours: white in step, blue where a trace has run farther
 * than its partner, red where it has run less far, and grey where unknown.
 * Dimmed copper shows at pads and bare where there is no skew to draw.
 */
export function localSkewSvg(circuitJson: CircuitJson): string {
  const pairs = computeLocalSkew(circuitJson)
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  const points = traces.flatMap((trace) =>
    trace.route.flatMap((point) => {
      if (point.route_type === "through_pad") return [point.start, point.end]
      return [point]
    }),
  )
  const minX = Math.min(...points.map((point) => point.x)) - MARGIN
  const maxX = Math.max(...points.map((point) => point.x)) + MARGIN
  const minY = Math.min(...points.map((point) => point.y)) - MARGIN
  const maxY = Math.max(...points.map((point) => point.y)) + MARGIN
  const width = maxX - minX
  const height = maxY - minY

  const shapes: string[] = []
  for (const layer of LAYER_ORDER) {
    for (const element of circuitJson) shapes.push(...padShapes(element, layer))
    for (const trace of traces) {
      for (let index = 1; index < trace.route.length; index++) {
        const from = trace.route[index - 1]
        const to = trace.route[index]
        if (from.route_type !== "wire" || to.route_type !== "wire") continue
        if (from.layer !== layer || to.layer !== layer) continue
        shapes.push(
          line({
            start: from,
            end: to,
            width: from.width,
            color: copperColor(layer),
            opacity: COPPER_OPACITY,
          }),
        )
      }
    }
    for (const pair of pairs) {
      for (const trace of [pair.positive, pair.negative]) {
        const fullScale = skewScaleFor(trace.segments)
        for (const segment of trace.segments) {
          if (segment.layer !== layer) continue
          shapes.push(
            line({
              start: segment.start,
              end: segment.end,
              width: segment.width * SKEW_WIDTH_FACTOR,
              color: skewColor({
                skew: segment.skew,
                fullScale,
              }),
            }),
          )
        }
      }
    }
  }
  for (const element of circuitJson) {
    if (element.type !== "pcb_via") continue
    shapes.push(
      `<circle cx="${element.x}" cy="${element.y}" r="${element.outer_diameter / 2}" fill="${LAYER_NAME_TO_COLOR.drill}"/>`,
    )
  }

  const title = pairs
    .map((pair) => {
      let maxSkew = "unknown"
      if (pair.max_skew !== null) maxSkew = `${pair.max_skew.toFixed(4)} mm`
      return `${pair.name ?? pair.source_bus_id}: max local skew ${maxSkew}`
    })
    .join("; ")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * PIXELS_PER_MM)}" height="${Math.round(height * PIXELS_PER_MM)}" viewBox="${minX} ${-maxY} ${width} ${height}">
  <title>${title || "no differential pairs"}</title>
  <rect x="${minX}" y="${-maxY}" width="${width}" height="${height}" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    ${shapes.join("\n    ")}
  </g>
</svg>`
}

/** The copper shapes of an SMT pad on `layer`, if it is one. */
function padShapes(element: AnyCircuitElement, layer: LayerRef): string[] {
  if (element.type !== "pcb_smtpad" || element.layer !== layer) return []
  const color = copperColor(layer)
  if (element.shape === "circle") {
    return [
      `<circle cx="${element.x}" cy="${element.y}" r="${element.radius}" fill="${color}" opacity="${COPPER_OPACITY}"/>`,
    ]
  }
  if (element.shape === "rect") {
    return [
      `<rect x="${element.x - element.width / 2}" y="${element.y - element.height / 2}" width="${element.width}" height="${element.height}" fill="${color}" opacity="${COPPER_OPACITY}"/>`,
    ]
  }
  return []
}

/** The viewer's copper colour for `layer`. */
function copperColor(layer: LayerRef): string {
  return LAYER_NAME_TO_COLOR[layer as keyof typeof LAYER_NAME_TO_COLOR]
}

/** A round-capped line between two board points. */
function line({
  start,
  end,
  width,
  color,
  opacity = 1,
}: {
  start: { x: number; y: number }
  end: { x: number; y: number }
  width: number
  color: string
  opacity?: number
}): string {
  return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`
}
