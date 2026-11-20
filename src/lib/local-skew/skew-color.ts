/** An RGB colour with 0–255 channels. */
type Rgb = [red: number, green: number, blue: number]

/** Colour where the two traces are in step. */
const IN_STEP_COLOR: Rgb = [46, 204, 113]

/** Colour where this trace has run farther than its partner. */
const LONGER_COLOR: Rgb = [255, 77, 77]

/** Colour where this trace has run less far than its partner. */
const SHORTER_COLOR: Rgb = [77, 141, 255]

/** Colour where skew is unknown because the traces don't run together. */
export const UNKNOWN_SKEW_COLOR = "rgb(136, 136, 136)"

/**
 * Brightness of estimated (interpolated) skew relative to measured. Dimmed
 * rather than made translucent, so the copper beneath can't shift its hue.
 */
const ESTIMATE_BRIGHTNESS = 0.55

/**
 * The overlay colour for a local skew: it blends from the in-step colour
 * to the longer or shorter colour, reaching it at `fullScale` mm. A zero
 * `fullScale` (a zero-skew limit) gives the full colour for any skew.
 * Estimates are drawn darker.
 */
export function skewColor({
  skew,
  fullScale,
  isEstimate = false,
}: {
  skew: number | null
  /** Skew, in mm, that gets the full longer or shorter colour. */
  fullScale: number
  isEstimate?: boolean
}): string {
  if (skew === null) return UNKNOWN_SKEW_COLOR

  let fraction = 1
  if (fullScale > 0) fraction = Math.min(1, Math.abs(skew) / fullScale)
  if (skew === 0) fraction = 0
  let target = SHORTER_COLOR
  if (skew > 0) target = LONGER_COLOR
  let brightness = 1
  if (isEstimate) brightness = ESTIMATE_BRIGHTNESS
  return toCss(
    IN_STEP_COLOR.map((channel, index) =>
      Math.round(
        brightness * blend({ from: channel, to: target[index], fraction }),
      ),
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

/** Without a `maxLengthSkew`, colours saturate at the pair's largest skew but never below this, in mm. */
const MIN_FULL_SCALE = 0.05

/**
 * The skew, in mm, drawn with the full longer or shorter colour: the
 * pair's `maxLengthSkew` when set, so full colour means the limit is reached,
 * otherwise its largest skew, floored so tiny skews don't look alarming.
 */
export function fullScaleFor({
  maxLengthSkew,
  maxSkew,
}: {
  maxLengthSkew: number | undefined
  maxSkew: number | null
}): number {
  if (maxLengthSkew !== undefined) return maxLengthSkew
  return Math.max(MIN_FULL_SCALE, maxSkew ?? 0)
}
