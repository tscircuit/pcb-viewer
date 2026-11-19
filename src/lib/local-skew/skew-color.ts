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
 * The overlay colour for a local skew: it blends from the in-step colour
 * to the longer or shorter colour, reaching it at `fullScale` mm. A zero
 * `fullScale` (a zero-skew limit) gives the full colour for any skew.
 */
export function skewColor({
  skew,
  fullScale,
}: {
  skew: number | null
  /** Skew, in mm, that gets the full longer or shorter colour. */
  fullScale: number
}): string {
  if (skew === null) return UNKNOWN_SKEW_COLOR
  if (skew === 0) return toCss(IN_STEP_COLOR)

  let fraction = 1
  if (fullScale > 0) fraction = Math.min(1, Math.abs(skew) / fullScale)
  let target = SHORTER_COLOR
  if (skew > 0) target = LONGER_COLOR
  return toCss([
    blend({ from: IN_STEP_COLOR[0], to: target[0], fraction }),
    blend({ from: IN_STEP_COLOR[1], to: target[1], fraction }),
    blend({ from: IN_STEP_COLOR[2], to: target[2], fraction }),
  ])
}

/** A channel value `fraction` of the way from `from` to `to`, rounded. */
function blend({
  from,
  to,
  fraction,
}: {
  from: number
  to: number
  fraction: number
}): number {
  return Math.round(from + (to - from) * fraction)
}

/** Formats a colour for CSS and SVG. */
function toCss([red, green, blue]: Rgb): string {
  return `rgb(${red}, ${green}, ${blue})`
}
