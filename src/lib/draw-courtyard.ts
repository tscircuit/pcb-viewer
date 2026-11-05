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
    element.type === "pcb_courtyard_outline" ||
    element.type === "pcb_courtyard_polygon"
  )
}

export function getCourtyardElementsForLayer({
  elements,
  layers,
}: {
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
}): AnyCircuitElement[] {
  return elements
    .filter(isCourtyardElement)
    .map((element) => {
      const layer = ("layer" in element && element.layer) || "top"
      if (element.type === "pcb_courtyard_polygon") {
        return {
          ...element,
          type: "pcb_courtyard_outline",
          pcb_courtyard_outline_id: element.pcb_courtyard_polygon_id,
          outline: element.points,
          layer,
        } as AnyCircuitElement
      }
      return "layer" in element && element.layer
        ? element
        : ({ ...element, layer } as AnyCircuitElement)
    })
    .filter((element) => {
      const layer = ("layer" in element && element.layer) || "top"
      return (
        layers.length === 0 ||
        (layer === "top" && layers.includes("top_courtyard")) ||
        (layer === "bottom" && layers.includes("bottom_courtyard"))
      )
    })
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
  const courtyardElements = getCourtyardElementsForLayer({ elements, layers })
  if (courtyardElements.length === 0) return

  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.configure({
    colorOverrides: PCB_VIEWER_COLOR_MAP,
  })

  drawer.realToCanvasMat = realToCanvasMat

  drawer.drawElements(courtyardElements, { layers })
}
