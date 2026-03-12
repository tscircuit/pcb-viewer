import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import type { Primitive } from "./types"

// Color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
  },
}
const BOTTOM_COPPER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: DEFAULT_PCB_COLOR_MAP.copper.bottom,
  },
}

export function isPlatedHole(element: AnyCircuitElement) {
  return element.type === "pcb_plated_hole"
}

export function drawPlatedHolePads({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
  drawSoldermask,
  selectedLayer,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
  drawSoldermask?: boolean
  selectedLayer?: string
}) {
  const platedHoleElements = elements.filter(isPlatedHole)

  if (platedHoleElements.length === 0) return

  // Find which plated hole elements have highlighted primitives
  const highlightedElementIds = new Set<string>()
  if (primitives) {
    for (const primitive of primitives) {
      if (
        (primitive.is_mouse_over || primitive.is_in_highlighted_net) &&
        primitive._element?.type === "pcb_plated_hole"
      ) {
        highlightedElementIds.add(primitive._element.pcb_plated_hole_id)
      }
    }
  }

  // Separate highlighted and non-highlighted elements
  const highlightedElements = platedHoleElements.filter((element) =>
    highlightedElementIds.has(element.pcb_plated_hole_id),
  )
  const nonHighlightedElements = platedHoleElements.filter(
    (element) => !highlightedElementIds.has(element.pcb_plated_hole_id),
  )

  // Draw non-highlighted elements with default colors
  if (nonHighlightedElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    if (selectedLayer === "bottom") {
      drawer.configure({ colorOverrides: BOTTOM_COPPER_COLOR_MAP })
    }
    drawer.drawElements(nonHighlightedElements, { layers, drawSoldermask })
  }

  // Draw highlighted elements with lighter colors
  if (highlightedElements.length > 0) {
    const highlightDrawer = new CircuitToCanvasDrawer(canvas)
    if (selectedLayer === "bottom") {
      highlightDrawer.configure({
        colorOverrides: {
          ...HOVER_COLOR_MAP,
          copper: {
            ...HOVER_COLOR_MAP.copper,
            top: HOVER_COLOR_MAP.copper.bottom,
          },
        },
      })
    } else {
      highlightDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    }
    highlightDrawer.realToCanvasMat = realToCanvasMat
    highlightDrawer.drawElements(highlightedElements, {
      layers,
      drawSoldermask,
    })
  }
}
