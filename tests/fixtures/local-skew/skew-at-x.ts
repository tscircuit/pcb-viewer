import type { LocalSkewSegment } from "../../../src/lib/local-skew/compute-local-skew"

/** The skew of the straight horizontal overlay segment that covers `x`. */
export function skewAtX({
  segments,
  x,
}: {
  segments: LocalSkewSegment[]
  x: number
}): number | null | undefined {
  const segment = segments.find(
    (candidate) =>
      candidate.start.y === candidate.end.y &&
      Math.min(candidate.start.x, candidate.end.x) <= x &&
      Math.max(candidate.start.x, candidate.end.x) >= x,
  )
  return segment?.skew
}
