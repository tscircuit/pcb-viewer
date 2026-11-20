import { expect, test } from "bun:test"
import { resolveSkewPalette } from "../../../../src/lib/local-skew/skew-color"

test("a colour that does not parse falls back to the stored colour, then KiCad's default", () => {
  expect(
    resolveSkewPalette({
      colors: { positive: "hsl(0.5turn 100% 50%)", negative: "", zero: "nope" },
      pair: {
        positive_skew_color: "rgb(0, 128, 0)",
        negative_skew_color: "var(--skew)",
      },
    }),
  ).toEqual({
    zero: [255, 255, 255],
    positive: [0, 128, 0],
    negative: [255, 0, 0],
    unknown: [128, 128, 128],
  })
  expect(
    resolveSkewPalette({
      colors: { negative: "orange" },
      pair: { negative_skew_color: "rgb(0, 128, 0)" },
    }).negative,
  ).toEqual([255, 165, 0])
})
