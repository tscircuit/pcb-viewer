import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"
import { getCopperRenderLayer } from "../copper-layers"
import {
  getTraceClipContextElements,
  showTraceSegmentsInsideHiddenCopperPours,
} from "../draw-pcb-trace"

export function createCanvasCopperHitTest(
  elements: AnyCircuitElement[],
  showCopperPours: boolean,
) {
  const copper = elements.flatMap((element): AnyCircuitElement[] => {
    switch (element.type) {
      case "pcb_trace":
        return [
          showCopperPours
            ? element
            : showTraceSegmentsInsideHiddenCopperPours(element),
        ]
      case "pcb_smtpad":
      case "pcb_plated_hole":
      case "pcb_via":
      case "pcb_copper_text":
        return [element]
      default:
        return []
    }
  })
  const clipContextElements = getTraceClipContextElements(
    elements,
    showCopperPours,
  )
  let canvas: HTMLCanvasElement | undefined

  // Draw the copper at the pointer into one pixel. Pours participate in the
  // same trace clipping as the Canvas renderer and contribute no opaque paint.
  return (layer: LayerRef, transform: Matrix, x: number, y: number) => {
    if (!canvas) {
      canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
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
