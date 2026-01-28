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
    inner1: color(colors.board.copper.in1).lighten(0.5).toString(),
    inner2: color(colors.board.copper.in2).lighten(0.5).toString(),
    inner3: color(colors.board.copper.in3).lighten(0.5).toString(),
    inner4: color(colors.board.copper.in4).lighten(0.5).toString(),
    inner5: color(colors.board.copper.in5).lighten(0.5).toString(),
    inner6: color(colors.board.copper.in6).lighten(0.5).toString(),
  },
}

export function isPcbSmtPad(element: AnyCircuitElement) {
  return element.type === "pcb_smtpad"
}

export function drawPcbSmtPadElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
  drawSoldermask,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
  drawSoldermask?: boolean
}) {
  // Filter SMT pads to only those on the specified layers
  const smtPadElements = elements.filter(isPcbSmtPad).filter((element) => {
    const elementLayer = element.layer
    return layers.some((layer) => {
      if (layer === "top_copper" && elementLayer === "top") return true
      if (layer === "bottom_copper" && elementLayer === "bottom") return true
      if (layer === "inner1_copper" && elementLayer === "inner1") return true
      if (layer === "inner2_copper" && elementLayer === "inner2") return true
      if (layer === "inner3_copper" && elementLayer === "inner3") return true
      if (layer === "inner4_copper" && elementLayer === "inner4") return true
      if (layer === "inner5_copper" && elementLayer === "inner5") return true
      if (layer === "inner6_copper" && elementLayer === "inner6") return true
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
    drawer.drawElements(nonHighlightedElements, { layers, drawSoldermask })
  }

  // Draw highlighted elements with lighter colors
  if (highlightedElements.length > 0) {
    const highlightDrawer = new CircuitToCanvasDrawer(canvas)
    highlightDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    highlightDrawer.realToCanvasMat = realToCanvasMat
    highlightDrawer.drawElements(highlightedElements, {
      layers,
      drawSoldermask,
    })
  }
}
