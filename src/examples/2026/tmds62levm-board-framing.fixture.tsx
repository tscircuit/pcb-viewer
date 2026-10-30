import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"
import circuitJson from "../../../tests/fixtures/tmds62levm-off-board-notes.circuit.json"

export default () => (
  <PCBViewer circuitJson={circuitJson as AnyCircuitElement[]} height={600} />
)
