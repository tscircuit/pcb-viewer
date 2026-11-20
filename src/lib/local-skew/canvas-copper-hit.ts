import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import { getCopperRenderLayer } from "../copper-layers"
import {
  getTraceClipContextElements,
  showTraceSegmentsInsideHiddenCopperPours,
} from "../draw-pcb-trace"

/** True when opaque copper on `layer` covers the viewer pixel (`x`, `y`) under `transform`. */
export type CanvasCopperHitTest = (query: {
  layer: LayerRef
  transform: Matrix
  x: number
  y: number
}) => boolean

/**
 * Builds a hit test that draws the copper at one viewer pixel with the
 * Canvas renderer, including its trace clipping. Pours contribute no
 * opaque paint.
 */
export function createCanvasCopperHitTest({
  elements,
  showCopperPours,
}: {
  elements: AnyCircuitElement[]
  showCopperPours: boolean
}): CanvasCopperHitTest {
  const copper = copperElements({ elements, showCopperPours })
  const clipContextElements = getTraceClipContextElements(
    elements,
    showCopperPours,
  )
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  return ({ layer, transform, x, y }) => {
    ctx.clearRect(0, 0, 1, 1)
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = {
      ...transform,
      e: transform.e - x + 0.5,
      f: transform.f - y + 0.5,
    }
    drawer.drawElements(copper, {
      layers: [getCopperRenderLayer(layer)],
      clipContextElements,
    })
    return ctx.getImageData(0, 0, 1, 1).data[3] === 255
  }
}

/** The elements that paint copper, with traces clipped as the Canvas renderer clips them when pours are hidden. */
function copperElements({
  elements,
  showCopperPours,
}: {
  elements: AnyCircuitElement[]
  showCopperPours: boolean
}): AnyCircuitElement[] {
  const copper: AnyCircuitElement[] = []
  for (const element of elements) {
    if (element.type === "pcb_trace") {
      if (showCopperPours) {
        copper.push(element)
        continue
      }
      copper.push(showTraceSegmentsInsideHiddenCopperPours(element))
      continue
    }
    if (
      element.type === "pcb_smtpad" ||
      element.type === "pcb_plated_hole" ||
      element.type === "pcb_via" ||
      element.type === "pcb_copper_text"
    ) {
      copper.push(element)
    }
  }
  return copper
}
