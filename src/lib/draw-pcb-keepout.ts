import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement } from "circuit-json"
import type { Matrix } from "transformation-matrix"

// Color map for keepouts - uses background color for all layers

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
  const keepoutElements = elements.filter(isPcbKeepout).filter((element) => {
    const keepoutLayers = (element as any).layer
    if (!Array.isArray(keepoutLayers)) return false
    // Check if any of the target layers match any of the keepout's layers
    return layers.some((layer) => keepoutLayers.includes(layer))
  })

  if (keepoutElements.length === 0) return

  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat

  drawer.drawElements(keepoutElements, { layers: [] })
}
