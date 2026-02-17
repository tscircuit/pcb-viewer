import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"

const PCB_VIEWER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  courtyard: {
    top: colors.board.f_crtyd,
    bottom: colors.board.b_crtyd,
  },
}

export function isCourtyardElement(element: AnyCircuitElement) {
  return (
    element.type === "pcb_courtyard_circle" ||
    element.type === "pcb_courtyard_rect" ||
    element.type === "pcb_courtyard_outline"
  )
}

export function drawCourtyardElementsForLayer({
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
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.configure({
    colorOverrides: PCB_VIEWER_COLOR_MAP,
  })

  drawer.realToCanvasMat = realToCanvasMat

  const courtyardElements = elements.filter(isCourtyardElement)

  drawer.drawElements(courtyardElements, { layers })
}
