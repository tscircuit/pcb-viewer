import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement } from "circuit-json"
import type { Matrix } from "transformation-matrix"

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

  // Use a subtle gray color instead of the default bright red outline
  drawer.configure({
    colorOverrides: {
      keepout: "rgba(255, 255, 255, 0.25)",
    },
  })

  drawer.drawElements(keepoutElements, { layers: [] })
}
