import React from "react"
import { PCBViewer } from "../../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const SilkscreenOval: React.FC = () => {
  return (
    <PCBViewer
      circuitJson={
        [
          {
            type: "source_component",
            source_component_id: "generic_0",
            name: "R1",
            supplier_part_numbers: {},
          },
          {
            type: "pcb_component",
            source_component_id: "generic_0",
            pcb_component_id: "pcb_generic_component_0",
            layer: "top",
            center: { x: 0, y: 0 },
            rotation: 0,
            width: 0,
            height: 0,
          },
          {
            type: "pcb_silkscreen_oval",
            layer: "top",
            pcb_component_id: "pcb_generic_component_0",
            pcb_silkscreen_oval_id: "pcb_silkscreen_oval_0",
            radius_x: 0.8,
            radius_y: 1.6,
            center: { x: 0, y: 0 },
          },
        ] as AnyCircuitElement[]
      }
    />
  )
}

export default SilkscreenOval
