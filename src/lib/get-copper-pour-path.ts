import type { PcbCopperPour } from "circuit-json"
import { addBrepShapeToPath, type CanvasContext } from "circuit-to-canvas"
import { applyToPoint, type Matrix } from "transformation-matrix"

const paths = new WeakMap<PcbCopperPour, { key: string; path: Path2D }>()

/** Prepare pour geometry once per zoom. Translation is applied when drawing. */
export function getCopperPourPath(pour: PcbCopperPour, matrix: Matrix): Path2D {
  const key = [matrix.a, matrix.b, matrix.c, matrix.d].join(",")
  const cached = paths.get(pour)
  if (cached?.key === key) return cached.path

  const path = new Path2D()
  const linearTransform = { ...matrix, e: 0, f: 0 }
  if (pour.shape === "brep") {
    // This helper only appends path commands; Path2D implements those same
    // commands as a canvas context, including curved inner-ring boundaries.
    addBrepShapeToPath({
      ctx: path as unknown as CanvasContext,
      shape: pour.brep_shape,
      realToCanvasMat: linearTransform,
    })
  } else {
    const points =
      pour.shape === "polygon" ? pour.points : getRotatedRectangleCorners(pour)
    points.forEach((point, index) => {
      const { x, y } = applyToPoint(linearTransform, point)
      if (index === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    })
    path.closePath()
  }
  paths.set(pour, { key, path })
  return path
}

function getRotatedRectangleCorners(
  pour: Extract<PcbCopperPour, { shape: "rect" }>,
): Array<{ x: number; y: number }> {
  const angle = ((pour.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [
    [-pour.width / 2, -pour.height / 2],
    [pour.width / 2, -pour.height / 2],
    [pour.width / 2, pour.height / 2],
    [-pour.width / 2, pour.height / 2],
  ].map(([x, y]) => ({
    x: pour.center.x + x * cos - y * sin,
    y: pour.center.y + x * sin + y * cos,
  }))
}
