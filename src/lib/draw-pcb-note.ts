import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isPcbNote(element: AnyCircuitElement) {
  return element.type.startsWith("pcb_note_")
}

export function getPcbNoteElementsForLayer({
  elements,
  layers,
}: {
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
}): AnyCircuitElement[] {
  return elements
    .filter(isPcbNote)
    .map((element) =>
      "layer" in element && element.layer
        ? element
        : ({ ...element, layer: "top" } as AnyCircuitElement),
    )
    .filter((element) => {
      const layer = ("layer" in element && element.layer) || "top"
      return (
        layers.length === 0 ||
        (layer === "top" && layers.includes("top_user_note")) ||
        (layer === "bottom" && layers.includes("bottom_user_note"))
      )
    })
}

export function drawPcbNoteElementsForLayer({
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
  const pcbNoteElements = getPcbNoteElementsForLayer({ elements, layers })
  if (pcbNoteElements.length === 0) return

  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  drawer.drawElements(pcbNoteElements, { layers })
}
