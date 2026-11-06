import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { identity } from "transformation-matrix"
import { DimensionSnapGuides } from "../src/components/DimensionSnapGuides"
import { getScreenSnappingPoints } from "../src/lib/get-screen-snapping-points"

test("getScreenSnappingPoints respects isEnabled flag for configurable snapping", () => {
  const snappingPoints = [
    { anchor: "center", point: { x: 5, y: 10 }, element: null },
  ]
  expect(
    getScreenSnappingPoints({
      snappingPoints,
      realToScreenTransform: identity(),
      isEnabled: false,
    }),
  ).toEqual([])
  expect(
    getScreenSnappingPoints({
      snappingPoints,
      realToScreenTransform: identity(),
      isEnabled: true,
    }),
  ).toEqual([
    {
      id: "0-center",
      anchor: "center",
      point: { x: 5, y: 10 },
      element: null,
      screenPoint: { x: 5, y: 10 },
    },
  ])
})

test("renders a large guide set as two paths with only selected markers highlighted", () => {
  const points = Array.from({ length: 70_043 }, (_, index) => ({
    id: String(index),
    screenPoint: { x: index, y: index + 10 },
  }))
  const html = renderToStaticMarkup(
    <DimensionSnapGuides points={points} startId="0" endId="70042" />,
  )
  expect(html.match(/<svg/g)).toHaveLength(1)
  expect(html.match(/<path/g)).toHaveLength(2)
  expect(html).toContain(
    'd="M-2.5,7.5l5,5m0,-5l-5,5M70039.5,70049.5l5,5m0,-5l-5,5" stroke="#66ccff"',
  )
})

test("handles coincident endpoints and stale selections after geometry changes", () => {
  const points = [{ id: "a", screenPoint: { x: 10, y: 20 } }]
  const same = renderToStaticMarkup(
    <DimensionSnapGuides points={points} startId="a" endId="a" />,
  )
  expect(same).toContain('d="M7.5,17.5l5,5m0,-5l-5,5" stroke="#66ccff"')
  const stale = renderToStaticMarkup(
    <DimensionSnapGuides points={[]} startId="a" endId={null} />,
  )
  expect(stale).toContain('d="" stroke="#66ccff"')
})
