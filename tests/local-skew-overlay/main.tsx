import type { CircuitJson } from "circuit-json"
import { createRoot } from "react-dom/client"
import type { State, StateProps } from "../../src/global-store"
import { PCBViewer } from "../../src/index"

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    localSkewCircuitJson: CircuitJson
    /** Viewer store fields to start from, set by the test. */
    localSkewInitialState: Partial<State>
  }
}

createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={window.localSkewCircuitJson}
    // `StateProps` only types boolean fields; the store accepts any field.
    initialState={window.localSkewInitialState as Partial<StateProps>}
    renderer="canvas"
    height={400}
  />,
)
