import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"
import type { Matrix } from "transformation-matrix"

/** The largest channel of an 8-bit CSS colour. */
const CHANNEL_MAX = 255

/** Strokes one copper layer's phase skew onto its canvas, above the copper already drawn there. */
export function drawPhaseSkewStrokes({
  canvas,
  phaseSkewStrokes,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  /** The strokes on this canvas's copper layer. */
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
}
