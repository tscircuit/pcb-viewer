/** An RGB colour with 0–255 channels. */
type Rgb = [red: number, green: number, blue: number]

/** Colour where the two traces are in step (KiCad's default zero-skew colour). */
const ZERO_SKEW_COLOR: Rgb = [255, 255, 255]

/** Colour where this trace has run farther than its partner (KiCad's default positive-skew colour). */
const POSITIVE_SKEW_COLOR: Rgb = [0, 0, 255]

/** Colour where this trace has run less far than its partner (KiCad's default negative-skew colour). */
const NEGATIVE_SKEW_COLOR: Rgb = [255, 0, 0]

/** Colour where skew is unknown because the traces have not run together yet or have stopped doing so. */
export const UNKNOWN_SKEW_COLOR = "rgb(128, 128, 128)"

/**
 * Full-scale positive and negative skew magnitudes for one trace, in mm.
 * KiCad scales positive skew against the trace's maximum and negative skew
 * against its minimum independently.
 */
export type SkewScale = {
  positive: number
  negative: number
}

/**
 * KiCad's default local-skew colour: opaque white at zero skew, linearly
 * blended to pure blue for positive skew (this trace is longer than its
 * partner) or pure red for negative skew (shorter), and 50% grey when
 * unknown. Values beyond `fullScale` clamp to the full colour; a zero
 * `fullScale` saturates any non-zero skew.
 */
export function skewColor({
  skew,
  fullScale,
}: {
  skew: number | null
  /** Skew magnitude, in mm, that reaches full blue or red, or per-sign scales from `LocalSkewTrace.scale`. */
  fullScale: number | SkewScale
}): string {
  if (skew === null) return UNKNOWN_SKEW_COLOR
  if (skew === 0) return toCss(ZERO_SKEW_COLOR)

  const limit =
    typeof fullScale === "number"
      ? fullScale
      : skew > 0
        ? fullScale.positive
        : fullScale.negative
  const fraction = limit > 0 ? Math.min(1, Math.abs(skew) / limit) : 1
  const target = skew > 0 ? POSITIVE_SKEW_COLOR : NEGATIVE_SKEW_COLOR
  return toCss(
    ZERO_SKEW_COLOR.map((channel, index) =>
      Math.round(blend({ from: channel, to: target[index], fraction })),
    ) as Rgb,
  )
}

/** A channel value `fraction` of the way from `from` to `to`. */
function blend({
  from,
  to,
  fraction,
}: {
  from: number
  to: number
  fraction: number
}): number {
  return from + (to - from) * fraction
}

/** Formats a colour for CSS and SVG. */
function toCss([red, green, blue]: Rgb): string {
  return `rgb(${red}, ${green}, ${blue})`
}
