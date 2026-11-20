import type { Point } from "@tscircuit/math-utils"
import type {
  CircuitJson,
  LayerRef,
  PcbTrace,
  SourceBus,
  SourceTrace,
} from "circuit-json"
import { findCoupledRuns } from "./find-coupled-runs"
import { isNegativeRouteReversed } from "./is-negative-route-reversed"
import { type CoupledRun, MIN_OVERLAP } from "./select-coupled-runs"
import {
  type TraceStep,
  type TraceWalk,
  reverseWalk,
  walkTrace,
} from "./walk-trace"

/** Skew ramps are cut into pieces at most this long, in mm, so they look smooth. */
const SAMPLE_LENGTH = 0.05

/** Ramps are not cut finer than this change in skew, in mm (1 µm, the readout precision). */
const SKEW_STEP = 0.001

/** Skew is rounded to 1/this mm (10 nm), so equal traces don't flicker between colours. */
const SKEW_ROUNDING = 1e5

/** Coordinates and widths beyond this many mm (10 m) are corrupt; such pairs are skipped. */
const MAX_COORDINATE = 1e4

/**
 * How a piece's skew is known:
 * - `coupled`: measured, because the traces run side by side here.
 * - `interpolated`: estimated between two coupled stretches.
 * - `unknown`: before the traces first run together or after they last do.
 */
export type SkewCoupling = "coupled" | "interpolated" | "unknown"

/** A piece of one trace of a pair, with the local skew at its middle. */
export type LocalSkewSegment = {
  start: Point
  end: Point
  layer: LayerRef
  width: number
  /**
   * How much farther this trace has run than its partner at this point, in
   * mm. Positive means this trace is longer so far. `null` when unknown.
   */
  skew: number | null
  coupling: SkewCoupling
}

/** The overlay pieces for one trace of a pair. */
export type LocalSkewTrace = {
  pcb_trace_id: PcbTrace["pcb_trace_id"]
  segments: LocalSkewSegment[]
}

/** Local skew along both traces of one differential pair. */
export type LocalSkewPair = {
  source_bus_id: SourceBus["source_bus_id"]
  name?: string
  positive: LocalSkewTrace
  negative: LocalSkewTrace
  /** Largest measured local skew on the pair, in mm. `null` if the traces never run together. */
  max_skew: number | null
  /** The pair's `maxLengthSkew`, in mm, when one is set. */
  max_length_skew?: number
}

/** A stretch of one trace with skew changing linearly from `startSkew` to `endSkew`. */
type SkewSpan = {
  from: number
  to: number
  startSkew: number | null
  endSkew: number | null
  coupling: SkewCoupling
}

/** Routed copper grouped by the source trace it belongs to. */
type TracesBySource = Map<SourceTrace["source_trace_id"], PcbTrace[]>

/**
 * Computes local skew along every routed differential pair: at each point,
 * how much farther one trace has run than the other, not only at the ends.
 *
 * Distances are copper length as in `pcb_trace.trace_length` (planar
 * length plus a fixed length per via), measured from the positive trace's
 * first route point. The negative trace is walked from the end that
 * matches it.
 */
export function computeLocalSkew(circuitJson: CircuitJson): LocalSkewPair[] {
  const tracesBySource: TracesBySource = new Map()
  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") continue
    if (element.source_trace_id === undefined) continue
    const traces = tracesBySource.get(element.source_trace_id) ?? []
    traces.push(element)
    tracesBySource.set(element.source_trace_id, traces)
  }

  const pairs: LocalSkewPair[] = []
  for (const element of circuitJson) {
    if (element.type !== "source_bus") continue
    const pair = computePairSkew({ bus: element, tracesBySource })
    if (pair) pairs.push(pair)
  }
  return pairs
}

/**
 * Local skew for one differential pair. Null when the bus isn't a pair of
 * two different traces each routed as one pcb_trace (the order of split
 * pieces along the signal isn't recorded), or when a route is empty or has
 * non-finite or absurd geometry.
 */
