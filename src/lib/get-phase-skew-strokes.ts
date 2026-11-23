import type { Color, LayerStroke } from "@tscircuit/circuit-json-webgpu"
import color from "color"
import {
  DEFAULT_PHASE_SKEW_COLORS,
  type DifferentialPairPhaseSkew,
  type PhaseSkewColors,
  type PhaseSkewSegment,
  type PhaseSkewTrace,
} from "circuit-json-to-differential-pair-phase-skew"

/** KiCad draws the overlay this much wider than its copper, so no copper edge shows beside it. */
const OVERLAY_WIDTH_FACTOR = 1.1

/**
 * CSS colours that replace KiCad's defaults. Spelled out, not derived from
 * `PhaseSkewColors`, so the published types don't import the bundled library.
 */
export type PhaseSkewColorOverrides = {
  positive?: string
  negative?: string
  zero?: string
  unknown?: string
}

/** The phase skew colours as red, green, blue and alpha from 0 to 1. */
type PhaseSkewPalette = Record<keyof PhaseSkewColors, Color>

/**
 * Every phase skew segment as a stroke over its copper. Like KiCad, each
 * trace blends from the zero colour toward a sign's colour by the segment's
 * share of that trace's peak for the sign.
 */
export function getPhaseSkewStrokes({
  differentialPairPhaseSkews,
  phaseSkewColors,
}: {
  differentialPairPhaseSkews: DifferentialPairPhaseSkew[]
  phaseSkewColors?: PhaseSkewColorOverrides
}): LayerStroke[] {
  const palette = parsePhaseSkewPalette({
    ...DEFAULT_PHASE_SKEW_COLORS,
    ...phaseSkewColors,
  })
  return differentialPairPhaseSkews
    .flatMap((pair) => [pair.positive_trace, pair.negative_trace])
    .flatMap((trace) =>
      trace.segments.map((segment) => ({
        layer: segment.layer,
        start: segment.start,
        end: segment.end,
        width: segment.width * OVERLAY_WIDTH_FACTOR,
        color: getPhaseSkewColor({ segment, trace, palette }),
      })),
    )
}

/** Parses each CSS colour of `phaseSkewColors`. */
function parsePhaseSkewPalette(
  phaseSkewColors: PhaseSkewColors,
): PhaseSkewPalette {
  return {
    positive: parseCssColor(phaseSkewColors.positive),
    negative: parseCssColor(phaseSkewColors.negative),
    zero: parseCssColor(phaseSkewColors.zero),
    unknown: parseCssColor(phaseSkewColors.unknown),
  }
}

/** A CSS colour as red, green, blue and alpha from 0 to 1. */
function parseCssColor(cssColor: string): Color {
  const parsedColor = color(cssColor)
  const [red, green, blue] = parsedColor.rgb().unitArray()
  return [red, green, blue, parsedColor.alpha()]
}

/** The colour of one segment of `trace`. */
function getPhaseSkewColor({
  segment,
  trace,
  palette,
}: {
  segment: PhaseSkewSegment
  trace: PhaseSkewTrace
  palette: PhaseSkewPalette
}): Color {
  if (segment.phase_skew === undefined) return palette.unknown
  if (segment.phase_skew > 0) {
    return blendColors({
      from: palette.zero,
      to: palette.positive,
      fraction: segment.phase_skew / trace.max_phase_skew,
    })
  }
  if (segment.phase_skew < 0) {
    return blendColors({
      from: palette.zero,
      to: palette.negative,
      fraction: segment.phase_skew / trace.min_phase_skew,
    })
  }
  return palette.zero
}

/** The colour `fraction` of the way from `from` to `to`, channel by channel. */
function blendColors({
  from,
  to,
  fraction,
}: {
  from: Color
  to: Color
  fraction: number
}): Color {
  return [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
    from[2] + (to[2] - from[2]) * fraction,
    from[3] + (to[3] - from[3]) * fraction,
  ]
}
