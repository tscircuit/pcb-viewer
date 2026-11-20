import "bun-match-svg"
import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import {
  PairBoard,
  type PairPathPoint,
} from "../../../fixtures/local-skew/pair-board"

const VIA_HOP: PairPathPoint[] = [
  { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
  { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
]

/** Renders a two-board panel: one 1.6 mm JLCPCB preset board and one plain 0.8 mm board. */
function renderPanel(stackupFirst: boolean): CircuitJson {
  const stackupBoard = (
    <PairBoard
      pairName="STACKUP"
      positivePath={[]}
      negativePath={VIA_HOP}
      pcbTraceGap="0.45mm"
      thickness="1.6mm"
      fabricatorPreset="jlcpcb_standard"
    />
  )
  const plainBoard = (
    <PairBoard
      pairName="PLAIN"
      positivePath={[]}
      negativePath={VIA_HOP}
      pcbTraceGap="0.45mm"
      thickness="0.8mm"
    />
  )
  const circuit = new Circuit()
  circuit.add(
    <panel width="100mm" height="50mm" layoutMode="grid">
      {stackupFirst ? stackupBoard : plainBoard}
      {stackupFirst ? plainBoard : stackupBoard}
    </panel>,
  )
  return circuit.getCircuitJson()
}

test("each board in a panel uses only its own stackup or thickness, never a neighbour's", async () => {
  // JLCPCB 2-layer 1.6 mm stackup: 0.03 + 1.43 + 0.03 = 1.49 mm per via -> 2.98 mm.
  // Plain 0.8 mm board with no stackup: 0.80 mm per via -> 1.60 mm.
  const stackupFirstJson = renderPanel(true)
  const plainFirstJson = renderPanel(false)

  for (const circuitJson of [stackupFirstJson, plainFirstJson]) {
    const pairs = computeLocalSkew(circuitJson)
    const stackupPair = pairs.find((pair) => pair.name === "STACKUP")
    const plainPair = pairs.find((pair) => pair.name === "PLAIN")
    expect(stackupPair?.max_skew).toBeCloseTo(2.98, 5)
    expect(plainPair?.max_skew).toBeCloseTo(1.6, 5)
  }

  await expect(localSkewSvg(stackupFirstJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
})
