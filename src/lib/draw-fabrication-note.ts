import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"

// Create a color map that uses pcb-viewer's existing colors for fabrication
// while using defaults from circuit-to-canvas for other elements
const PCB_VIEWER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  silkscreen: {
    top: colors.board.f_fab,
    bottom: colors.board.b_fab,
  },
}

export function isFabricationNote(element: AnyCircuitElement) {
  return element.type.startsWith("pcb_fabrication_note_")
}

export function drawFabricationNoteElementsForLayer({
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

  // Some note types (notably dimensions) are not classified by the drawer's
  // generic render-layer filter. Enforce the FAB side before drawing them.
  const fabricationElements = elements.filter(
    (element) =>
      isFabricationNote(element) &&
      "layer" in element &&
      (layers.length === 0 ||
        (element.layer === "top" && layers.includes("top_fabrication_note")) ||
        (element.layer === "bottom" &&
          layers.includes("bottom_fabrication_note"))),
  )

  drawer.drawElements(fabricationElements, { layers })
}
