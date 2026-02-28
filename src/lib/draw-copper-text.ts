import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"

const PCB_VIEWER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    top: colors.board.copper.f,
    bottom: colors.board.copper.b,
    inner1: colors.board.copper.in1,
    inner2: colors.board.copper.in2,
    inner3: colors.board.copper.in3,
    inner4: colors.board.copper.in4,
    inner5: colors.board.copper.in5,
    inner6: colors.board.copper.in6,
  },
}

export function isCopperTextElement(element: AnyCircuitElement) {
  return element.type === "pcb_copper_text"
}

export function drawCopperTextElementsForLayer({
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

  const copperTextElements = elements.filter(isCopperTextElement)

  drawer.drawElements(copperTextElements, { layers })
}
