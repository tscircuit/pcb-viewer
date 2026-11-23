import type { ReactElement } from "react"
import type { PcbPath } from "@tscircuit/props"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const via: PcbPath = [{ x: 12, y: 0, via: true, toLayer: "bottom" }]
const circuitJson = renderBoard(
  <board width={28} height={9} routeRemaining={false}>
    <Pair
      name="LAYER_CHANGE"
      loadLayer="bottom"
      positivePath={[...detour(3, 1.1), ...via]}
      negativePath={[...via, ...detour(17, -1.1)]}
    />
  </board>,
)

/** Skew starts on top copper, runs through the vias, and returns to white after the bottom-layer detour. */
export default function LayerChange(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
