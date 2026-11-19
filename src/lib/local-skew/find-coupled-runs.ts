import type { Point } from "@tscircuit/math-utils"
import type { TraceStep } from "./walk-trace"

/** Steps closer to parallel than about 0.8° count as running together (same threshold as KiCad). */
const PARALLEL_COSINE = 0.9999

/** Allow 20% more than the nominal centreline spacing before the traces stop counting as coupled. */
const SPACING_ALLOWANCE = 1.2

/** Overlaps shorter than this, in mm, are rounding noise at shared corners. */
const MIN_OVERLAP = 1e-6

/**
 * A stretch where the two traces of a pair run side by side. Distances are
 * measured along each trace from its source end, in mm.
 */
export type CoupledRun = {
  positiveStart: number
  positiveEnd: number
  negativeStart: number
  negativeEnd: number
  /** How much farther the positive trace has travelled than the negative one, in mm. */
  skew: number
}

/**
 * Finds where the positive and negative traces run parallel on the same
 * layer within the pair's spacing. Both walks must start at the source end.
 */
export function findCoupledRuns({
  positive,
  negative,
  traceGap,
}: {
  positive: TraceStep[]
  negative: TraceStep[]
  /** Edge-to-edge copper gap of the pair, in mm. */
  traceGap: number
}): CoupledRun[] {
  const runs: CoupledRun[] = []
  for (const positiveStep of positive) {
    for (const negativeStep of negative) {
      const run = coupledRunBetween({ positiveStep, negativeStep, traceGap })
      if (run) runs.push(run)
    }
  }
  return runs.sort((a, b) => a.positiveStart - b.positiveStart)
}

/** The part of two steps that runs side by side, or null if they are not coupled. */
function coupledRunBetween({
  positiveStep,
  negativeStep,
  traceGap,
}: {
  positiveStep: TraceStep
  negativeStep: TraceStep
  traceGap: number
}): CoupledRun | null {
  if (positiveStep.layer !== negativeStep.layer) return null

  const direction = unitDirection(positiveStep)
  const negativeDirection = unitDirection(negativeStep)
  const cosine =
    direction.x * negativeDirection.x + direction.y * negativeDirection.y
  // Signed on purpose: steps running in opposite directions are not coupled.
  if (cosine < PARALLEL_COSINE) return null

  const negativeMid = {
    x: (negativeStep.start.x + negativeStep.end.x) / 2,
    y: (negativeStep.start.y + negativeStep.end.y) / 2,
  }
  const offset = Math.abs(
    direction.x * (negativeMid.y - positiveStep.start.y) -
      direction.y * (negativeMid.x - positiveStep.start.x),
  )
  const maxOffset =
    (traceGap + (positiveStep.width + negativeStep.width) / 2) *
    SPACING_ALLOWANCE
  if (offset > maxOffset) return null

  // Project the negative step onto the positive step's axis.
  const negativeStartAlong =
    direction.x * (negativeStep.start.x - positiveStep.start.x) +
    direction.y * (negativeStep.start.y - positiveStep.start.y)
  const negativeEndAlong = negativeStartAlong + negativeStep.length
  const overlapStart = Math.max(0, negativeStartAlong)
  const overlapEnd = Math.min(positiveStep.length, negativeEndAlong)
  if (overlapEnd - overlapStart <= MIN_OVERLAP) return null

  const positiveStart = positiveStep.startDistance + overlapStart
  const negativeStart =
    negativeStep.startDistance + (overlapStart - negativeStartAlong)
  return {
    positiveStart,
    positiveEnd: positiveStep.startDistance + overlapEnd,
    negativeStart,
    negativeEnd: negativeStep.startDistance + (overlapEnd - negativeStartAlong),
    skew: positiveStart - negativeStart,
  }
}

/** The unit vector pointing along a step. */
function unitDirection(step: TraceStep): Point {
  return {
    x: (step.end.x - step.start.x) / step.length,
    y: (step.end.y - step.start.y) / step.length,
  }
}
