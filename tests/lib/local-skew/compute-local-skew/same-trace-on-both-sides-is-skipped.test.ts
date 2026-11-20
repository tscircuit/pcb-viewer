import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

test("a pair that names the same trace on both sides is skipped", async () => {
  const circuitJson = renderPairBoard({
    positivePath: [],
    negativePath: [],
    positiveOnBothSides: true,
  })
  const pairs = computeLocalSkew(circuitJson)

  expect(pairs).toEqual([])

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
