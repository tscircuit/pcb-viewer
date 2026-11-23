import type { ReactElement } from "react"
import { Pair, PhaseSkewViewer, detour, renderBoard } from "./pair-board"

const circuitJson = renderBoard(
  <board width={28} height={8} routeRemaining={false}>
    <Pair name="COMPARISON" positivePath={detour(7, 1.3)} />
  </board>,
)

/** Compare the same white-to-blue and white-to-red transitions in Canvas and WebGPU. */
export default function RendererComparison(): ReactElement {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: 16,
      }}
    >
      <section>
        <h3>Canvas</h3>
        <PhaseSkewViewer circuitJson={circuitJson} renderer="canvas" />
      </section>
      <section>
        <h3>WebGPU</h3>
        <PhaseSkewViewer circuitJson={circuitJson} renderer="webgpu" />
      </section>
    </div>
  )
}
