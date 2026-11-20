import { expect, test } from "bun:test"
import { describeSkew } from "../../../../src/lib/local-skew/describe-skew"

const pair = { max_local_skew: 1.23607, max_length_skew: 0.1 }

test("the readout gives the local skew, or unknown, and labels the limit as end to end", () => {
  expect(
    describeSkew({ pair, name: "USB", segment: { local_skew: 1.23607 } }),
  ).toBe("USB: local skew 1.236 mm · max 1.236 mm · end-to-end limit 0.100 mm")
  expect(
    describeSkew({ pair, name: "USB", segment: { local_skew: -0.5 } }),
  ).toBe("USB: local skew -0.500 mm · max 1.236 mm · end-to-end limit 0.100 mm")
  expect(
    describeSkew({ pair, name: "USB", segment: { local_skew: -0.0004 } }),
  ).toBe("USB: local skew 0.000 mm · max 1.236 mm · end-to-end limit 0.100 mm")
  expect(describeSkew({ pair: {}, segment: {} })).toBe(
    "Pair: local skew unknown",
  )
})
