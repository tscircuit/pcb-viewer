import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./tuning-bump.circuit.json"

export default function Fixture() {
  return (
    <PCBViewer
      circuitJson={circuitJson as AnyCircuitElement[]}
      initialState={{ is_showing_differential_pair_end_to_end_skew: true }}
      renderer="canvas"
    />
  )
}
