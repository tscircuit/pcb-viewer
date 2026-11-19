import type { Point } from "@tscircuit/math-utils"
import { buildStepGrid, stepsNear } from "./step-grid"
import type { TraceStep } from "./walk-trace"

/** Steps closer to parallel than about 0.8° count as running together. */
const PARALLEL_COSINE = 0.9999

/** Allow 20% more than the nominal centreline spacing before the traces stop counting as coupled. */
const SPACING_ALLOWANCE = 1.2

/** Overlaps shorter than this, in mm, are rounding noise at shared corners. */
const MIN_OVERLAP = 1e-6

/** Without a declared gap, look for a partner up to this many trace widths away. */
const UNSET_GAP_REACH_WIDTHS = 10

/**
 * A stretch where the two traces of a pair run side by side. Distances are
 * measured along each walk from its first point, in mm.
 */
export type CoupledRun = {
  positiveStart: number
  positiveEnd: number
  negativeStart: number
  negativeEnd: number
  /** How much farther the positive trace has run than the negative one at the run's start, in mm. */
  startSkew: number
  /** The same at the run's end. It differs from `startSkew` when the traces are not exactly parallel. */
  endSkew: number
}

/** A positive and a negative step that run parallel, with the negative step placed in the positive step's frame. */
type ParallelPair = {
  positiveStep: TraceStep
  negativeStep: TraceStep
  /** Where the negative step's ends fall along the positive step, in mm from its start. */
  negativeStartAlong: number
  negativeEndAlong: number
  /** Signed distances of the negative step's ends from the positive step's centreline, in mm. */
  negativeStartOffset: number
  negativeEndOffset: number
}

/** A coupled run and how far apart its traces are, for choosing between competing runs. */
type CandidateRun = CoupledRun & { offset: number }

/**
 * Finds where the two traces run parallel on the same layer within the
 * pair's spacing. Each stretch of copper is matched to at most one stretch
 * of its partner, preferring the nearest, and matches keep route order.
 */
export function findCoupledRuns({
  positive,
  negative,
  traceGap,
}: {
  positive: TraceStep[]
  negative: TraceStep[]
  /** Edge-to-edge copper gap, in mm. Without it, the nearest parallel spacing is used. */
  traceGap: number | undefined
}): CoupledRun[] {
  const widest = widestStep([...positive, ...negative])
  let reach = widest * UNSET_GAP_REACH_WIDTHS
  if (traceGap !== undefined) reach = (traceGap + widest) * SPACING_ALLOWANCE

  const pairs = findParallelPairs({ positive, negative, reach })
  let nearestSpacing = Number.POSITIVE_INFINITY
  for (const pair of pairs) {
    nearestSpacing = Math.min(nearestSpacing, midOffset(pair))
  }

  const candidates: CandidateRun[] = []
  for (const pair of pairs) {
    let maxOffset = nearestSpacing * SPACING_ALLOWANCE
    if (traceGap !== undefined) {
      maxOffset =
        (traceGap + (pair.positiveStep.width + pair.negativeStep.width) / 2) *
        SPACING_ALLOWANCE
    }
    const candidate = clipToSpacing({ pair, maxOffset })
    if (candidate) candidates.push(candidate)
  }
  return selectOneToOne(candidates)
}

/** Every same-layer, same-direction step pair whose spans overlap within `reach`. */
function findParallelPairs({
  positive,
  negative,
  reach,
}: {
  positive: TraceStep[]
  negative: TraceStep[]
  reach: number
}): ParallelPair[] {
  const grid = buildStepGrid({ steps: negative, reach })
  const pairs: ParallelPair[] = []
  for (const positiveStep of positive) {
    const direction = unitDirection(positiveStep)
    for (const negativeStep of stepsNear({ grid, step: positiveStep })) {
      if (negativeStep.layer !== positiveStep.layer) continue
      const negativeDirection = unitDirection(negativeStep)
      // Signed on purpose: steps running in opposite directions are not coupled.
      const cosine =
        direction.x * negativeDirection.x + direction.y * negativeDirection.y
      if (cosine < PARALLEL_COSINE) continue

      const startAlong = along({
        step: positiveStep,
        point: negativeStep.start,
      })
      const endAlong = along({ step: positiveStep, point: negativeStep.end })
      if (endAlong <= 0 || startAlong >= positiveStep.length) continue

      pairs.push({
        positiveStep,
        negativeStep,
        negativeStartAlong: startAlong,
        negativeEndAlong: endAlong,
        negativeStartOffset: across({
          step: positiveStep,
          point: negativeStep.start,
        }),
        negativeEndOffset: across({
          step: positiveStep,
          point: negativeStep.end,
        }),
      })
    }
  }
  return pairs
}

