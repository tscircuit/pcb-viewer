import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkewTrace,
  PcbRenderLayer,
  PcbTrace,
} from "circuit-json"
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

// The renderer scales each sign to its peak. Treat sub-micron differences
// as white so a nearly matched pair cannot saturate a color by itself.
const PHASE_SKEW_DISPLAY_RESOLUTION_MM = 0.001

function getDisplayedPhaseSkewMm(differenceMm: number, sign: 1 | -1): number {
  return Math.abs(differenceMm) < PHASE_SKEW_DISPLAY_RESOLUTION_MM
    ? 0
    : sign * differenceMm
}

function getDisplayedPhaseSkewTrace(
  trace: PcbDifferentialPairPhaseSkewTrace,
  sign: 1 | -1,
): PcbDifferentialPairPhaseSkewTrace {
  return {
    ...trace,
    segments: trace.segments.map((segment) => ({
      ...segment,
      start_length_difference_mm: getDisplayedPhaseSkewMm(
        segment.start_length_difference_mm,
        sign,
      ),
      end_length_difference_mm: getDisplayedPhaseSkewMm(
        segment.end_length_difference_mm,
        sign,
      ),
    })),
  }
}

export function drawPcbTraceElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
  showCopperPours,
  showDifferentialPairPhaseSkew = false,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
  showCopperPours: boolean
  showDifferentialPairPhaseSkew?: boolean
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

  const clipContextElements = getTraceClipContextElements(
    elements,
    showCopperPours,
  )

  if (nonHighlightedElements.length > 0) {
    const elementsToDraw = showDifferentialPairPhaseSkew
      ? [
          ...nonHighlightedElements,
          ...elements.flatMap((element) => {
            if (element.type !== "pcb_differential_pair_phase_skew") return []
            return [
              {
                ...element,
                positive_trace: getDisplayedPhaseSkewTrace(
                  element.positive_trace,
                  1,
                ),
                negative_trace: getDisplayedPhaseSkewTrace(
                  element.negative_trace,
                  -1,
                ),
              },
            ]
          }),
        ]
      : nonHighlightedElements
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(elementsToDraw, {
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

export function drawPcbTracesOnCopperLayers({
  copperLayers,
  ...traceDrawing
}: Omit<
  Parameters<typeof drawPcbTraceElementsForLayer>[0],
  "canvas" | "layers"
> & {
  copperLayers: Array<{
    canvas?: HTMLCanvasElement
    copperLayer: PcbRenderLayer
  }>
}) {
  for (const { canvas, copperLayer } of copperLayers) {
    if (!canvas) continue
    drawPcbTraceElementsForLayer({
      ...traceDrawing,
      canvas,
      layers: [copperLayer],
    })
  }
}
