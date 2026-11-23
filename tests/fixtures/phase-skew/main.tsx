import type { CircuitJson } from "circuit-json"
import { type ReactElement, useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../../src/index"
import type { PhaseSkewColorOverrides } from "../../../src/lib/get-phase-skew-strokes"

/** A message the viewer posted to its WebGPU worker, as the test records it. */
type RecordedWorkerMessage = { type: string; layerStrokeCount?: number }

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    phaseSkewCircuitJson: CircuitJson
    /** The renderer the test opens the viewer with. */
    phaseSkewRenderer: "canvas" | "webgpu"
    phaseSkewColors?: PhaseSkewColorOverrides
    /** Replaces the board the viewer shows, as a host app passing new Circuit JSON would. */
    setPhaseSkewCircuitJson: (circuitJson: CircuitJson) => void
    /** Every message posted to a worker on this page, in order. */
    phaseSkewWorkerMessages: RecordedWorkerMessage[]
  }
}

/** The viewer on the test's board, which the test can replace. */
function PhaseSkewPage({ root }: { root: HTMLElement }): ReactElement {
  const [circuitJson, setCircuitJson] = useState(window.phaseSkewCircuitJson)
  window.setPhaseSkewCircuitJson = setCircuitJson
  return (
    <PCBViewer
      circuitJson={circuitJson}
      renderer={window.phaseSkewRenderer}
      phaseSkewColors={window.phaseSkewColors}
      height={400}
      onRenderComplete={() => {
        root.dataset.rendered = "true"
      }}
    />
  )
}

const root = document.getElementById("root")
if (root === null) throw new Error("The page has no #root element")

createRoot(root).render(<PhaseSkewPage root={root} />)
