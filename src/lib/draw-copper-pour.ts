import type { AnyCircuitElement, LayerRef, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  drawPcbCopperPour,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import { identity } from "transformation-matrix"

/** Test the same paths used for painting, including rotations, arcs and holes. */
export function getCopperPoursUnderPoint(
  elements: AnyCircuitElement[],
  point: { x: number; y: number },
  selectedLayer: LayerRef,
) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d")!
  return elements.filter((element) => {
    if (element.type !== "pcb_copper_pour" || element.layer !== selectedLayer)
      return false
    // Painting on a scratch canvas leaves the exact path available for testing.
    drawPcbCopperPour({
      ctx,
      pour: element,
      realToCanvasMat: identity(),
      colorMap: DEFAULT_PCB_COLOR_MAP,
    })
    return ctx.isPointInPath(
      point.x,
      point.y,
      element.shape === "brep" ? "evenodd" : "nonzero",
    )
  })
}

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
