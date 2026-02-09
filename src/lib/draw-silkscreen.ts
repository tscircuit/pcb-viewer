import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import { convertPcbSilkscreenTextToPrimitive } from "./element-to-primitive/convert-pcb-silkscreen-text-to-primitive"
import { Drawer } from "./Drawer"
import { drawPrimitives } from "./draw-primitives"

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

  const silkscreenElements = elements.filter(isSilkscreenElement)

  drawer.drawElements(silkscreenElements, { layers })
}
