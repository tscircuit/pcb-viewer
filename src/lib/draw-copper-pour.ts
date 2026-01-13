import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isCopperPourElement(element: AnyCircuitElement) {
  return element.type === "pcb_copper_pour"
}

export function drawCopperPourElementsForLayer({
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
  const copperPourElements = elements.filter(isCopperPourElement)

  if (copperPourElements.length === 0) return

  // Draw all copper pour elements with default colors
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat
  drawer.drawElements(copperPourElements, { layers })
}
