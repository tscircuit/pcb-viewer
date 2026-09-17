import { describe, expect, it } from "bun:test"
import { applyToPoint } from "transformation-matrix"
import {
  createViewRequest,
  getViewBox,
} from "../../src/lib/rendering/view-request"
const transform = { a: 10, b: 0, c: 0, d: -10, e: 400, f: 300 }

describe("view requests", () => {
  it("covers the viewport plus overscan, at quantized device resolution", () => {
    const request = createViewRequest(transform, 800, 600, 2)
    const view = getViewBox(transform, 800, 600)
    expect(request.viewBox.x).toBeLessThan(view.x)
    expect(request.viewBox.y).toBeLessThan(view.y)
    expect(request.viewBox.x + request.viewBox.width).toBeGreaterThan(
      view.x + view.width,
    )
    expect(request.viewBox.y + request.viewBox.height).toBeGreaterThan(
      view.y + view.height,
    )
    expect(request.transform.a).toBeGreaterThanOrEqual(20)
    const topLeft = applyToPoint(request.transform, {
      x: request.viewBox.x,
      y: request.viewBox.y + request.viewBox.height,
    })
    expect(topLeft.x).toBeCloseTo(0)
    expect(topLeft.y).toBeCloseTo(0)
  })
  it("reuses the same region for a small pan", () => {
    expect(createViewRequest(transform, 800, 600, 1).key).toBe(
      createViewRequest({ ...transform, e: 401 }, 800, 600, 1).key,
    )
  })
  it("bounds allocations on large high-DPI displays", () => {
    const request = createViewRequest(transform, 10000, 8000, 4)
    expect(request.width).toBeLessThanOrEqual(4096)
    expect(request.height).toBeLessThanOrEqual(4096)
  })
})
