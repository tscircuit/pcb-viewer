import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"
import am3352Sbc from "./am3352-sbc.circuit.json"

// https://github.com/tscircuit/am3352-sbc/tree/bc85a52da8dcad023a3721ca9c90f7a9d29ea3d6
// Generated with core 0.0.2480 using tests/fixtures/pcb-snapshot.tsx from that
// revision, with placementDrcChecksDisabled enabled to replay the saved DDR routes.
// Omit the inner-layer copper pour polygons so the Cosmos props inspector can
// open the fixture. The DDR routes and phase skew records are kept as generated.
export default (
  <PCBViewer
    circuitJson={am3352Sbc as AnyCircuitElement[]}
    initialState={{ is_showing_differential_pair_phase_skew: true }}
  />
)
