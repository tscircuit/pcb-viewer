import type { AnyCircuitElement, PcbRenderLayer, PcbTrace } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import { normalizeCopperRenderLayers } from "./copper-layers"
import {
  getLocalPhaseSkewTraceIndex,
  UNKNOWN_PHASE_SKEW_COLOR,
} from "./local-phase-skew"
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

const UNKNOWN_PHASE_SKEW_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: Object.fromEntries(
    Object.keys(DEFAULT_PCB_COLOR_MAP.copper).map((layer) => [
      layer,
      UNKNOWN_PHASE_SKEW_COLOR,
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
  // Select whole traces, never route points. Removing another layer's wires or
  // through_pad transitions makes separate runs adjacent and invents copper.
  // circuit-to-canvas already splits the original route and filters by layer.
  const touchesLayer = trace.route.some((point) => {
    if (point.route_type === "wire") return targetLayers.has(point.layer)
    if (point.route_type === "via") {
      return (
        targetLayers.has(point.from_layer) || targetLayers.has(point.to_layer)
      )
    }
    if (point.route_type === "through_pad") {
      return (
        targetLayers.has(point.start_layer) || targetLayers.has(point.end_layer)
      )
    }
    return false
  })

  return touchesLayer ? trace : null
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
): AnyCircuitElement[] =>
  showCopperPours
    ? elements
    : elements.filter((element) => element.type !== "pcb_copper_pour")

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
  showDifferentialPairPhaseSkew = false,
  phaseSkewTraceIds,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
  showCopperPours: boolean
  showDifferentialPairPhaseSkew?: boolean
  phaseSkewTraceIds?: ReadonlySet<string>
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

  // Keep the gradient and unknown color visible instead of replacing them
  // with the ordinary copper hover highlight while the skew view is active.
  const pairTraceIds = showDifferentialPairPhaseSkew
    ? (phaseSkewTraceIds ??
      new Set(getLocalPhaseSkewTraceIndex(elements).keys()))
    : undefined
  const pairElements: PcbTrace[] = []
  const highlightedElements: PcbTrace[] = []
  const nonHighlightedElements: PcbTrace[] = []
  for (const element of traceElements) {
    if (pairTraceIds?.has(element.pcb_trace_id)) {
      pairElements.push(element)
    } else if (highlightedElementIds.has(element.pcb_trace_id)) {
      highlightedElements.push(element)
    } else {
      nonHighlightedElements.push(element)
    }
  }

  const clipContextElements = getTraceClipContextElements(
    elements,
    showCopperPours,
  )
  const phaseSkewElements = showDifferentialPairPhaseSkew
    ? elements.filter(
        (element) => element.type === "pcb_differential_pair_phase_skew",
      )
    : []

  if (nonHighlightedElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(nonHighlightedElements, {
      layers,
      clipContextElements,
    })
  }

  if (pairElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.configure({ colorOverrides: UNKNOWN_PHASE_SKEW_COLOR_MAP })
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements([...pairElements, ...phaseSkewElements], {
      layers,
      clipContextElements,
      showDifferentialPairPhaseSkew,
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
