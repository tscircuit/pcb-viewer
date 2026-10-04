import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"

export function isCopperPourElement(element: AnyCircuitElement) {
  return element.type === "pcb_copper_pour"
}

export function drawCopperPourElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  opacity = 1,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  opacity?: number
}) {
  const copperPourElements = elements.filter(isCopperPourElement)

  if (copperPourElements.length === 0 || opacity <= 0) return

  // Preserve circuit-to-canvas's default pour alpha and scale it independently.
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.configure({
    colorOverrides: {
      copper: Object.fromEntries(
        Object.entries(DEFAULT_PCB_COLOR_MAP.copper).map(([layer, value]) => [
          layer,
          color(value).alpha(opacity).rgb().string(),
        ]),
      ) as PcbColorMap["copper"],
    },
  })
  drawer.realToCanvasMat = realToCanvasMat
  drawer.drawElements(copperPourElements, { layers })
}
