import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  CircuitToCanvasDrawer,
} from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
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

export function drawSilkscreenElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layer: PcbRenderLayer,
  realToCanvasMat: Matrix,
) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.configure({
    colorOverrides: PCB_VIEWER_COLOR_MAP,
  })

  drawer.realToCanvasMat = realToCanvasMat

  drawer.drawElements(elements, { layers: [layer] })
}
