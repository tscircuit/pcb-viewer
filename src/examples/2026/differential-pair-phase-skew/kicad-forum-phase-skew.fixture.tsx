import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import forumExample from "./forum-example.circuit.json"

// Generated from tests/fixtures/differential-pair-phase-skew/forum-example.circuit.tsx with core 0.0.2478.
export default (
  <PCBViewer
    circuitJson={forumExample as AnyCircuitElement[]}
    initialState={{ is_showing_differential_pair_phase_skew: true }}
  />
)
