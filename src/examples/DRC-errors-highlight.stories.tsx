import React from "react"
import { PCBViewer } from "../PCBViewer"
import { Circuit } from "@tscircuit/core"
import { useEffect, useMemo, useState } from "react"

export const DRCerrors: React.FC = () => {
  const [circuitJson, setCircuitJson] = useState(0)

  const circuit = useMemo(() => {
    const circuit = new Circuit()

    circuit.add(
      <board
        width="10mm"
        height="10mm"
        autorouter={{
          local: true,
          groupMode: "subcircuit",
        }}
      >
        <resistor
          name="R1"
          resistance="10k"
          pcbX={-2}
          pcbY={1}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          footprint="0402"
          layer="bottom"
          pcbX={2}
          pcbY={0}
        />
        <trace from=".R1 > .pin1" to=".R2 > .pin1" />
      </board>,
    )

    setCircuitJson(circuit.getCircuitJson() as any)

    return circuit
  }, [])

  // Use useEffect for side effects after render
  useEffect(() => {
    circuit.renderUntilSettled().then(() => {
      setCircuitJson(circuit.getCircuitJson() as any)
    })
  }, [circuit])

  return <PCBViewer circuitJson={circuitJson as any} />
}

export default DRCerrors
