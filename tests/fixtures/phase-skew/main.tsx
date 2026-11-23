import type { CircuitJson } from "circuit-json"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../../src/index"

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    phaseSkewCircuitJson: CircuitJson
  }
}

const root = document.getElementById("root")
if (root === null) throw new Error("The page has no #root element")

createRoot(root).render(
  <PCBViewer
    circuitJson={window.phaseSkewCircuitJson}
    renderer="canvas"
    height={400}
    onRenderComplete={() => {
      root.dataset.rendered = "true"
    }}
  />,
)
