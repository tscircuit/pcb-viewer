import type { CircuitJson } from "circuit-json"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    localSkewCircuitJson: CircuitJson
  }
}

createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={window.localSkewCircuitJson}
    renderer="canvas"
    height={400}
  />,
)
