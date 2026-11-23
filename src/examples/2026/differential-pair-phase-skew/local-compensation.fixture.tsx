import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={11} routeRemaining={false}>
    <Pair
      name="COMPENSATED"
      y={2.2}
      positivePath={detour(3, 0.9)}
      negativePath={detour(6, -0.9)}
    />
    <silkscreentext text="COMPENSATED" pcbX={5} pcbY={3.8} fontSize={0.7} />
    <Pair name="UNCOMPENSATED" y={-2.2} positivePath={detour(3, 0.9)} />
    <silkscreentext text="UNCOMPENSATED" pcbX={5} pcbY={-3.8} fontSize={0.7} />
  </board>,
)

/** Skew stays near the source on the compensated upper pair and persists to the load on the lower pair. */
export default function LocalCompensation(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
