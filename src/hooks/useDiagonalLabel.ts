import { useMemo } from "react"
import {
  calculateDiagonalLabel,
  type DiagonalLabelResult,
} from "lib/util/calculate-diagonal-label"

export interface UseDiagonalLabelParams {
  dimensionStart: { x: number; y: number }
  dimensionEnd: { x: number; y: number }
  screenDimensionStart: { x: number; y: number }
  screenDimensionEnd: { x: number; y: number }
  flipX: boolean
  flipY: boolean
}

export function useDiagonalLabel(
  params: UseDiagonalLabelParams,
): DiagonalLabelResult {
  const {
    dimensionStart,
    dimensionEnd,
    screenDimensionStart,
    screenDimensionEnd,
    flipX,
    flipY,
  } = params

  return useMemo(
    () =>
      calculateDiagonalLabel({
        dimensionStart,
        dimensionEnd,
        screenDimensionStart,
        screenDimensionEnd,
        flipX,
        flipY,
      }),
    [
      dimensionStart,
      dimensionEnd,
      screenDimensionStart,
      screenDimensionEnd,
      flipX,
      flipY,
    ],
  )
}
