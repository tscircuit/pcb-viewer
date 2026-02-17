import React from "react"
import { PCBViewer } from "../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const CourtyardOutlineFixture: React.FC = () => {
  return (
    <PCBViewer
      circuitJson={
        [
          {
            type: "pcb_board",
            pcb_board_id: "board0",
            center: { x: 5, y: 5 },
            width: 20,
            height: 20,
            thickness: 1.6,
            num_layers: 2,
            material: "fr4",
          },
          {
            type: "pcb_courtyard_outline",
            pcb_courtyard_outline_id: "courtyard_1",
            pcb_component_id: "component_1",
            layer: "top",
            outline: [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 5 },
              { x: 5, y: 5 },
              { x: 5, y: 10 },
              { x: 0, y: 10 },
            ],
          },
          {
            type: "pcb_courtyard_outline",
            pcb_courtyard_outline_id: "courtyard_2",
            pcb_component_id: "component_2",
            layer: "bottom",
            outline: [
              { x: 1, y: 1 },
              { x: 9, y: 1 },
              { x: 5, y: 9 },
            ],
          },
        ] as AnyCircuitElement[]
      }
    />
  )
}

export default CourtyardOutlineFixture
