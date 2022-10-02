import { Matrix } from "transformation-matrix"

export const scaleOnly = (mat: Matrix, value: number) => {
  if (Math.abs(mat.a) !== Math.abs(mat.d))
    throw new Error("Cannot scale non-uniformly")
  return value * Math.abs(mat.a)
}
