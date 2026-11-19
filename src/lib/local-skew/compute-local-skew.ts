import type { Point } from "@tscircuit/math-utils"
import type {
  CircuitJson,
  LayerRef,
  PcbTrace,
  SourceBus,
  SourceTrace,
} from "circuit-json"
import { type CoupledRun, findCoupledRuns } from "./find-coupled-runs"
import { type TraceStep, walkTrace } from "./walk-trace"

/** Overlay pieces are at most this long, in mm, so skew ramps look smooth (same as KiCad). */
const SAMPLE_LENGTH = 0.05

/** Skew is rounded to this, in mm, so equal traces don't flicker between colours. */
const SKEW_RESOLUTION = 1e-5

/** Cross-product tolerance, in mm², for treating two pieces as one straight line. */
const STRAIGHT_TOLERANCE = 1e-9

/** Without a declared gap, assume one trace width of copper between the pair. */
const UNSET_GAP_WIDTHS = 1

/** A piece of one trace of a pair, with the local skew at its middle. */
export type LocalSkewSegment = {
  start: Point
  end: Point
  layer: LayerRef
  width: number
  /**
   * How much farther this trace has travelled than its partner at this
   * point, in mm. `null` before the traces first run together and after
   * they last do.
   */
  skew: number | null
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
  /** Largest local skew anywhere on the pair, in mm. */
  max_skew: number
  /** The pair's `maxLengthSkew`, in mm, when one is set. */
  max_length_skew?: number
}

/** A distance along a trace where the local skew is known. */
type KnownSkew = { distance: number; skew: number }

/**
 * Computes local skew along every routed differential pair: at each point,
 * how far one trace is ahead of the other, not only at the ends.
 */
export function computeLocalSkew(circuitJson: CircuitJson): LocalSkewPair[] {
  const pairs: LocalSkewPair[] = []
  for (const element of circuitJson) {
    if (element.type !== "source_bus") continue
    if (!element.differential_pair) continue
    const pair = computePairSkew({ circuitJson, bus: element })
    if (pair) pairs.push(pair)
  }
  return pairs
}

/** Local skew for one differential pair, or null if it isn't routed as two single traces. */
function computePairSkew({
  circuitJson,
  bus,
}: {
  circuitJson: CircuitJson
  bus: SourceBus
}): LocalSkewPair | null {
  const differentialPair = bus.differential_pair
  if (!differentialPair) return null

  const positiveTrace = singlePcbTrace({
    circuitJson,
    sourceTraceId: differentialPair.positive_source_trace_id,
  })
  const negativeTrace = singlePcbTrace({
    circuitJson,
    sourceTraceId: differentialPair.negative_source_trace_id,
  })
  if (!positiveTrace || !negativeTrace) return null

  const positiveSteps = walkTrace({ trace: positiveTrace, reverse: false })
  let negativeSteps = walkTrace({ trace: negativeTrace, reverse: false })
  if (positiveSteps.length === 0 || negativeSteps.length === 0) return null
  if (isWalkedBackwards({ positiveSteps, negativeSteps })) {
    negativeSteps = walkTrace({ trace: negativeTrace, reverse: true })
  }

  const traceGap =
    differentialPair.trace_gap ?? positiveSteps[0].width * UNSET_GAP_WIDTHS
  const runs = findCoupledRuns({
    positive: positiveSteps,
    negative: negativeSteps,
    traceGap,
  })

  const pair: LocalSkewPair = {
    source_bus_id: bus.source_bus_id,
    name: bus.name,
    positive: {
      pcb_trace_id: positiveTrace.pcb_trace_id,
      segments: sampleSkew({
        steps: positiveSteps,
        known: knownSkews({ runs, side: "positive" }),
      }),
    },
    negative: {
      pcb_trace_id: negativeTrace.pcb_trace_id,
      segments: sampleSkew({
        steps: negativeSteps,
        known: knownSkews({ runs, side: "negative" }),
      }),
    },
    max_skew: Math.max(0, ...runs.map((run) => Math.abs(run.skew))),
  }
  if (bus.max_length_skew !== undefined) {
    pair.max_length_skew = bus.max_length_skew
  }
  return pair
}

/**
 * The routed copper for a source trace. Pairs split over several pcb_traces
 * are skipped, because their order along the signal is not recorded.
 */
function singlePcbTrace({
  circuitJson,
  sourceTraceId,
}: {
  circuitJson: CircuitJson
  sourceTraceId: SourceTrace["source_trace_id"]
}): PcbTrace | null {
  const traces = circuitJson.filter(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" && element.source_trace_id === sourceTraceId,
  )
  if (traces.length !== 1) return null
  return traces[0]
}

