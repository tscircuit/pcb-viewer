import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={18} routeRemaining={false}>
    <Pair name="LANE0" y={6} />
    <Pair name="LANE1" y={2} positivePath={detour(4, 0.8)} />
    <Pair name="LANE2" y={-2} negativePath={detour(10, -1.2)} />
    <Pair
      name="LANE3"
      y={-6}
      positivePath={detour(16, 1.4)}
      negativePath={detour(5, -0.6)}
    />
  </board>,
)

/** From top to bottom, see a matched lane, each skew polarity, and a lane whose skew changes sign. */
export default function FourLanes(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
