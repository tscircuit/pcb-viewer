import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"

// Create a color map that uses pcb-viewer's existing colors for silkscreen
// while using defaults from circuit-to-canvas for other elements
const PCB_VIEWER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  silkscreen: {
    top: colors.board.f_silks,
    bottom: colors.board.b_silks,
  },
}

export function isSilkscreenElement(element: AnyCircuitElement) {
  return element.type.includes("pcb_silkscreen")
}

export function getSilkscreenElementsForLayer({
  elements,
  layers,
}: {
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
}) {
  // Some silkscreen types (such as pill and oval) are not classified by the
  // drawer's generic render-layer filter. Enforce the silkscreen side before drawing.
  return elements.filter(
    (element) =>
      isSilkscreenElement(element) &&
      "layer" in element &&
      (layers.length === 0 ||
        (element.layer === "top" && layers.includes("top_silkscreen")) ||
        (element.layer === "bottom" && layers.includes("bottom_silkscreen"))),
  )
}

export function drawSilkscreenElementsForLayer({
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

  const silkscreenElements = getSilkscreenElementsForLayer({ elements, layers })

  drawer.drawElements(silkscreenElements, { layers })
}
