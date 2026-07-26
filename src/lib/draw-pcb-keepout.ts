import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import type { AnyCircuitElement } from "circuit-json"
import type { Matrix } from "transformation-matrix"

// Color map for keepouts - uses subtle semi-transparent white
const KEEPOUT_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  keepout: "rgba(255, 255, 255, 0.25)",
}

export function isPcbKeepout(element: AnyCircuitElement) {
  return element.type === "pcb_keepout"
}

export function drawPcbKeepoutElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: string[]
  realToCanvasMat: Matrix
}) {
  // Filter keepouts to only those on the specified layers
  const keepoutElements = elements.filter(isPcbKeepout)

  if (keepoutElements.length === 0) return

  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat

  drawer.configure({
    colorOverrides: KEEPOUT_COLOR_MAP,
  })

  drawer.drawElements(keepoutElements, { layers: [] })
}
