import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import tuningBump from "./tuning-bump.circuit.json"

// Generated from tests/fixtures/differential-pair-phase-skew/tuning-bump.circuit.tsx with Core 0.0.2483.
export default (
  <PCBViewer
    circuitJson={tuningBump as AnyCircuitElement[]}
    initialState={{ is_showing_differential_pair_phase_skew: true }}
  />
)
