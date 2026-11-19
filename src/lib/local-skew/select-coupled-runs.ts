/** Overlaps shorter than this, in mm, are rounding noise at shared corners. */
export const MIN_OVERLAP = 1e-6

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

/** A coupled run before selection, with how far apart its traces are. */
export type CandidateRun = CoupledRun & {
  /** Distance between the traces at the middle of the run, in mm. */
  offset: number
}

/** A stretch of distance along one trace, in mm. */
type Interval = { start: number; end: number }

/** Which candidates claim a contested stretch first. */
type Priority = "nearest" | "longest"

/**
 * Chooses which candidate runs to keep: the selection that couples the
 * most length, trying nearest-first and longest-first priority (nearest
 * wins ties). Longest-first stops a short, nearer pass, such as a trace
 * doubling back, from breaking up a long pass that keeps route order.
 */
export function selectCoupledRuns(candidates: CandidateRun[]): CoupledRun[] {
  const nearest = selectWithPriority({ candidates, priority: "nearest" })
  const longest = selectWithPriority({ candidates, priority: "longest" })
  if (coupledLength(longest) > coupledLength(nearest) + MIN_OVERLAP) {
    return longest
  }
  return nearest
}

/**
 * In priority order, trims each candidate to the stretches of both traces
 * that no earlier candidate has used, then keeps the longest set of pieces
 * that keeps route order on both traces.
 */
function selectWithPriority({
  candidates,
  priority,
}: {
  candidates: CandidateRun[]
  priority: Priority
}): CoupledRun[] {
  const pieces = trimInOrder({ candidates, priority })
  return longestOrderedChain(pieces).map(({ offset: _offset, ...run }) => run)
}

/** Total length of the positive trace covered by runs, in mm. */
function coupledLength(runs: CoupledRun[]): number {
  let length = 0
  for (const run of runs) length += run.positiveEnd - run.positiveStart
  return length
}

/** Trims candidates in priority order so no stretch of either trace is used twice. */
function trimInOrder({
  candidates,
  priority,
}: {
  candidates: CandidateRun[]
  priority: Priority
}): CandidateRun[] {
  const order = candidates
    .map((_, index) => index)
    .sort((a, b) => {
      const first = candidates[a]
      const second = candidates[b]
      if (priority === "longest") {
        const byLength =
          second.positiveEnd -
          second.positiveStart -
          (first.positiveEnd - first.positiveStart)
        if (byLength !== 0) return byLength
      }
      return (
        first.offset - second.offset ||
        first.positiveStart - second.positiveStart
      )
    })
  const usedPositive: Interval[] = []
  const usedNegative: Interval[] = []
  const pieces: CandidateRun[] = []
  for (const index of order) {
    const run = candidates[index]
    for (const free of freeParts({ run, usedPositive, usedNegative })) {
      pieces.push(free)
      insertInterval({
        intervals: usedPositive,
        interval: { start: free.positiveStart, end: free.positiveEnd },
      })
      insertInterval({
        intervals: usedNegative,
        interval: { start: free.negativeStart, end: free.negativeEnd },
      })
    }
  }
  return pieces
}

/** The parts of `run` whose positive and negative stretches are both unused. */
function freeParts({
  run,
  usedPositive,
  usedNegative,
}: {
  run: CandidateRun
  usedPositive: Interval[]
  usedNegative: Interval[]
}): CandidateRun[] {
  // Work in positive-trace distance; the negative side maps onto it linearly.
  const negativePerPositive =
    (run.negativeEnd - run.negativeStart) /
    (run.positiveEnd - run.positiveStart)
  const blocked = overlapping({
    intervals: usedPositive,
    interval: { start: run.positiveStart, end: run.positiveEnd },
  })
  for (const used of overlapping({
    intervals: usedNegative,
    interval: { start: run.negativeStart, end: run.negativeEnd },
  })) {
    blocked.push({
      start:
        run.positiveStart +
        (used.start - run.negativeStart) / negativePerPositive,
      end:
        run.positiveStart +
        (used.end - run.negativeStart) / negativePerPositive,
    })
  }
  blocked.sort((a, b) => a.start - b.start)

  const parts: CandidateRun[] = []
  let cursor = run.positiveStart
  for (const cut of blocked) {
    if (cut.start - cursor > MIN_OVERLAP) {
      parts.push(sliceRun({ run, from: cursor, to: cut.start }))
    }
    cursor = Math.max(cursor, cut.end)
  }
  if (run.positiveEnd - cursor > MIN_OVERLAP) {
    parts.push(sliceRun({ run, from: cursor, to: run.positiveEnd }))
  }
  return parts
}

