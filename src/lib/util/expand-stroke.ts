export type Point = { x: number; y: number }

function unit(x: number, y: number): Point {
  const length = Math.hypot(x, y)
  return length <= Number.EPSILON
    ? { x: 0, y: 0 }
    : { x: x / length, y: y / length }
}

function direction(from: Point, to: Point): Point {
  return unit(to.x - from.x, to.y - from.y)
}

function strokePolygon(
  sections: { center: Point; direction: Point; width: number }[],
): Point[] {
  const left: Point[] = []
  const right: Point[] = []
  for (const { center, direction, width } of sections) {
    const dx = (-direction.y * width) / 2
    const dy = (direction.x * width) / 2
    left.push({ x: center.x + dx, y: center.y + dy })
    right.push({ x: center.x - dx, y: center.y - dy })
  }
  return [...left, ...right.reverse()]
}

/** Same per-vertex bisectors and butt ends as Canvas's interpolated trace. */
export function getExpandedStroke(
  points: (Point & { width: number })[],
): Point[] {
  return strokePolygon(
    points.map((point, index) => {
      const incoming = direction(points[index - 1] ?? point, point)
      const outgoing = direction(point, points[index + 1] ?? point)
      let tangent = unit(incoming.x + outgoing.x, incoming.y + outgoing.y)
      if (tangent.x === 0 && tangent.y === 0) {
        tangent = incoming.x || incoming.y ? incoming : { x: 1, y: 0 }
      }
      return { center: point, direction: tangent, width: point.width }
    }),
  )
}

/** Match Canvas's piecewise-linear outline for explicitly tapered wire points. */
export function getExpandedTaper(
  start: Point,
  end: Point,
  startWidth: number,
  endWidth: number,
  mode: "linear" | "quadratic",
): Point[] {
  const tangent = direction(start, end)
  if (tangent.x === 0 && tangent.y === 0) return []
  const delta = Math.abs(endWidth - startWidth)
  const steps =
    mode === "linear"
      ? 1
      : Math.max(
          1,
          Math.ceil(Math.sqrt((delta / (1e-3 + delta * 1e-6)) * (3 / 8))),
        )
  return strokePolygon(
    Array.from({ length: steps + 1 }, (_, index) => {
      const t = index / steps
      const u = startWidth <= endWidth ? t : 1 - t
      const width =
        mode === "linear"
          ? startWidth + (endWidth - startWidth) * t
          : Math.min(startWidth, endWidth) + delta * u * u
      return {
        center: {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        },
        direction: tangent,
        width,
      }
    }),
  )
}
