import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { DimensionSnapGuides } from "../src/components/DimensionSnapGuides"

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

test("DimensionOverlay renders multiple sticky dimension arrows with transformed coordinates", async () => {
  const { DimensionOverlay } = await import(
    "../src/components/DimensionOverlay"
  )
  const html = renderToStaticMarkup(
    <DimensionOverlay
      initialStickyDimensions={[
        {
          id: "sticky-1",
          start: { x: 0, y: 0 },
          end: { x: 30, y: 40 },
        },
        {
          id: "sticky-2",
          start: { x: 10, y: 15 },
          end: { x: 25, y: 35 },
        },
      ]}
    >
      <div />
    </DimensionOverlay>,
  )

  expect(html).toContain('data-dimension-arrow="sticky-1"')
  expect(html).toContain('data-dimension-arrow="sticky-2"')
  expect(html).toContain("30.00")
  expect(html).toContain("40.00")
  expect(html).toContain("15.00")
  expect(html).toContain("20.00")
})
