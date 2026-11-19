import type { Point } from "@tscircuit/math-utils"
import {
  type CandidateRun,
  type CoupledRun,
  MIN_OVERLAP,
  selectCoupledRuns,
} from "./select-coupled-runs"
import { buildStepGrid, stepsNear } from "./step-grid"
import type { TraceStep } from "./walk-trace"

/** Steps closer to parallel than about 0.8° count as running together. */
const PARALLEL_COSINE = 0.9999

/** Allow 20% more than the nominal centreline spacing before the traces stop counting as coupled. */
const SPACING_ALLOWANCE = 1.2

/** Without a declared gap, traces count as coupled up to this many trace widths apart, centre to centre. */
const UNSET_GAP_REACH_WIDTHS = 10

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

/**
 * Finds where the two traces run parallel on the same layer within the
 * pair's spacing. Each stretch of copper is matched to at most one stretch
 * of its partner, and the matches keep route order on both traces.
 */
export function findCoupledRuns({
  positive,
  negative,
  traceGap,
}: {
  positive: TraceStep[]
  negative: TraceStep[]
  /** Edge-to-edge copper gap, in mm. Without it, any spacing up to {@link UNSET_GAP_REACH_WIDTHS} widths counts. */
  traceGap: number | undefined
}): CoupledRun[] {
  const widest = widestStep({ steps: positive.concat(negative) })
  let reach = widest * UNSET_GAP_REACH_WIDTHS
  if (traceGap !== undefined) reach = (traceGap + widest) * SPACING_ALLOWANCE

  const candidates: CandidateRun[] = []
  for (const pair of findParallelPairs({ positive, negative, reach })) {
    let maxOffset = reach
    if (traceGap !== undefined) {
      maxOffset =
        (traceGap + (pair.positiveStep.width + pair.negativeStep.width) / 2) *
        SPACING_ALLOWANCE
    }
    const candidate = clipToSpacing({ pair, maxOffset })
    if (candidate) candidates.push(candidate)
  }
  return selectCoupledRuns(candidates)
}

/** Every same-layer, same-direction step pair near enough for the grid to find. */
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

      const negativeStartAlong = along({
        direction,
        origin: positiveStep.start,
        point: negativeStep.start,
      })
      const negativeEndAlong = along({
        direction,
        origin: positiveStep.start,
        point: negativeStep.end,
      })
      // Cheap reject before building a pair: the steps don't overlap at all.
      if (negativeEndAlong <= 0 || negativeStartAlong >= positiveStep.length) {
        continue
      }
      pairs.push({
        positiveStep,
        negativeStep,
        negativeStartAlong,
        negativeEndAlong,
        negativeStartOffset: across({
          direction,
          origin: positiveStep.start,
          point: negativeStep.start,
        }),
        negativeEndOffset: across({
          direction,
          origin: positiveStep.start,
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

/** The widest copper among the steps, in mm. */
function widestStep({ steps }: { steps: TraceStep[] }): number {
  let widest = 0
  for (const step of steps) widest = Math.max(widest, step.width)
  return widest
}

/** How far `point` lies along the line through `origin` along `direction`, in mm. */
function along({
  direction,
  origin,
  point,
}: {
  /** Unit vector of the line. */
  direction: Point
  /** A point on the line. */
  origin: Point
  point: Point
}): number {
  return direction.x * (point.x - origin.x) + direction.y * (point.y - origin.y)
}

/** Signed distance of `point` from the line through `origin` along `direction`, in mm. */
function across({
  direction,
  origin,
  point,
}: {
  /** Unit vector of the line. */
  direction: Point
  /** A point on the line. */
  origin: Point
  point: Point
}): number {
  return direction.x * (point.y - origin.y) - direction.y * (point.x - origin.x)
}

/** The unit vector pointing along a step. */
function unitDirection(step: TraceStep): Point {
  return {
    x: (step.end.x - step.start.x) / step.length,
    y: (step.end.y - step.start.y) / step.length,
  }
}
