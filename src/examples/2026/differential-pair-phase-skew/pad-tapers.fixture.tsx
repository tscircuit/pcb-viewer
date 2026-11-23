import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={8} routeRemaining={false}>
    <Pair
      name="TAPERED"
      positivePath={detour(6, 1.3)}
      padDiameter={1}
      teardrops
    />
  </board>,
)

/** The overlay widens with the teardrop tapers as the traces approach the pads. */
export default function PadTapers(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
