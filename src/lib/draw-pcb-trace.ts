import type { AnyCircuitElement, PcbRenderLayer, PcbTrace } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import { normalizeCopperRenderLayers } from "./copper-layers"
import type { Primitive } from "./types"

// Color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: Object.fromEntries(
    Object.entries(DEFAULT_PCB_COLOR_MAP.copper).map(([layer, layerColor]) => [
      layer,
      color(layerColor).lighten(0.5).toString(),
    ]),
  ) as PcbColorMap["copper"],
}

export function isPcbTrace(element: AnyCircuitElement): element is PcbTrace {
  return element.type === "pcb_trace"
}

export const filterTraceByLayers = (
  trace: PcbTrace,
  targetLayers: Set<string>,
): PcbTrace | null => {
  const filteredRoute = trace.route.filter((segment) => {
    if (
      segment.route_type === "wire" &&
      "layer" in segment &&
      targetLayers.has(segment.layer)
    ) {
      return true
    }

    if (segment.route_type === "via") {
      return (
        targetLayers.has(segment.from_layer) ||
        targetLayers.has(segment.to_layer)
      )
    }

    return false
  })

  const wireCount = filteredRoute.filter(
    (segment) => segment.route_type === "wire",
  ).length

  if (wireCount < 2) return null

  return {
    ...trace,
    route: filteredRoute,
  }
}

export const showTraceSegmentsInsideHiddenCopperPours = (
  trace: PcbTrace,
): PcbTrace => ({
  ...trace,
  route: trace.route.map((routePoint) => {
    if (
      !("is_inside_copper_pour" in routePoint) ||
      routePoint.is_inside_copper_pour !== true
    ) {
      return routePoint
    }

    return {
      ...routePoint,
      is_inside_copper_pour: false,
    }
  }),
})

export const getTraceClipContextElements = (
  elements: AnyCircuitElement[],
  showCopperPours: boolean,
): AnyCircuitElement[] => (showCopperPours ? elements : [])

export const getHighlightedTraceElementIds = ({
  primitives,
}: {
  primitives: Primitive[]
}): Set<string> => {
  const highlightedElementIds = new Set<string>()

  for (const primitive of primitives) {
    if (
      (primitive.is_mouse_over || primitive.is_in_highlighted_net) &&
      primitive._element?.type === "pcb_trace"
    ) {
      highlightedElementIds.add(primitive._element.pcb_trace_id)
    }
  }

  return highlightedElementIds
}

export function drawPcbTraceElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
  showCopperPours,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
  showCopperPours: boolean
}) {
  const targetLayers = new Set(normalizeCopperRenderLayers(layers))

  const traceElements = elements
    .filter(isPcbTrace)
    .map((trace) => filterTraceByLayers(trace, targetLayers))
    .filter((trace): trace is PcbTrace => trace !== null)
    .map((trace) =>
      showCopperPours ? trace : showTraceSegmentsInsideHiddenCopperPours(trace),
    )

  if (traceElements.length === 0) return

  const highlightedElementIds = getHighlightedTraceElementIds({
    primitives: primitives ?? [],
  })

  const highlightedElements: PcbTrace[] = []
  const nonHighlightedElements: PcbTrace[] = []
  for (const element of traceElements) {
    if (highlightedElementIds.has(element.pcb_trace_id)) {
      highlightedElements.push(element)
    } else {
      nonHighlightedElements.push(element)
    }
  }

  // The trace renderer receives a filtered element list. Give it the full
  // circuit only as clipping context while pours are visible; an empty list
  // deliberately disables geometric clipping when pours are hidden.
  const clipContextElements = getTraceClipContextElements(
    elements,
    showCopperPours,
  )

  if (nonHighlightedElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(nonHighlightedElements, {
      layers,
      clipContextElements,
    })
  }

  if (highlightedElements.length > 0) {
    const highlightDrawer = new CircuitToCanvasDrawer(canvas)
    highlightDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    highlightDrawer.realToCanvasMat = realToCanvasMat
    highlightDrawer.drawElements(highlightedElements, {
      layers,
      clipContextElements,
    })
  }
}
