import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("without pcbTraceGap the pair is still coupled at its routed spacing", async () => {
  const circuitJson = renderPairBoard({ positivePath: [], negativePath: [] })
  const [pair] = computeLocalSkew(circuitJson)

  const middle = segmentAtX({ segments: pair.positive.segments, x: 0 })
  expect(middle.coupling).toBe("coupled")
  expect(middle.skew).toBe(0)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
