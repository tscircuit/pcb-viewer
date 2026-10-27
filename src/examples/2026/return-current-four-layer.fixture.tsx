import type { AnyCircuitElement } from "circuit-json"
import circuitJson from "../../assets/return-current-four-layer-board.json"
import ReturnCurrentSimulationDemo from "./return-current.fixture"

// Reference geometry from simulate-return-current's MultilayerBoard fixture:
// top/inner1 signal, two blind signal vias, two ground through-vias, and
// inner2/bottom ground pours. Uses the explicitly assumed JLCPCB 1.2 mm stackup.
export default () => (
  <ReturnCurrentSimulationDemo
    circuitJson={circuitJson as AnyCircuitElement[]}
  />
)
