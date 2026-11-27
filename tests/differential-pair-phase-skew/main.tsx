import type { AnyCircuitElement } from "circuit-json"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"

const circuitJson: AnyCircuitElement[] = await fetch(
  "/forum-example.circuit.json",
).then((response) => response.json())

createRoot(document.getElementById("root")!).render(
  <PCBViewer circuitJson={circuitJson} renderer="canvas" height={600} />,
)
