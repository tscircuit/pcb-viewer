import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

test("a pair that names the same trace on both sides is skipped", () => {
  const pairs = computeLocalSkew(
    renderPairBoard({
      positivePath: [],
      negativePath: [],
      positiveOnBothSides: true,
    }),
  )

  expect(pairs).toEqual([])
})
