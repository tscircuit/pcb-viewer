import type {
  AnyCircuitElement,
  PcbCopperPour,
  PcbRenderLayer,
  PcbTrace,
} from "circuit-json"
import {
  drawPcbTrace,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import { normalizeCopperRenderLayers } from "./copper-layers"
import { getCopperPourPath } from "./get-copper-pour-path"
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

  for (const targetLayer of targetLayers) {
    const pours = clipContextElements.filter(
      (e): e is PcbCopperPour =>
        e.type === "pcb_copper_pour" && e.layer === targetLayer,
    )
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const scratch = pours.length ? getScratchCanvas(canvas) : canvas
    const target = scratch.getContext("2d")
    if (!target) return
    for (const [traces, colorMap] of [
      [nonHighlightedElements, DEFAULT_PCB_COLOR_MAP],
      [highlightedElements, HOVER_COLOR_MAP],
    ] as const) {
      if (!traces.length) continue
      if (scratch !== canvas)
        target.clearRect(0, 0, scratch.width, scratch.height)
      for (const trace of traces)
        drawPcbTrace({
          ctx: target,
          trace,
          realToCanvasMat,
          colorMap,
          layer: targetLayer,
        })
      if (scratch !== canvas) {
        // Erase pours from the isolated traces, preserving other artwork on
        // the destination canvas. Cached paths include the camera's linear
        // transform; only translation changes during a pan.
        target.save()
        target.globalCompositeOperation = "destination-out"
        target.fillStyle = "black"
        target.setTransform(1, 0, 0, 1, realToCanvasMat.e, realToCanvasMat.f)
        for (const pour of pours)
          target.fill(
            getCopperPourPath(pour, realToCanvasMat),
            pour.shape === "brep" ? "evenodd" : "nonzero",
          )
        target.restore()
        ctx.save()
        ctx.globalCompositeOperation = "source-over"
        // Copy pixels directly. Creating a CanvasPattern here repeatedly
        // copies/filter-prepares a full surface in some canvas engines.
        ctx.drawImage(scratch, 0, 0)
        ctx.restore()
      }
    }
  }
}

// Retain at most one scratch surface per visible canvas, instead of allocating
// one for every layer and every highlight update. Resizing clears its pixels.
const scratchCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()
function getScratchCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  let scratch = scratchCanvases.get(canvas)
  if (!scratch) {
    // The constructor fallback supports canvas implementations without a DOM.
    const CanvasConstructor = canvas.constructor as {
      new (width: number, height: number): HTMLCanvasElement
    }
    scratch = canvas.ownerDocument
      ? canvas.ownerDocument.createElement("canvas")
      : new CanvasConstructor(canvas.width, canvas.height)
    scratchCanvases.set(canvas, scratch)
  }
  if (scratch.width !== canvas.width) scratch.width = canvas.width
  if (scratch.height !== canvas.height) scratch.height = canvas.height
  return scratch
}
