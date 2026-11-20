import type { PcbDifferentialPairLocalSkew } from "circuit-json"
import color from "color"

/** A colour as red, green and blue channels from 0 to 255. */
export type Rgb = [red: number, green: number, blue: number]

/** The colours local skew is painted with: zero skew, the two signs, and unknown skew. */
export type SkewPalette = {
  zero: Rgb
  positive: Rgb
  negative: Rgb
  unknown: Rgb
}

/** Viewer colour overrides, as CSS colour strings. */
export type LocalSkewColors = Partial<Record<keyof SkewPalette, string>>

/** KiCad's differential phase skew colours. */
const DEFAULT_PALETTE: SkewPalette = {
  zero: [255, 255, 255],
  positive: [0, 0, 255],
  negative: [255, 0, 0],
  unknown: [128, 128, 128],
}

/** Skew below this magnitude reads as 0.000 mm and paints as zero skew, in mm. */
const ZERO_SKEW_THRESHOLD = 0.0005
/** Full colour is never reached below this skew, in mm (1 µm). */
const MIN_COLOR_SCALE = 0.001
/** The logarithmic scale maps 0–1 onto 0–1 as log base 10 of (1 + 9x). */
const LOG_SCALE_BASE = 10

/**
 * The palette for one pair. Each colour comes from the viewer's `colors`, then
 * the pair's stored colour, then KiCad's default; a string that does not
 * parse is skipped. Canvas and WebGPU both paint from this palette.
 */
export function resolveSkewPalette({
  colors,
  pair,
}: {
  colors?: LocalSkewColors
  pair?: Pick<
    PcbDifferentialPairLocalSkew,
    "positive_skew_color" | "negative_skew_color"
  >
}): SkewPalette {
  return {
    zero: firstParsedColor({
      candidates: [colors?.zero],
      fallback: DEFAULT_PALETTE.zero,
    }),
    positive: firstParsedColor({
      candidates: [colors?.positive, pair?.positive_skew_color],
      fallback: DEFAULT_PALETTE.positive,
    }),
    negative: firstParsedColor({
      candidates: [colors?.negative, pair?.negative_skew_color],
      fallback: DEFAULT_PALETTE.negative,
    }),
    unknown: firstParsedColor({
      candidates: [colors?.unknown],
      fallback: DEFAULT_PALETTE.unknown,
    }),
  }
}

/** The first candidate that parses as a colour, else `fallback`. */
function firstParsedColor({
  candidates,
  fallback,
}: {
  candidates: Array<string | undefined>
  fallback: Rgb
}): Rgb {
  for (const candidate of candidates) {
    if (candidate === undefined) continue
    const rgb = parseColor(candidate)
    if (rgb) return rgb
  }
  return fallback
}

/** A CSS colour string as RGB, or undefined when the `color` package cannot parse it. */
function parseColor(value: string): Rgb | undefined {
  try {
    const [red, green, blue] = color(value).rgb().round().array()
    return [red, green, blue]
  } catch {
    return undefined
  }
}

/**
 * The colour for a skew value: zero colour below 0.0005 mm, then a blend
 * toward the sign's colour that is full at the larger of the trace's peak
 * for that sign and 0.001 mm.
 */
export function skewColor({
  skew,
  positiveScale,
  negativeScale,
  palette,
  useLogScale,
}: {
  skew?: number
  positiveScale: number
  negativeScale: number
  palette: SkewPalette
  useLogScale?: boolean
}): Rgb {
  if (skew === undefined) return palette.unknown
  const magnitude = Math.abs(skew)
  if (magnitude < ZERO_SKEW_THRESHOLD) return palette.zero

  let target = palette.positive
  let peak = positiveScale
  if (skew < 0) {
    target = palette.negative
    peak = negativeScale
  }
  const limit = Math.max(MIN_COLOR_SCALE, peak)
  // Below 1 µm the ramp starts at the zero threshold so it stays continuous.
  let rampMagnitude = magnitude
  if (magnitude < MIN_COLOR_SCALE) {
    rampMagnitude =
      ((magnitude - ZERO_SKEW_THRESHOLD) * MIN_COLOR_SCALE) /
      (MIN_COLOR_SCALE - ZERO_SKEW_THRESHOLD)
  }
  const fraction = Math.min(1, rampMagnitude / limit)
  let weight = fraction
  if (useLogScale) {
    weight =
      Math.log1p((LOG_SCALE_BASE - 1) * fraction) / Math.log(LOG_SCALE_BASE)
  }
  return [
    Math.round(palette.zero[0] + (target[0] - palette.zero[0]) * weight),
    Math.round(palette.zero[1] + (target[1] - palette.zero[1]) * weight),
    Math.round(palette.zero[2] + (target[2] - palette.zero[2]) * weight),
  ]
}

/** An RGB colour as a CSS `rgb()` string. */
export function rgbString(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}