/**
 * The part of a parallel pair where the traces overlap and stay within
 * `maxOffset` of each other, with the skew at each end. Null if none.
 */
function clipToSpacing({
  pair,
  maxOffset,
}: {
  pair: ParallelPair
  maxOffset: number
}): CandidateRun | null {
  const {
    positiveStep,
    negativeStep,
    negativeStartAlong,
    negativeEndAlong,
    negativeStartOffset,
    negativeEndOffset,
  } = pair
  let from = Math.max(0, negativeStartAlong)
  let to = Math.min(positiveStep.length, negativeEndAlong)

  // The offset changes linearly along the step; keep where |offset| <= maxOffset.
  const offsetSlope =
    (negativeEndOffset - negativeStartOffset) /
    (negativeEndAlong - negativeStartAlong)
  if (offsetSlope === 0 && Math.abs(negativeStartOffset) > maxOffset) {
    return null
  }
  if (offsetSlope !== 0) {
    const atPlus =
      negativeStartAlong + (maxOffset - negativeStartOffset) / offsetSlope
    const atMinus =
      negativeStartAlong + (-maxOffset - negativeStartOffset) / offsetSlope
    from = Math.max(from, Math.min(atPlus, atMinus))
    to = Math.min(to, Math.max(atPlus, atMinus))
  }
  if (to - from <= MIN_OVERLAP) return null

  const positiveStart = positiveStep.startDistance + from
  const positiveEnd = positiveStep.startDistance + to
  const negativeStart = negativeDistanceAt({ pair, position: from })
  const negativeEnd = negativeDistanceAt({ pair, position: to })
  return {
    positiveStart,
    positiveEnd,
    negativeStart,
    negativeEnd,
    startSkew: positiveStart - negativeStart,
    endSkew: positiveEnd - negativeEnd,
    offset: Math.abs(
      negativeStartOffset +
        offsetSlope * ((from + to) / 2 - negativeStartAlong),
    ),
  }
}

/**
 * Takes candidates nearest first, trimming each to the parts of both traces
 * no nearer candidate has used, then keeps the runs that stay in route
 * order on both traces.
 */
function selectOneToOne(candidates: CandidateRun[]): CoupledRun[] {
  const nearestFirst = [...candidates].sort(
    (a, b) => a.offset - b.offset || a.positiveStart - b.positiveStart,
  )
  const accepted: CandidateRun[] = []
  for (const candidate of nearestFirst) {
    accepted.push(...unusedParts({ candidate, accepted }))
  }

  accepted.sort((a, b) => a.positiveStart - b.positiveStart)
  const ordered: CoupledRun[] = []
  for (const { offset: _offset, ...run } of accepted) {
    const previous = ordered[ordered.length - 1]
    if (previous && run.negativeStart < previous.negativeEnd - MIN_OVERLAP) {
      continue
    }
    ordered.push(run)
  }
  return ordered
}

/**
 * The pieces of `candidate` whose positive and negative stretches are not
 * already used by an accepted run.
 */
