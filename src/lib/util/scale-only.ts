import { Matrix } from "transformation-matrix"

export const scaleOnly = (mat: Matrix, value: number) => {
  if (mat.a !== mat.d) throw new Error("Cannot scale non-uniformly")
  return value * mat.a
}
