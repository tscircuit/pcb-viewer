import type { CircuitJson } from "circuit-json"
import { createRoot } from "react-dom/client"
import type { StateProps } from "../../src/global-store"
import { PCBViewer } from "../../src/index"

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    localSkewCircuitJson: CircuitJson
    /**
     * Viewer store fields to start from, set by the test. `StateProps` only
     * types boolean fields, but the store accepts any of its fields here.
     */
    localSkewInitialState: Partial<StateProps>
  }
}

createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={window.localSkewCircuitJson}
    initialState={window.localSkewInitialState}
    renderer="canvas"
    height={400}
  />,
)
