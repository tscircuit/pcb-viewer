import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import type { Primitive } from "./types"

// Color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
    inner1: color(colors.board.copper.in1).lighten(0.5).toString(),
    inner2: color(colors.board.copper.in2).lighten(0.5).toString(),
    inner3: color(colors.board.copper.in3).lighten(0.5).toString(),
    inner4: color(colors.board.copper.in4).lighten(0.5).toString(),
    inner5: color(colors.board.copper.in5).lighten(0.5).toString(),
    inner6: color(colors.board.copper.in6).lighten(0.5).toString(),
  },
}

export function isPcbTrace(element: AnyCircuitElement) {
  return element.type === "pcb_trace"
}

const normalizeCopperLayers = (layers: PcbRenderLayer[]) =>
  layers.map((layer) =>
    layer.endsWith("_copper") ? layer.replace("_copper", "") : layer,
  )

export function drawPcbTraceElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
}) {
  const targetLayers = new Set(normalizeCopperLayers(layers))
  const traceElements = elements
    .filter(isPcbTrace)
    .filter((element) =>
      element.route.some(
        (segment) =>
          segment.route_type === "wire" &&
          "layer" in segment &&
          targetLayers.has(segment.layer),
      ),
    )

  if (traceElements.length === 0) return

  const highlightedElementIds = new Set<string>()
  if (primitives) {
    for (const primitive of primitives) {
      if (
        (primitive.is_mouse_over || primitive.is_in_highlighted_net) &&
        primitive._element?.type === "pcb_trace"
      ) {
        highlightedElementIds.add(primitive._element.pcb_trace_id)
      }
    }
  }

  const highlightedElements = traceElements.filter((element) =>
    highlightedElementIds.has(element.pcb_trace_id),
  )
  const nonHighlightedElements = traceElements.filter(
    (element) => !highlightedElementIds.has(element.pcb_trace_id),
  )

  if (nonHighlightedElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(nonHighlightedElements, { layers })
  }

  if (highlightedElements.length > 0) {
    const highlightDrawer = new CircuitToCanvasDrawer(canvas)
    highlightDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    highlightDrawer.realToCanvasMat = realToCanvasMat
    highlightDrawer.drawElements(highlightedElements, { layers })
  }
}
