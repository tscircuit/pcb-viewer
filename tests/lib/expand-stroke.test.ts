import { expect, test } from "bun:test"
import { getExpandedStroke } from "../../src/lib/util/expand-stroke"

const allFinite = (points: { x: number; y: number }[]) =>
  points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))

test("a doubled-back segment produces finite outline points", () => {
  // A route that reverses exactly 180 degrees puts the two segment
  // normals in opposition, so the miter sum is the zero vector.
  const points = getExpandedStroke(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ],
    0.2,
  )
  expect(points.length).toBeGreaterThan(0)
  expect(allFinite(points)).toBe(true)
})

test("coincident consecutive points produce finite outline points", () => {
  // A zero-length segment has no direction; its normal must not
  // poison the polygon with NaN coordinates.
  const points = getExpandedStroke(
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    0.2,
  )
  expect(allFinite(points)).toBe(true)
})

test("an ordinary bent stroke still expands around its corner", () => {
  const points = getExpandedStroke(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    0.2,
  )
  expect(allFinite(points)).toBe(true)
  expect(Math.max(...points.map((p) => p.x))).toBeGreaterThan(1)
})
