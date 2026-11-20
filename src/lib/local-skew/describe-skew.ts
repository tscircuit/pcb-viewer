import type {
  PcbDifferentialPairLocalSkew,
  PcbLocalSkewSegment,
} from "circuit-json"

/** Decimal places shown for skew in mm (1 µm). */
const READOUT_DECIMALS = 3

/** The hover readout for a segment, e.g. "USB: 1.236 mm longer than its partner (measured) · max 1.236 mm · limit 0.100 mm". */
export function describeSkew({
  pair,
  name,
  segment,
}: {
  pair: Pick<PcbDifferentialPairLocalSkew, "max_local_skew" | "max_length_skew">
  name?: string
  segment: Pick<PcbLocalSkewSegment, "local_skew" | "coupling">
}): string {
  let local = "skew unknown (traces not running together)"
  if (segment.local_skew !== undefined) {
    let source = "measured"
    if (segment.coupling === "interpolated") source = "interpolated"
    local = `in step with its partner (${source})`
    const size = formatMm(Math.abs(segment.local_skew))
    if (size !== formatMm(0)) {
      let comparison = "longer than"
      if (segment.local_skew < 0) comparison = "shorter than"
      local = `${size} ${comparison} its partner (${source})`
    }
  }

  let description = `${name ?? "Pair"}: ${local}`
  if (pair.max_local_skew !== undefined) {
    description += ` · max ${formatMm(pair.max_local_skew)}`
  }
  if (pair.max_length_skew !== undefined) {
    description += ` · limit ${formatMm(pair.max_length_skew)}`
  }
  return description
}

/** Formats a non-negative length in mm at the readout precision. */
function formatMm(mm: number): string {
  return `${mm.toFixed(READOUT_DECIMALS)} mm`
}
