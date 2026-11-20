import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderSpanningConnectorBoard } from "../../../fixtures/local-skew/spanning-connector-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a connector at the start of one trace and the end of the other doesn't flip the pair", async () => {
  const circuitJson = renderSpanningConnectorBoard()
  const [pair] = computeLocalSkew(circuitJson)

  for (const segments of [pair.positive.segments, pair.negative.segments]) {
    const middle = segmentAtX({ segments, x: 0 })
    expect(middle.coupling).toBe("coupled")
    expect(middle.skew).toBe(0)
  }
  expect(pair.max_skew).toBe(0)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
