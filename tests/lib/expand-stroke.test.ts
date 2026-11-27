import { describe, expect, test } from "bun:test"
import { type Point, getExpandedStroke } from "../../src/lib/util/expand-stroke"

const repeatedPointCases: { name: string; points: Point[] }[] = [
  {
    name: "at the start",
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ],
  },
  {
    name: "in the middle",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
  },
  {
    name: "at the end",
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 0 },
    ],
  },
]

describe("expanded stroke geometry", () => {
  for (const { name, points } of repeatedPointCases) {
    test(`repeated coordinates ${name} keep the stroke finite and within its width`, () => {
      const polygon = getExpandedStroke(points, 0.2)

      expect(polygon.length).toBeGreaterThan(0)
      expect(
        polygon.every(
          (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
        ),
      ).toBe(true)
      expect(new Set(polygon.map((point) => point.y))).toEqual(
        new Set([0.1, -0.1]),
      )
      expect(Math.min(...polygon.map((point) => point.x))).toBe(0)
      expect(Math.max(...polygon.map((point) => point.x))).toBe(2)
    })
  }

  test("retains width changes at repeated coordinates without mutating the input", () => {
    const points = [
      { x: -1, y: 0, trace_width: 0.2 },
      { x: -1, y: 0, trace_width: 0.6 },
      { x: 1, y: 0, trace_width: 0.6 },
      { x: 1, y: 0, trace_width: 0.2 },
      { x: 2, y: 0, trace_width: 0.2 },
    ]
    const original = structuredClone(points)
    const polygon = getExpandedStroke(points, 0.5)

    expect(points).toEqual(original)
    expect(
      polygon.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    ).toBe(true)
    for (const x of [-1, 1]) {
      expect(new Set(polygon.filter((p) => p.x === x).map((p) => p.y))).toEqual(
        new Set([0.1, 0.3, -0.1, -0.3]),
      )
    }
  })

  test("returns no polygon for a stroke with no nonzero-length segment", () => {
    expect(
      getExpandedStroke(
        [
          { x: 3, y: 4 },
          { x: 3, y: 4 },
          { x: 3, y: 4 },
        ],
        0.2,
      ),
    ).toEqual([])
  })

  test("a reversing segment uses a finite join", () => {
    const polygon = getExpandedStroke(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
      0.4,
    )

    expect(
      polygon.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
    ).toBe(true)
    expect(polygon).toContainEqual({ x: 1, y: 0.2 })
    expect(polygon).toContainEqual({ x: 1, y: -0.2 })
  })

  test("preserves an ordinary interpolated stroke and numeric array inputs", () => {
    expect(
      getExpandedStroke(
        [
          { x: 0, y: 0, trace_width: 0.2 },
          { x: 2, y: 0, trace_width: 0.8 },
        ],
        0.5,
      ),
    ).toEqual([
      { x: 0, y: 0.1 },
      { x: 2, y: 0.4 },
      { x: 2, y: -0.4 },
      { x: 0, y: -0.1 },
    ])
    expect(
      getExpandedStroke(
        [
          [0, 0],
          [2, 0],
        ],
        0.2,
      ),
    ).toEqual([
      { x: 0, y: 0.1 },
      { x: 2, y: 0.1 },
      { x: 2, y: -0.1 },
      { x: 0, y: -0.1 },
    ])
  })

  test("keeps the existing error for fewer than two input points", () => {
    expect(() => getExpandedStroke([], 0.2)).toThrow(
      "Stroke must have at least two points",
    )
    expect(() => getExpandedStroke([{ x: 0, y: 0 }], 0.2)).toThrow(
      "Stroke must have at least two points",
    )
  })
})
