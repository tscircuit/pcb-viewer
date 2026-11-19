import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  type PairPathPoint,
  renderPairBoard,
} from "../../../fixtures/local-skew/pair-board"

test("a straight route split into many points is measured as one segment", () => {
  const everyMillimetre: PairPathPoint[] = []
  for (let x = 1; x < 24; x++) everyMillimetre.push({ x, y: 0 })

  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: everyMillimetre,
      negativePath: [],
      pcbTraceGap: "0.45mm",
    }),
  )

  expect(pair.positive.segments).toHaveLength(1)
  expect(pair.positive.segments[0].coupling).toBe("coupled")
})
