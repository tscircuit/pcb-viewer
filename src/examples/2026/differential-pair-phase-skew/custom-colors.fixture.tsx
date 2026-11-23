import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={9} routeRemaining={false}>
    <Pair
      name="CUSTOM_COLORS"
      negativePath={detour(5, -1.4)}
      positivePath={detour(15, 2.1)}
    />
  </board>,
)

const phaseSkewColors = {
  negative: "#ff8d32",
  positive: "#29e2bd",
  zero: "#fff1bc",
}

/** Cream marks matched sections, teal marks the longer trace, and orange marks the shorter trace. */
export default function CustomColors(): ReactElement {
  return (
    <PhaseSkewViewer
      circuitJson={circuitJson}
      phaseSkewColors={phaseSkewColors}
    />
  )
}