function unusedParts({
  candidate,
  accepted,
}: {
  candidate: CandidateRun
  accepted: CandidateRun[]
}): CandidateRun[] {
  // Work in positive-trace distance; the negative side maps onto it linearly.
  const negativePerPositive =
    (candidate.negativeEnd - candidate.negativeStart) /
    (candidate.positiveEnd - candidate.positiveStart)
  const used: Interval[] = []
  for (const run of accepted) {
    const touchesPositive =
      run.positiveEnd > candidate.positiveStart &&
      run.positiveStart < candidate.positiveEnd
    const touchesNegative =
      run.negativeEnd > candidate.negativeStart &&
      run.negativeStart < candidate.negativeEnd
    if (!touchesPositive && !touchesNegative) continue
    used.push({ start: run.positiveStart, end: run.positiveEnd })
    const mappedStart =
      candidate.positiveStart +
      (run.negativeStart - candidate.negativeStart) / negativePerPositive
    const mappedEnd =
      candidate.positiveStart +
      (run.negativeEnd - candidate.negativeStart) / negativePerPositive
    used.push({ start: mappedStart, end: mappedEnd })
  }

  const free = subtractIntervals({
    from: { start: candidate.positiveStart, end: candidate.positiveEnd },
    remove: used,
  })
  return free.map((piece) =>
    sliceRun({ candidate, from: piece.start, to: piece.end }),
  )
}

/** A stretch of distance along a trace, in mm. */
type Interval = { start: number; end: number }

/** What is left of `from` after removing every interval in `remove`, keeping pieces longer than {@link MIN_OVERLAP}. */
function subtractIntervals({
  from,
  remove,
}: {
  from: Interval
  remove: Interval[]
}): Interval[] {
  let pieces: Interval[] = [from]
  for (const cut of remove) {
    const next: Interval[] = []
    for (const piece of pieces) {
      if (cut.end <= piece.start || cut.start >= piece.end) {
        next.push(piece)
        continue
      }
      next.push({ start: piece.start, end: Math.max(piece.start, cut.start) })
      next.push({ start: Math.min(piece.end, cut.end), end: piece.end })
    }
    pieces = next.filter((piece) => piece.end - piece.start > MIN_OVERLAP)
  }
  return pieces
}

/** The part of a candidate between two positive-trace distances, with skews interpolated. */
function sliceRun({
  candidate,
  from,
  to,
}: {
  candidate: CandidateRun
  from: number
  to: number
}): CandidateRun {
  const span = candidate.positiveEnd - candidate.positiveStart
  const startFraction = (from - candidate.positiveStart) / span
  const endFraction = (to - candidate.positiveStart) / span
  const negativeSpan = candidate.negativeEnd - candidate.negativeStart
  const negativeStart = candidate.negativeStart + negativeSpan * startFraction
  const negativeEnd = candidate.negativeStart + negativeSpan * endFraction
  return {
    positiveStart: from,
    positiveEnd: to,
    negativeStart,
    negativeEnd,
    startSkew: from - negativeStart,
    endSkew: to - negativeEnd,
    offset: candidate.offset,
  }
}

/**
 * Distance along the negative walk to the point of the negative step that
 * sits beside `position` on the positive step.
 */
function negativeDistanceAt({
  pair,
  position,
}: {
  pair: ParallelPair
  /** Position along the positive step, in mm from its start. */
  position: number
}): number {
  const fraction =
    (position - pair.negativeStartAlong) /
    (pair.negativeEndAlong - pair.negativeStartAlong)
  return pair.negativeStep.startDistance + pair.negativeStep.length * fraction
}

/** Distance between the traces at the middle of their shared span, in mm. */
function midOffset(pair: ParallelPair): number {
  return Math.abs((pair.negativeStartOffset + pair.negativeEndOffset) / 2)
}

/** The widest copper among the steps, in mm. */
function widestStep(steps: TraceStep[]): number {
  let widest = 0
  for (const step of steps) widest = Math.max(widest, step.width)
  return widest
}

/** How far `point` lies along `step`'s direction from its start, in mm. */
function along({ step, point }: { step: TraceStep; point: Point }): number {
  const direction = unitDirection(step)
  return (
    direction.x * (point.x - step.start.x) +
    direction.y * (point.y - step.start.y)
  )
}

/** Signed distance of `point` from `step`'s centreline, in mm. */
function across({ step, point }: { step: TraceStep; point: Point }): number {
  const direction = unitDirection(step)
  return (
    direction.x * (point.y - step.start.y) -
    direction.y * (point.x - step.start.x)
  )
}

/** The unit vector pointing along a step. */
function unitDirection(step: TraceStep): Point {
  return {
    x: (step.end.x - step.start.x) / step.length,
    y: (step.end.y - step.start.y) / step.length,
  }
}
