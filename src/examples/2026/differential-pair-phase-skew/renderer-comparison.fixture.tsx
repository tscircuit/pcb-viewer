import type { ReactElement } from "react"
import {
  RendererComparisonBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<RendererComparisonBoard />)

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
