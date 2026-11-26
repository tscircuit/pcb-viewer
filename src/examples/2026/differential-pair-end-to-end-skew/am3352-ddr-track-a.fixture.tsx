import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./am3352-ddr-track-a.circuit.json"

export default function Fixture() {
  return (
    <PCBViewer
      circuitJson={circuitJson as AnyCircuitElement[]}
      initialState={{
        is_showing_differential_pair_end_to_end_skew: true,
        is_showing_copper_pours: false,
        is_showing_pcb_groups: false,
      }}
      renderer="canvas"
    />
  )
}
