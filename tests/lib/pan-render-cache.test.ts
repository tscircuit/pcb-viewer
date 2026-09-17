import { expect, test } from "bun:test"
import { applyToPoint } from "transformation-matrix"
import {
  getBufferedRenderTransform,
  getCachedPanOffset,
  PAN_RENDER_MARGIN,
} from "../../src/lib/pan-render-cache"

const scene = {}
const transform = { a: 4, b: 0, c: 0, d: -4, e: 500, f: 300 }
const snapshot = { scene, transform }

test("cached pans preserve world-to-screen coordinates, including reversed axes", () => {
  for (const delta of [-PAN_RENDER_MARGIN, -20, 0, 20, PAN_RENDER_MARGIN]) {
    const next = {
      ...transform,
      e: transform.e + delta,
      f: transform.f - delta,
    }
    const offset = getCachedPanOffset(snapshot, next, scene)!
    const point = { x: 12.5, y: -8.1 }
    const buffered = applyToPoint(getBufferedRenderTransform(transform), point)
    const expected = applyToPoint(next, point)
    expect(buffered.x - PAN_RENDER_MARGIN + offset.x).toBeCloseTo(expected.x)
    expect(buffered.y - PAN_RENDER_MARGIN + offset.y).toBeCloseTo(expected.y)
  }
})

test("redraws before exposing pixels outside the buffer", () => {
  for (const axis of ["e", "f"] as const) {
    for (const direction of [-1, 1]) {
      expect(
        getCachedPanOffset(
          snapshot,
          {
            ...transform,
            [axis]: transform[axis] + direction * (PAN_RENDER_MARGIN + 1),
          },
          scene,
        ),
      ).toBeNull()
    }
  }
})

test("invalidates on zoom, rotation, scene changes, and missing transforms", () => {
  for (const axis of ["a", "b", "c", "d"] as const) {
    expect(
      getCachedPanOffset(
        snapshot,
        { ...transform, [axis]: transform[axis] + 1 },
        scene,
      ),
    ).toBeNull()
  }
  expect(getCachedPanOffset(snapshot, transform, {})).toBeNull()
  expect(getCachedPanOffset(null, transform, scene)).toBeNull()
  expect(getCachedPanOffset(snapshot, undefined, scene)).toBeNull()
})

test("a 600px pan needs four rasterizations instead of 121", () => {
  let current = snapshot
  let draws = 1
  for (let x = 5; x <= 600; x += 5) {
    const next = { ...transform, e: transform.e + x }
    if (!getCachedPanOffset(current, next, scene)) {
      draws++
      current = { scene, transform: next }
    }
  }
  expect(draws).toBe(4)
})
