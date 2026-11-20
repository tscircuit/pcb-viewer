import { expect, test } from "bun:test"
import { describeSkew } from "../../../../src/lib/local-skew/describe-skew"

const pair = { max_local_skew: 1.23607, max_length_skew: 0.1 }

test("the readout says how far ahead or behind the trace is and how that is known", () => {
  expect(
    describeSkew({
      pair,
      name: "USB",
      segment: { local_skew: 1.23607, coupling: "coupled" },
    }),
  ).toBe(
    "USB: 1.236 mm longer than its partner (measured) · max 1.236 mm · limit 0.100 mm",
  )
  expect(
    describeSkew({
      pair,
      name: "USB",
      segment: { local_skew: -0.5, coupling: "interpolated" },
    }),
  ).toBe(
    "USB: 0.500 mm shorter than its partner (interpolated) · max 1.236 mm · limit 0.100 mm",
  )
  expect(
    describeSkew({
      pair,
      name: "USB",
      segment: { local_skew: 0.0004, coupling: "coupled" },
    }),
  ).toBe(
    "USB: in step with its partner (measured) · max 1.236 mm · limit 0.100 mm",
  )
  expect(
    describeSkew({
      pair: {},
      segment: { coupling: "unknown" },
    }),
  ).toBe("Pair: skew unknown (traces not running together)")
})
