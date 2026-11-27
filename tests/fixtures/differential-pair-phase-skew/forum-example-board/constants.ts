import { compose, scale, translate } from "transformation-matrix"

export const boardProps = {
  thickness: 1.6,
  layers: 2,
  routeRemaining: false,
} as const

export type ImageVertex = [x: number, y: number, radius?: number]

export const PIXELS_PER_MM = 47
export const IMAGE_CENTER_X = 641
export const IMAGE_CENTER_Y = 400
export const SOURCE_X = 194.5
export const LOAD_X = 1087.5
export const POSITIVE_PAD_Y = 306.45
export const PAD_PITCH_MM = 1.65
export const NEGATIVE_PAD_Y = POSITIVE_PAD_Y + PAD_PITCH_MM * PIXELS_PER_MM

export const DIAGONAL = Math.SQRT1_2
export const TRACE_WIDTH_MM = 0.2
export const BUMP_DEPTH_PX = 47

// The board coordinates use the center of the forum image as the origin
// and reverse its Y axis.
export const imagePixelsToMm = scale(1 / PIXELS_PER_MM, -1 / PIXELS_PER_MM)
export const imageToPcb = compose(
  imagePixelsToMm,
  translate(-IMAGE_CENTER_X, -IMAGE_CENTER_Y),
)
