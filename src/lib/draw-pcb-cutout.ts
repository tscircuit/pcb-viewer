import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"

export function isPcbCutout(element: AnyCircuitElement) {
  return element.type === "pcb_cutout"
}

export function drawPcbCutoutElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const cutoutElements = elements.filter(isPcbCutout)

  drawer.drawElements(cutoutElements, { layers })
}
