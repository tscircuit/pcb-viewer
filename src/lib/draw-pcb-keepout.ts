import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"

export function isPcbKeepout(element: AnyCircuitElement) {
  return element.type === "pcb_keepout"
}

export function drawPcbKeepoutElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: string[],
  realToCanvasMat: Matrix,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const keepoutElements = elements.filter(isPcbKeepout)

  drawer.drawElements(keepoutElements, { layers: layers as PcbRenderLayer[] })
}
