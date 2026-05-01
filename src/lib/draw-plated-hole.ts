import type { AnyCircuitElement, PcbPlatedHole, PcbRenderLayer } from "circuit-json"
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

export function isPlatedHole(
  element: AnyCircuitElement,
): element is PcbPlatedHole {
  return element.type === "pcb_plated_hole"
}

/**
 * Maps a PcbRenderLayer (e.g. "top_copper") to the bare LayerRef used in
 * pcb_plated_hole.layers (e.g. "top").
 */
function copperLayerToLayerRef(layer: PcbRenderLayer): string {
  return layer.endsWith("_copper") ? layer.replace("_copper", "") : layer
}

export function drawPlatedHolePads({
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
  // so we can match against pcb_plated_hole.layers which uses bare refs.
  const targetLayerRefs = new Set(layers.map(copperLayerToLayerRef))

  // Only draw holes that have at least one of their layers on the target canvas.
  // This prevents bottom-layer holes from bleeding through onto the top canvas
  // (and vice versa) at the 0.5 opacity used for non-foreground layers.
  const platedHoleElements = elements.filter(isPlatedHole).filter((element) => {
    const holeLayers = element.layers ?? []
    // If the hole has no layers info, fall back to drawing it on all canvases
    if (holeLayers.length === 0) return true
    return holeLayers.some((l) => targetLayerRefs.has(l))
  })

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
