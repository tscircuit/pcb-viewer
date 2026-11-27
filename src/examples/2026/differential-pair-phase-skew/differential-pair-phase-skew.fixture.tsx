import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import ForumExampleBoard from "./forum-example.circuit"

export default function DifferentialPairPhaseSkewFixture() {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()
  useEffect(() => {
    const circuit = new Circuit()
    circuit.add(<ForumExampleBoard />)
    circuit
      .renderUntilSettled()
      .then(() => setCircuitJson(circuit.getCircuitJson()))
  }, [])
  return (
    circuitJson && (
      <PCBViewer
        circuitJson={circuitJson}
        initialState={{ is_showing_differential_pair_phase_skew: true }}
      />
    )
  )
}
