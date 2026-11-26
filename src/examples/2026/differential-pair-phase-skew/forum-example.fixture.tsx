import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./forum-example.circuit.json"

export default function Fixture() {
  return (
    <PCBViewer
      circuitJson={circuitJson as AnyCircuitElement[]}
      initialState={{ is_showing_differential_pair_phase_skew: true }}
      renderer="canvas"
    />
  )
}
