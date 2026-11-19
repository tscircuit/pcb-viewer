import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderLoopbackBoard } from "../../../fixtures/local-skew/loopback-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a loopback with all pads on one part lines the traces up by their ends", () => {
  const [pair] = computeLocalSkew(renderLoopbackBoard())

  const middle = segmentAtX({ segments: pair.positive.segments, x: 0 })
  expect(middle.coupling).toBe("coupled")
  expect(middle.skew).toBe(0)
  expect(pair.max_skew).toBe(0)
})