function computePairSkew({
  bus,
  tracesBySource,
}: {
  bus: SourceBus
  tracesBySource: TracesBySource
}): LocalSkewPair | null {
  const differentialPair = bus.differential_pair
  if (!differentialPair) return null
  const positiveId = differentialPair.positive_source_trace_id
  const negativeId = differentialPair.negative_source_trace_id
  if (positiveId === negativeId) return null

  const positiveTraces = tracesBySource.get(positiveId) ?? []
  const negativeTraces = tracesBySource.get(negativeId) ?? []
  if (positiveTraces.length !== 1 || negativeTraces.length !== 1) return null
  const positiveTrace = positiveTraces[0]
  const negativeTrace = negativeTraces[0]

  const positive = walkTrace(positiveTrace)
  if (!isMeasurable(positive)) return null
  let negative = walkTrace(negativeTrace)
  if (!isMeasurable(negative)) return null
  if (
    isNegativeRouteReversed({
      positiveSteps: positive.steps,
      negativeSteps: negative.steps,
    })
  ) {
    negative = reverseWalk(negative)
  }
  const runs = findCoupledRuns({
    positive: positive.steps,
    negative: negative.steps,
    traceGap: differentialPair.trace_gap,
  })

  const positiveSpans = skewSpans({
    runs,
    side: "positive",
    steps: positive.steps,
    partnerSteps: negative.steps,
    length: positive.length,
  })
  const negativeSpans = skewSpans({
    runs,
    side: "negative",
    steps: negative.steps,
    partnerSteps: positive.steps,
    length: negative.length,
  })

  const pair: LocalSkewPair = {
    source_bus_id: bus.source_bus_id,
    name: bus.name,
    positive: {
      pcb_trace_id: positiveTrace.pcb_trace_id,
      segments: sampleSkew({ steps: positive.steps, spans: positiveSpans }),
    },
    negative: {
      pcb_trace_id: negativeTrace.pcb_trace_id,
      segments: sampleSkew({ steps: negative.steps, spans: negativeSpans }),
    },
    max_skew: maxSkew({
      runs,
      spans: positiveSpans.concat(negativeSpans),
    }),
  }
  if (bus.max_length_skew !== undefined) {
    pair.max_length_skew = bus.max_length_skew
  }
  return pair
}

/** True when a walk has copper, a finite length, and every coordinate and width within {@link MAX_COORDINATE}. */
function isMeasurable(walk: TraceWalk): boolean {
  if (walk.steps.length === 0 || !Number.isFinite(walk.length)) return false
  return walk.steps.every((step) =>
    [step.start.x, step.start.y, step.end.x, step.end.y, step.width].every(
      (value) => Math.abs(value) <= MAX_COORDINATE,
    ),
  )
}

/** Largest known skew across the pair's spans, in mm, or null without coupled runs. */
function maxSkew({
  runs,
  spans,
}: {
  runs: CoupledRun[]
  spans: SkewSpan[]
}): number | null {
  if (runs.length === 0) return null
  let largest = 0
  for (const span of spans) {
    if (span.startSkew === null || span.endSkew === null) continue
    largest = Math.max(
      largest,
      Math.abs(span.startSkew),
      Math.abs(span.endSkew),
    )
  }
  return roundSkew(largest)
}

/**
 * Covers one whole trace with spans: unknown before the first coupled run
 * and after the last, coupled runs as measured, and interpolated between
 * consecutive runs. When a coupled run begins or ends right at a via, the
 * via length steps at the via instead of ramping across the uncoupled
 * stretch. The negative side reports the negated skew.
 */
function skewSpans({
  runs,
  side,
  steps,
  partnerSteps,
  length: totalLength,
}: {
  runs: CoupledRun[]
  side: "positive" | "negative"
  steps: TraceStep[]
  partnerSteps: TraceStep[]
  /** The trace's walk length, in mm. */
  length: number
}): SkewSpan[] {
  const coupled = runs
    .map((run) => {
      const from = side === "positive" ? run.positiveStart : run.negativeStart
      const to = side === "positive" ? run.positiveEnd : run.negativeEnd
      const otherFrom =
        side === "positive" ? run.negativeStart : run.positiveStart
      const otherTo = side === "positive" ? run.negativeEnd : run.positiveEnd
      return {
        from,
        to,
        otherFrom,
        otherTo,
        startSkew: from - otherFrom,
        endSkew: to - otherTo,
        startVia: viaAt({
          steps,
          distance: from,
          edge: "start",
        }),
        endVia: viaAt({
          steps,
          distance: to,
          edge: "end",
        }),
        otherStartVia: viaAt({
          steps: partnerSteps,
          distance: otherFrom,
          edge: "start",
        }),
        otherEndVia: viaAt({
          steps: partnerSteps,
          distance: otherTo,
          edge: "end",
        }),
      }
    })
    .sort((a, b) => a.from - b.from)

  if (coupled.length === 0) {
    return [unknownSpan({ from: 0, to: totalLength })]
  }
  const spans: SkewSpan[] = []
  // Gaps under MIN_OVERLAP are rounding at shared corners, not stretches.
  if (coupled[0].from > MIN_OVERLAP) {
    spans.push(unknownSpan({ from: 0, to: coupled[0].from }))
  }
  coupled.forEach((run, index) => {
    const previous = coupled[index - 1]
    if (previous) {
      const gapFrom = previous.to + previous.endVia
      const gapTo = run.from - run.startVia
      if (gapTo - gapFrom > MIN_OVERLAP) {
        // If the partner had only a single via between the two runs, that via
        // was already accounted for at `previous.otherEndVia`.
        const partnerHasCopperGap =
          run.otherFrom - (previous.otherTo + previous.otherEndVia) >
          MIN_OVERLAP
        const otherStartVia = partnerHasCopperGap ? run.otherStartVia : 0
        spans.push({
          from: gapFrom,
          to: gapTo,
          startSkew: previous.endSkew + previous.endVia - previous.otherEndVia,
          endSkew: run.startSkew - run.startVia + otherStartVia,
          coupling: "interpolated",
        })
      }
    }
    spans.push({
      from: run.from,
      to: run.to,
      startSkew: run.startSkew,
      endSkew: run.endSkew,
      coupling: "coupled",
    })
  })
  const lastCoupled = coupled[coupled.length - 1]
  if (totalLength - lastCoupled.to > MIN_OVERLAP) {
    spans.push(unknownSpan({ from: lastCoupled.to, to: totalLength }))
  }
  return spans
}

