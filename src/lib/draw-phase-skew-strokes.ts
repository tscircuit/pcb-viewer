import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type { LayerRef } from "circuit-json"
import type { Matrix } from "transformation-matrix"

/** The largest channel of an 8-bit CSS colour. */
const CHANNEL_MAX = 255

/** Strokes the phase skew on `layer` onto that layer's canvas, above the copper already drawn there. */
export function drawPhaseSkewStrokes({
  canvas,
  layer,
  phaseSkewStrokes,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  layer: LayerRef
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
    if (stroke.layer !== layer) continue
    const [red, green, blue, alpha] = stroke.color
    context.strokeStyle = `rgba(${red * CHANNEL_MAX}, ${green * CHANNEL_MAX}, ${blue * CHANNEL_MAX}, ${alpha})`
    context.lineWidth = stroke.widthMm
    context.beginPath()
    context.moveTo(stroke.start.x, stroke.start.y)
    context.lineTo(stroke.end.x, stroke.end.y)
    context.stroke()
  }
  context.restore()
}
