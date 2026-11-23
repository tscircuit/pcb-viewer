import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type { PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import type { PhaseSkewDrilledElement } from "./get-phase-skew-drilled-elements"

/** The largest channel of an 8-bit CSS colour. */
const CHANNEL_MAX = 255

/**
 * Every copper layer fully transparent, so redrawing a via or plated hole
 * leaves its copper as it is and only cuts and repaints its drill.
 */
const DRILLS_ONLY_COLOR_OVERRIDES: Partial<PcbColorMap> = {
  copper: Object.fromEntries(
    Object.keys(DEFAULT_PCB_COLOR_MAP.copper).map((layer) => [
      layer,
      "rgba(0, 0, 0, 0)",
    ]),
  ) as PcbColorMap["copper"],
}

/**
 * Strokes one copper layer's phase skew onto its canvas, above the copper
 * already drawn there. Drills are then cut through the strokes again, as
 * the WebGPU renderer erases them after drawing its strokes.
 */
export function drawPhaseSkewStrokes({
  canvas,
  copperLayer,
  drilledElements,
  phaseSkewStrokes,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  copperLayer: PcbRenderLayer
  /** The scene's vias, including route-point vias, and plated holes. */
  drilledElements: PhaseSkewDrilledElement[]
  /** The strokes on `copperLayer`. */
  phaseSkewStrokes: LayerStroke[]
  realToCanvasMat: Matrix
}): void {
  const context = canvas.getContext("2d")!
  context.save()
  context.setTransform(
    realToCanvasMat.a,
    realToCanvasMat.b,
    realToCanvasMat.c,
    realToCanvasMat.d,
    realToCanvasMat.e,
    realToCanvasMat.f,
  )
  context.lineCap = "round"
  for (const stroke of phaseSkewStrokes) {
    const [red, green, blue, alpha] = stroke.color
    context.strokeStyle = `rgba(${red * CHANNEL_MAX}, ${green * CHANNEL_MAX}, ${blue * CHANNEL_MAX}, ${alpha})`
    context.lineWidth = stroke.widthMm
    context.beginPath()
    context.moveTo(stroke.start.x, stroke.start.y)
    context.lineTo(stroke.end.x, stroke.end.y)
    context.stroke()
  }
  context.restore()

  if (drilledElements.length === 0) return
  const drillDrawer = new CircuitToCanvasDrawer(canvas)
  drillDrawer.configure({ colorOverrides: DRILLS_ONLY_COLOR_OVERRIDES })
  drillDrawer.realToCanvasMat = realToCanvasMat
  drillDrawer.drawElements(drilledElements, {
    layers: [copperLayer],
    drawSoldermask: false,
  })
}
