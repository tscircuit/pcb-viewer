import { expect, test } from "bun:test"
import { getScreenSnappingPoints } from "../../src/lib/get-screen-snapping-points"
import { translate } from "transformation-matrix"

const snappingPoints = [
  {
    anchor: "center",
    point: { x: 2, y: 3 },
    element: null,
  },
]

test("inactive dimension tools skip screen-space snapping points", () => {
  expect(
    getScreenSnappingPoints({
      snappingPoints,
      realToScreenTransform: translate(10, 20),
      isEnabled: false,
    }),
  ).toEqual([])
})

test("active dimension tools transform snapping points", () => {
  expect(
    getScreenSnappingPoints({
      snappingPoints,
      realToScreenTransform: translate(10, 20),
      isEnabled: true,
    }),
  ).toEqual([
    {
      ...snappingPoints[0],
      id: "0-center",
      screenPoint: { x: 12, y: 23 },
    },
  ])
})
