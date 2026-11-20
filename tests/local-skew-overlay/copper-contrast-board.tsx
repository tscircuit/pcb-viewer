import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import { DifferentialPairBoard } from "../fixtures/local-skew/differential-pair-board"

// The unrelated 0.15 mm trace is 0.13 mm edge to edge from USB_DN.
export const NEIGHBOUR_Y = -0.58

export function renderCopperContrastBoard(): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(
    <DifferentialPairBoard width="70mm" compensated>
      <pcbtrace
        route={[
          {
            route_type: "wire",
            x: -5,
            y: NEIGHBOUR_Y,
            width: 0.15,
            layer: "top",
          },
          {
            route_type: "wire",
            x: 5,
            y: NEIGHBOUR_Y,
            width: 0.15,
            layer: "top",
          },
        ]}
      />
    </DifferentialPairBoard>,
  )
  return circuit.getCircuitJson() as CircuitJson
}