/**
 * The longest total positive length of pieces that keep route order on
 * both traces, found with a Fenwick tree over negative-trace order.
 */
function longestOrderedChain(pieces: CandidateRun[]): CandidateRun[] {
  const byPositive = [...pieces].sort(
    (a, b) => a.positiveStart - b.positiveStart,
  )
  // Pieces never share a stretch of either trace, so ordering by start is enough.
  const negativeRank = new Map<CandidateRun, number>()
  ;[...pieces]
    .sort((a, b) => a.negativeStart - b.negativeStart)
    .forEach((piece, rank) => negativeRank.set(piece, rank + 1))

  const bestTotal: number[] = []
  const previous: number[] = []
  const tree = new Array<number>(pieces.length + 1).fill(-1)
  byPositive.forEach((piece, index) => {
    const rank = negativeRank.get(piece) ?? 0
    const before = bestBefore({ tree, totals: bestTotal, rank })
    const length = piece.positiveEnd - piece.positiveStart
    let total = length
    if (before >= 0) total += bestTotal[before]
    bestTotal.push(total)
    previous.push(before)
    for (let at = rank; at < tree.length; at += at & -at) {
      if (tree[at] < 0 || bestTotal[tree[at]] < bestTotal[index]) {
        tree[at] = index
      }
    }
  })

  let best = -1
  bestTotal.forEach((total, index) => {
    if (best < 0 || total > bestTotal[best]) best = index
  })
  const chain: CandidateRun[] = []
  for (let index = best; index >= 0; index = previous[index]) {
    chain.push(byPositive[index])
  }
  return chain.reverse()
}

/** Index of the best chain ending at a negative rank below `rank`, or -1. */
function bestBefore({
  tree,
  totals,
  rank,
}: {
  tree: number[]
  totals: number[]
  rank: number
}): number {
  let best = -1
  for (let at = rank - 1; at > 0; at -= at & -at) {
    const candidate = tree[at]
    if (candidate < 0) continue
    if (best < 0 || totals[candidate] > totals[best]) best = candidate
  }
  return best
}

/** Intervals in a sorted, non-overlapping list that overlap `interval`. */
function overlapping({
  intervals,
  interval,
}: {
  intervals: Interval[]
  interval: Interval
}): Interval[] {
  const found: Interval[] = []
  for (
    let index = firstEndingAfter({ intervals, position: interval.start });
    index < intervals.length && intervals[index].start < interval.end;
    index++
  ) {
    found.push(intervals[index])
  }
  return found
}

/** Adds an interval to a sorted, non-overlapping list, keeping it sorted. */
function insertInterval({
  intervals,
  interval,
}: {
  intervals: Interval[]
  interval: Interval
}): void {
  intervals.splice(
    firstEndingAfter({ intervals, position: interval.start }),
    0,
    interval,
  )
}

/** Index of the first interval that ends after `position` (binary search). */
function firstEndingAfter({
  intervals,
  position,
}: {
  intervals: Interval[]
  position: number
}): number {
  let low = 0
  let high = intervals.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (intervals[middle].end <= position) {
      low = middle + 1
      continue
    }
    high = middle
  }
  return low
}

/** The part of a run between two positive-trace distances, with skews interpolated. */
function sliceRun({
  run,
  from,
  to,
}: {
  run: CandidateRun
  from: number
  to: number
}): CandidateRun {
  const span = run.positiveEnd - run.positiveStart
  const negativeSpan = run.negativeEnd - run.negativeStart
  const negativeStart =
    run.negativeStart + (negativeSpan * (from - run.positiveStart)) / span
  const negativeEnd =
    run.negativeStart + (negativeSpan * (to - run.positiveStart)) / span
  return {
    positiveStart: from,
    positiveEnd: to,
    negativeStart,
    negativeEnd,
    startSkew: from - negativeStart,
    endSkew: to - negativeEnd,
    offset: run.offset,
  }
}
