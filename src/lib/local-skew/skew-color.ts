/** An RGB colour with 0–255 channels. */
type Rgb = [red: number, green: number, blue: number]

/** Colour where the two traces are in step (KiCad's default zero-skew colour). */
const ZERO_SKEW_COLOR: Rgb = [255, 255, 255]

/** Colour where this trace has run farther than its partner (KiCad's default positive-skew colour). */
const POSITIVE_SKEW_COLOR: Rgb = [0, 0, 255]

/** Colour where this trace has run less far than its partner (KiCad's default negative-skew colour). */
const NEGATIVE_SKEW_COLOR: Rgb = [255, 0, 0]

/** Overlay stroke width relative to the trace, matching KiCad's 1.1× inflation. */
export const OVERLAY_WIDTH_FACTOR = 1.1

/** Colour where skew is unknown because the traces have not run together yet or have stopped doing so. */
export const UNKNOWN_SKEW_COLOR = "rgb(128, 128, 128)"

/**
 * Skew magnitudes below this, in mm (half of the 1 µm / 3-decimal readout
 * precision), format as `0.000 mm` ("in step") and paint white instead of
 * saturating against a sub-micron scale.
 */
const ZERO_SKEW_THRESHOLD = 0.0005

/** Minimum full-scale magnitude for each sign, in mm (1 µm). */
const MIN_COLOR_SCALE = 0.001

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
 * KiCad's default local-skew colour: opaque white at zero skew (including
 * magnitudes through {@link ZERO_SKEW_THRESHOLD}),
 * linearly blended to pure blue for positive skew (this trace is longer than
 * its partner) or pure red for negative skew (shorter), and 50% grey when
 * unknown. The first micron ramps from white after the display threshold.
 * Each sign's full scale is floored at 1 µm and larger values saturate.
 */
export function skewColor({
  skew,
  fullScale,
}: {
  skew: number | null
  /** Per-sign full-scale skew magnitudes, in mm, from `LocalSkewTrace.scale`. */
  fullScale: SkewScale
}): string {
  if (skew === null) return UNKNOWN_SKEW_COLOR
  const magnitude = Math.abs(skew)
  if (magnitude <= ZERO_SKEW_THRESHOLD) return toCss(ZERO_SKEW_COLOR)

  const limit = Math.max(
    MIN_COLOR_SCALE,
    skew > 0 ? fullScale.positive : fullScale.negative,
  )
  const rampMagnitude =
    magnitude < MIN_COLOR_SCALE
      ? MIN_COLOR_SCALE *
        ((magnitude - ZERO_SKEW_THRESHOLD) /
          (MIN_COLOR_SCALE - ZERO_SKEW_THRESHOLD))
      : magnitude
  const fraction = Math.min(1, rampMagnitude / limit)
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
