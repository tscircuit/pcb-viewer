import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={8} routeRemaining={false}>
    <Pair name="MATCHED" />
  </board>,
)

/** Both traces stay white because their lengths match at every point. */
export default function MatchedPair(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
