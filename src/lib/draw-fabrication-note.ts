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
  return element.type.includes("pcb_fabrication_note")
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

  const fabricationElements = elements.filter(isFabricationNote)

  drawer.drawElements(fabricationElements, { layers })
}
