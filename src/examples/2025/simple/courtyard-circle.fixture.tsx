import type React from "react"
import { PCBViewer } from "../../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const CourtyardCircleExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_courtyard_circle",
              pcb_courtyard_circle_id: "courtyard_1",
              pcb_component_id: "component_1",
              center: { x: 0, y: 0 },
              radius: 5,
              layer: "bottom",
            },
          ] as AnyCircuitElement[]
        }
      />
    </div>
  )
}

export default CourtyardCircleExample
