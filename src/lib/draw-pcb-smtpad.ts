import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  CircuitToCanvasDrawer,
} from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import color from "color"

// Color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
  },
}

export function isPcbSmtPad(element: AnyCircuitElement) {
  return element.type === "pcb_smtpad"
}

export function drawPcbSmtPadElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
  primitives?: any[],
) {
  // Filter SMT pads to only those on the specified layers
  const smtPadElements = elements.filter(isPcbSmtPad).filter((element) => {
    const elementLayer = element.layer
    return layers.some((layer) => {
      if (layer === "top_copper" && elementLayer === "top") return true
      if (layer === "bottom_copper" && elementLayer === "bottom") return true
      return false
    })
  })

  if (smtPadElements.length === 0) return

  // Find which SMT pad elements have highlighted primitives
  const highlightedElementIds = new Set<string>()
  if (primitives) {
    for (const primitive of primitives) {
      if (
        (primitive.is_mouse_over || primitive.is_in_highlighted_net) &&
        primitive._element?.type === "pcb_smtpad"
      ) {
        highlightedElementIds.add(primitive._element.pcb_smtpad_id)
      }
    }
  }

  // Separate highlighted and non-highlighted elements
  const highlightedElements = smtPadElements.filter((element) =>
    highlightedElementIds.has(element.pcb_smtpad_id),
  )
  const nonHighlightedElements = smtPadElements.filter(
    (element) => !highlightedElementIds.has(element.pcb_smtpad_id),
  )

  // Draw non-highlighted elements with default colors
  if (nonHighlightedElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(nonHighlightedElements, { layers: [] })
  }

  // Draw highlighted elements with lighter colors
  if (highlightedElements.length > 0) {
    const highlightDrawer = new CircuitToCanvasDrawer(canvas)
    highlightDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    highlightDrawer.realToCanvasMat = realToCanvasMat
    highlightDrawer.drawElements(highlightedElements, { layers: [] })
  }
}