/** Length of any via directly before the start or after the end of a step at `distance`, in mm. */
function viaAt({
  steps,
  distance,
  edge,
}: {
  steps: TraceStep[]
  distance: number
  edge: "start" | "end"
}): number {
  const position = (step: TraceStep) =>
    edge === "start" ? step.startDistance : step.startDistance + step.length
  const viaLength = (step: TraceStep) =>
    edge === "start" ? step.startViaLength : step.endViaLength

  let low = 0
  let high = steps.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (position(steps[middle]) < distance - MIN_OVERLAP) {
      low = middle + 1
      continue
    }
    high = middle
  }
  for (
    let index = low;
    index < steps.length && position(steps[index]) <= distance + MIN_OVERLAP;
    index++
  ) {
    const length = viaLength(steps[index])
    if (length > 0) return length
  }
  return 0
}

/** A span with no skew information. */
function unknownSpan({ from, to }: { from: number; to: number }): SkewSpan {
  return { from, to, startSkew: null, endSkew: null, coupling: "unknown" }
}

/**
 * Cuts the steps at span boundaries. Constant pieces stay whole; pieces
 * where skew changes are cut every {@link SAMPLE_LENGTH} mm, or every
 * {@link SKEW_STEP} mm of skew if that is coarser, each with the skew at its
 * middle.
 */
function sampleSkew({
  steps,
  spans,
}: {
  steps: TraceStep[]
  spans: SkewSpan[]
}): LocalSkewSegment[] {
  const segments: LocalSkewSegment[] = []
  let spanIndex = 0
  for (const step of steps) {
    const stepEnd = step.startDistance + step.length
    while (
      spanIndex + 1 < spans.length &&
      spans[spanIndex].to <= step.startDistance
    ) {
      spanIndex++
    }
    for (
      let index = spanIndex;
      index < spans.length && spans[index].from < stepEnd;
      index++
    ) {
      const span = spans[index]
      const from = Math.max(step.startDistance, span.from)
      const to = Math.min(stepEnd, span.to)
      if (to - from <= MIN_OVERLAP) continue

      const pieceCount = rampPieceCount({ span, from, to })
      for (let piece = 0; piece < pieceCount; piece++) {
        const pieceFrom = from + ((to - from) * piece) / pieceCount
        const pieceTo = from + ((to - from) * (piece + 1)) / pieceCount
        segments.push({
          start: pointAt({ step, distance: pieceFrom }),
          end: pointAt({ step, distance: pieceTo }),
          layer: step.layer,
          width: step.width,
          skew: skewAt({ span, distance: (pieceFrom + pieceTo) / 2 }),
          coupling: span.coupling,
        })
      }
    }
  }
  return segments
}

/** How many pieces to cut a ramp between `from` and `to` into; 1 when skew barely changes. */
function rampPieceCount({
  span,
  from,
  to,
}: {
  span: SkewSpan
  from: number
  to: number
}): number {
  const startSkew = skewAt({ span, distance: from })
  const endSkew = skewAt({ span, distance: to })
  if (startSkew === null || endSkew === null) return 1
  const byLength = Math.ceil((to - from) / SAMPLE_LENGTH)
  const bySkew = Math.ceil(Math.abs(endSkew - startSkew) / SKEW_STEP)
  return Math.max(1, Math.min(byLength, bySkew))
}

/** The skew at a distance inside a span, rounded. */
function skewAt({
  span,
  distance,
}: {
  span: SkewSpan
  distance: number
}): number | null {
  if (span.startSkew === null || span.endSkew === null) return null
  const t = (distance - span.from) / (span.to - span.from)
  return roundSkew(span.startSkew + t * (span.endSkew - span.startSkew))
}

/** Rounds skew to 1/{@link SKEW_ROUNDING} mm, reporting -0 as 0. */
function roundSkew(skew: number): number {
  const rounded = Math.round(skew * SKEW_ROUNDING) / SKEW_ROUNDING
  if (rounded === 0) return 0
  return rounded
}

/** The point on a step at a distance along the whole walk. */
function pointAt({
  step,
  distance,
}: {
  step: TraceStep
  distance: number
}): Point {
  const fraction = (distance - step.startDistance) / step.length
  return {
    x: step.start.x + (step.end.x - step.start.x) * fraction,
    y: step.start.y + (step.end.y - step.start.y) * fraction,
  }
}
