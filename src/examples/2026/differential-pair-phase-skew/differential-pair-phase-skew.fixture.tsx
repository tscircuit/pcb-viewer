import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import tuningBump from "./tuning-bump.circuit.json"

// Generated from tuning-bump.circuit.tsx with core 0.0.2478, which emits skew measurements.
const circuitJson = tuningBump as AnyCircuitElement[]

export default {
  "Overlay off": <PCBViewer circuitJson={circuitJson} />,
  "Overlay on": (
    <PCBViewer
      circuitJson={circuitJson}
      initialState={{ is_showing_differential_pair_phase_skew: true }}
    />
  ),
}
