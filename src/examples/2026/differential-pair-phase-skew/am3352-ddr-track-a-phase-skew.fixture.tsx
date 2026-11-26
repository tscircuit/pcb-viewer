import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./am3352-ddr-track-a.circuit.json"

// Generated from the source documented in tests/fixtures/differential-pair-phase-skew/am3352-ddr-track-a.md.
export default () => (
  <PCBViewer
    circuitJson={circuitJson as AnyCircuitElement[]}
    initialState={{ is_showing_differential_pair_phase_skew: true }}
  />
)
