import type React from "react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

const ManualConfliictsWarningBox: React.FC = () => {
  const circuit = new Circuit()

  const manualEdits = {
    pcb_placements: [
      {
        selector: "R1",
        center: {
          x: -1.451612903225806,
          y: 2.623655913978494,
        },
        relative_to: "group_center",
      },
      {
        selector: "C3",
        center: {
          x: -2,
          y: 3,
        },
        relative_to: "group_center",
      },
      {
        selector: "R2",
        center: {
          x: -2,
          y: 3,
        },
        relative_to: "group_center",
      },
      {
        selector: "C1",
        center: {
          x: -2,
          y: 3,
        },
        relative_to: "group_center",
      },
    ],
  }

  circuit.add(
    <board width="10mm" height="10mm" manualEdits={manualEdits}>
      <resistor resistance="1k" footprint="0402" name="R1" schY={3} pcbY={3} />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        schX={-3}
        pcbX={3}
      />

      <resistor resistance="1k" footprint="0402" name="R2" schX={3} pcbX={3} />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C2"
        schX={-3}
        pcbX={-3}
      />

      <resistor
        resistance="1k"
        footprint="0402"
        name="R3"
        schX={3}
        pcbX={3}
        schY={3}
        pcbY={3}
      />
      <capacitor capacitance="1000pF" footprint="0402" name="C3" />
    </board>,
  )

  const soup = circuit.getCircuitJson()
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default ManualConfliictsWarningBox
