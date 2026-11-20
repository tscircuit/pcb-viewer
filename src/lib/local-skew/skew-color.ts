import color from "color"

const DEFAULT_COLORS = {
  zero: "rgb(255, 255, 255)",
  positive: "rgb(0, 0, 255)",
  negative: "rgb(255, 0, 0)",
  unknown: "rgb(128, 128, 128)",
}

export type LocalSkewColors = Partial<typeof DEFAULT_COLORS>

const ZERO_SKEW_THRESHOLD = 0.0005
const MIN_COLOR_SCALE = 0.001

/** Full colour at the larger of the per-sign peak and 0.001 mm.
 * Magnitudes below 0.0005 mm paint as zero skew. */
export function skewColor({
  skew,
  positiveScale,
  negativeScale,
  colors,
  useLogScale,
}: {
  skew?: number
  positiveScale: number
  negativeScale: number
  colors?: LocalSkewColors
  useLogScale?: boolean
}): string {
  if (skew === undefined) return colors?.unknown ?? DEFAULT_COLORS.unknown

  const zero = colors?.zero ?? DEFAULT_COLORS.zero
  const magnitude = Math.abs(skew)
  if (magnitude < ZERO_SKEW_THRESHOLD) return zero

  const sign = skew > 0 ? "positive" : "negative"
  const limit = Math.max(
    MIN_COLOR_SCALE,
    skew > 0 ? positiveScale : negativeScale,
  )
  // Keep the ramp continuous at the one-micron floor.
  const rampMagnitude =
    magnitude < MIN_COLOR_SCALE
      ? 2 * (magnitude - ZERO_SKEW_THRESHOLD)
      : magnitude
  const fraction = Math.min(1, rampMagnitude / limit)
  const weight = useLogScale
    ? Math.log1p(9 * fraction) / Math.log(10)
    : fraction
  return color(zero)
    .mix(color(colors?.[sign] ?? DEFAULT_COLORS[sign]), weight)
    .rgb()
    .round()
    .string()
}
