import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { type ReactElement, useEffect, useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import ForumExampleBoard from "./forum-example.circuit"
import TuningBumpBoard from "./tuning-bump.circuit"

const PhaseSkewViewer = ({ board }: { board: ReactElement }) => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()
  useEffect(() => {
    const circuit = new Circuit()
    circuit.add(board)
    circuit
      .renderUntilSettled()
      .then(() => setCircuitJson(circuit.getCircuitJson()))
  }, [board])
  return (
    circuitJson && (
      <PCBViewer
        circuitJson={circuitJson}
        initialState={{ is_showing_differential_pair_phase_skew: true }}
      />
    )
  )
}

export default {
  "Tuning bump": <PhaseSkewViewer board={<TuningBumpBoard />} />,
  "KiCad forum": <PhaseSkewViewer board={<ForumExampleBoard />} />,
}
