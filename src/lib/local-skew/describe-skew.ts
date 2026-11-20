import type {
  PcbDifferentialPairLocalSkew,
  PcbLocalSkewSegment,
} from "circuit-json"

/** Decimal places shown for skew in mm (1 µm). */
const READOUT_DECIMALS = 3

/** The hover readout for a segment, e.g. "USB: local skew 1.236 mm · max 1.236 mm · end-to-end limit 0.100 mm". */
export function describeSkew({
  pair,
  name,
  segment,
}: {
  pair: Pick<PcbDifferentialPairLocalSkew, "max_local_skew" | "max_length_skew">
  name?: string
  segment: Pick<PcbLocalSkewSegment, "local_skew">
}): string {
  let local = "unknown"
  if (segment.local_skew !== undefined) local = formatMm(segment.local_skew)

  let description = `${name ?? "Pair"}: local skew ${local}`
  if (pair.max_local_skew !== undefined) {
    description += ` · max ${formatMm(pair.max_local_skew)}`
  }
  if (pair.max_length_skew !== undefined) {
    description += ` · end-to-end limit ${formatMm(pair.max_length_skew)}`
  }
  return description
}

/** Formats a length in mm at the readout precision, never as "-0.000 mm". */
function formatMm(mm: number): string {
  const text = mm.toFixed(READOUT_DECIMALS)
  if (Number(text) === 0) return `${(0).toFixed(READOUT_DECIMALS)} mm`
  return `${text} mm`
}
