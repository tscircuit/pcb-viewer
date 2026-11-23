import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={9} routeRemaining={false}>
    <Pair
      name="MEANDER"
      positivePath={detour(2, 2.2)}
      negativePath={[...detour(16, -1.1), ...detour(20, -1.1)]}
    />
  </board>,
)

/** The traces stay blue and red until the two load-end bumps bring them back to white. */
export default function LoadEndMeander(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
