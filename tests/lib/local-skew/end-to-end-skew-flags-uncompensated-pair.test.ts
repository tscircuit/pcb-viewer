import { expect, test } from "bun:test"
import { checkPcbBusLengthSkew } from "@tscircuit/checks"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../fixtures/local-skew/differential-pair-board"

test("end-to-end skew flags the same pair without the compensating detour", () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: false })

  const errors = checkPcbBusLengthSkew(circuitJson)

  // Control for the mid-route test: the check does run on this board.
  expect(errors).toHaveLength(1)
  expect(errors[0].actual_length_skew).toBeCloseTo(DETOUR_EXTRA_LENGTH, 6)
  expect(errors[0].maximum_length_skew).toBe(0.1)
})
