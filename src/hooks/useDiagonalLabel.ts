import { useMemo } from "react"
import {
  calculateDiagonalLabel,
  type DiagonalLabelResult,
} from "lib/util/calculate-diagonal-label"

export interface UseDiagonalLabelParams {
  realWorldStart: { x: number; y: number }
  realWorldEnd: { x: number; y: number }
  screenStart: { x: number; y: number }
  screenEnd: { x: number; y: number }
}

export function useDiagonalLabel(
  params: UseDiagonalLabelParams,
): DiagonalLabelResult {
  const { realWorldStart, realWorldEnd, screenStart, screenEnd } = params

  return useMemo(
    () =>
      calculateDiagonalLabel({
        realWorldStart,
        realWorldEnd,
        screenStart,
        screenEnd,
      }),
    [realWorldStart, realWorldEnd, screenStart, screenEnd],
  )
}