/** True when the negative walk starts at the positive walk's far end. */
function isWalkedBackwards({
  positiveSteps,
  negativeSteps,
}: {
  positiveSteps: TraceStep[]
  negativeSteps: TraceStep[]
}): boolean {
  const positiveStart = positiveSteps[0].start
  const positiveEnd = positiveSteps[positiveSteps.length - 1].end
  const negativeStart = negativeSteps[0].start
  const negativeEnd = negativeSteps[negativeSteps.length - 1].end
  const sameDirection =
    distanceBetween(positiveStart, negativeStart) +
    distanceBetween(positiveEnd, negativeEnd)
  const oppositeDirection =
    distanceBetween(positiveStart, negativeEnd) +
    distanceBetween(positiveEnd, negativeStart)
  return oppositeDirection < sameDirection
}

/** Straight-line distance between two points. */
function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Where each coupled run starts and ends on one trace, sorted along that trace. */
function knownSkews({
  runs,
  side,
}: {
  runs: CoupledRun[]
  side: "positive" | "negative"
}): KnownSkew[] {
  const known: KnownSkew[] = []
  for (const run of runs) {
    if (side === "positive") {
      known.push({ distance: run.positiveStart, skew: run.skew })
      known.push({ distance: run.positiveEnd, skew: run.skew })
      continue
    }
    known.push({ distance: run.negativeStart, skew: -run.skew })
    known.push({ distance: run.negativeEnd, skew: -run.skew })
  }
  return known.sort((a, b) => a.distance - b.distance)
}

/** Cuts each step into short pieces and gives each the skew at its middle. */
function sampleSkew({
  steps,
  known,
}: {
  steps: TraceStep[]
  known: KnownSkew[]
}): LocalSkewSegment[] {
  const segments: LocalSkewSegment[] = []
  for (const step of steps) {
    const pieceCount = Math.max(1, Math.ceil(step.length / SAMPLE_LENGTH))
    for (let i = 0; i < pieceCount; i++) {
      const startFraction = i / pieceCount
      const endFraction = (i + 1) / pieceCount
      const midDistance =
        step.startDistance + ((startFraction + endFraction) / 2) * step.length
      const segment: LocalSkewSegment = {
        start: pointAlong({ step, fraction: startFraction }),
        end: pointAlong({ step, fraction: endFraction }),
        layer: step.layer,
        width: step.width,
        skew: skewAt({ known, distance: midDistance }),
      }
      appendOrExtend({ segments, segment })
    }
  }
  return segments
}

/**
 * The local skew at a distance along a trace, interpolated between known
 * points. `null` outside the first and last known points.
 */
function skewAt({
  known,
  distance,
}: {
  known: KnownSkew[]
  distance: number
}): number | null {
  if (known.length === 0) return null
  const first = known[0]
  const last = known[known.length - 1]
  if (distance < first.distance || distance > last.distance) return null

  for (let i = 0; i + 1 < known.length; i++) {
    const before = known[i]
    const after = known[i + 1]
    if (distance > after.distance) continue
    const span = after.distance - before.distance
    if (span === 0) return roundSkew(after.skew)
    const t = (distance - before.distance) / span
    return roundSkew(before.skew + t * (after.skew - before.skew))
  }
  return roundSkew(last.skew)
}

/** Rounds skew to {@link SKEW_RESOLUTION}. */
function roundSkew(skew: number): number {
  const rounded = Math.round(skew / SKEW_RESOLUTION) * SKEW_RESOLUTION
  // Negating a zero skew for the negative trace gives -0; report it as 0.
  if (rounded === 0) return 0
  return rounded
}

/** The point at a fraction of the way along a step. */
function pointAlong({
  step,
  fraction,
}: {
  step: TraceStep
  fraction: number
}): Point {
  return {
    x: step.start.x + (step.end.x - step.start.x) * fraction,
    y: step.start.y + (step.end.y - step.start.y) * fraction,
  }
}

/** Adds a segment, or lengthens the previous one when it continues it with the same skew. */
function appendOrExtend({
  segments,
  segment,
}: {
  segments: LocalSkewSegment[]
  segment: LocalSkewSegment
}): void {
  const previous = segments[segments.length - 1]
  const continuesPrevious =
    previous !== undefined &&
    previous.skew === segment.skew &&
    previous.layer === segment.layer &&
    previous.width === segment.width &&
    previous.end.x === segment.start.x &&
    previous.end.y === segment.start.y &&
    isSameDirection({ previous, segment })
  if (!continuesPrevious) {
    segments.push(segment)
    return
  }
  previous.end = segment.end
}

/** True when two segments point the same way, so joining them keeps the corner. */
function isSameDirection({
  previous,
  segment,
}: {
  previous: LocalSkewSegment
  segment: LocalSkewSegment
}): boolean {
  const cross =
    (previous.end.x - previous.start.x) * (segment.end.y - segment.start.y) -
    (previous.end.y - previous.start.y) * (segment.end.x - segment.start.x)
  return Math.abs(cross) < STRAIGHT_TOLERANCE
}
