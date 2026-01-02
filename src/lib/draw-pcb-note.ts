import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  CircuitToCanvasDrawer,
} from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"

export function isPcbNote(element: AnyCircuitElement) {
  return element.type.startsWith("pcb_note_")
}

export function drawPcbNoteElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const pcbNoteElements = elements.filter(isPcbNote)

  drawer.drawElements(pcbNoteElements, { layers })
}
