import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  CircuitToCanvasDrawer,
} from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer, PcbVia } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import color from "color"
import { Primitive } from "./types"

// Color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
  },
}

export function isPcbVia(element: AnyCircuitElement): element is PcbVia {
  return element.type === "pcb_via"
}

export function drawPcbViaElementsForLayer({
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
  // Convert render layers (e.g. "top_copper") to bare layer refs (e.g. "top")
  // to match against pcb_via.layers which uses bare layer refs.
  const targetLayerRefs = new Set(
    layers.map((l) => (l.endsWith("_copper") ? l.replace("_copper", "") : l)),
  )

  // Filter vias to only those that include the target layer.
  // This prevents via copper rings from appearing on non-foreground canvases
  // (which are shown at 0.5 opacity), causing visible bleed-through.
  const viaElements = elements.filter(isPcbVia).filter((element) => {
    const viaLayers = element.layers ?? []
    if (viaLayers.length === 0) {
      // Fallback: draw on any copper layer canvas (legacy behaviour)
      return layers.some((layer) => layer.includes("copper"))
    }
    return viaLayers.some((l) => targetLayerRefs.has(l))
  })

  if (viaElements.length === 0) return

  // Find which via elements have highlighted primitives
  const highlightedElementIds = new Set<string>()
  if (primitives) {
    for (const primitive of primitives) {
      if (
        (primitive.is_mouse_over || primitive.is_in_highlighted_net) &&
        primitive._element?.type === "pcb_via"
      ) {
        highlightedElementIds.add(primitive._element.pcb_via_id)
      }
    }
  }

  // Separate highlighted and non-highlighted elements
  const highlightedElements = viaElements.filter((element) =>
    highlightedElementIds.has(element.pcb_via_id),
  )
  const nonHighlightedElements = viaElements.filter(
    (element) => !highlightedElementIds.has(element.pcb_via_id),
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
