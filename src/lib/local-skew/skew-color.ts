/** An RGB colour with 0–255 channels. */
type Rgb = [red: number, green: number, blue: number]

/** Colour where the two traces are in step. */
const IN_STEP_COLOR: Rgb = [46, 204, 113]

/** Colour where this trace has travelled farther than its partner. */
const AHEAD_COLOR: Rgb = [255, 77, 77]

/** Colour where this trace has travelled less far than its partner. */
const BEHIND_COLOR: Rgb = [77, 141, 255]

/** Colour where the traces don't run together, so skew is unknown. */
export const UNKNOWN_SKEW_COLOR = "rgb(136, 136, 136)"

/**
 * The overlay colour for a local skew. It blends from the in-step colour to
 * the ahead or behind colour, reaching it at `fullScale` mm of skew.
 */
export function skewColor({
  skew,
  fullScale,
}: {
  skew: number | null
  /** Skew, in mm, that gets the full ahead or behind colour. */
  fullScale: number
}): string {
  if (skew === null) return UNKNOWN_SKEW_COLOR
  if (skew === 0 || fullScale <= 0) return toCss(IN_STEP_COLOR)

  const fraction = Math.min(1, Math.abs(skew) / fullScale)
  let target = BEHIND_COLOR
  if (skew > 0) target = AHEAD_COLOR
  return toCss([
    blend(IN_STEP_COLOR[0], target[0], fraction),
    blend(IN_STEP_COLOR[1], target[1], fraction),
    blend(IN_STEP_COLOR[2], target[2], fraction),
  ])
}

/** A channel value `fraction` of the way from `from` to `to`, rounded. */
function blend(from: number, to: number, fraction: number): number {
  return Math.round(from + (to - from) * fraction)
}

/** Formats a colour for CSS and SVG. */
function toCss([red, green, blue]: Rgb): string {
  return `rgb(${red}, ${green}, ${blue})`
}
