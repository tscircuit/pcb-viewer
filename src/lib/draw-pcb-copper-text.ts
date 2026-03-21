import type {
  AnyCircuitElement,
  PcbCopperText,
  PcbRenderLayer,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isPcbCopperText(
  element: AnyCircuitElement,
): element is PcbCopperText {
  return element.type === "pcb_copper_text"
}

export function drawPcbCopperTextElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
}) {
  const copperTextElements = elements.filter(isPcbCopperText)

  if (copperTextElements.length === 0) return

  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat
  drawer.drawElements(copperTextElements, { layers })
}
