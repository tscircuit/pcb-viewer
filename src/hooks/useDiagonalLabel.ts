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
}

export function useDiagonalLabel(
  params: UseDiagonalLabelParams,
): DiagonalLabelResult {
  const {
    dimensionStart,
    dimensionEnd,
    screenDimensionStart,
    screenDimensionEnd,
  } = params

  return useMemo(
    () =>
      calculateDiagonalLabel({
        dimensionStart,
        dimensionEnd,
        screenDimensionStart,
        screenDimensionEnd,
      }),
    [dimensionStart, dimensionEnd, screenDimensionStart, screenDimensionEnd],
  )
}
