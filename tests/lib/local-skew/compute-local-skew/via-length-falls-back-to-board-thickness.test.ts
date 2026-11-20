import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import {
  type PairBoardProps,
  renderPairBoard,
} from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("without a stackup, a via falls back to pcb_board.thickness then 1.6 mm", async () => {
  // 0.8 mm board with no pcb_stackup: DN hops top -> bottom -> top.
  const props: PairBoardProps = {
    positivePath: [],
    negativePath: [
      { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
    thickness: "0.8mm",
  }
  const circuitJson = renderPairBoard(props)

  expect(circuitJson.some((element) => element.type === "pcb_stackup")).toBe(
    false,
  )

  const [pair] = computeLocalSkew(circuitJson)
  expect(
    segmentAtX({ segments: pair.positive.segments, x: 0 }).skew,
  ).toBeCloseTo(-0.8, 5)
  expect(
    segmentAtX({ segments: pair.positive.segments, x: 9 }).skew,
  ).toBeCloseTo(-1.6, 5)
  expect(pair.max_skew).toBeCloseTo(1.6, 5)

  // Without a pcb_board at all, each via falls back to 1.6 mm.
  const [withoutBoard] = computeLocalSkew(
    circuitJson.filter((element) => element.type !== "pcb_board"),
  )
  expect(
    segmentAtX({ segments: withoutBoard.positive.segments, x: 9 }).skew,
  ).toBeCloseTo(-3.2, 5)

  for (const thickness of ["-0.8mm", "1e309mm", "NaN"]) {
    const [invalidThicknessPair] = computeLocalSkew(
      renderPairBoard({ ...props, thickness }),
    )
    expect(invalidThicknessPair?.max_skew).toBeCloseTo(3.2, 5)
  }

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
