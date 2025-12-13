import type React from "react"
import { PCBViewer } from "../../../PCBViewer"

export const SilkscreenPill: React.FC = () => {
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
            type: "schematic_component",
            schematic_component_id: "schematic_generic_component_0",
            source_component_id: "generic_0",
            center: {
              x: 0,
              y: 0,
            },
            rotation: 0,
            size: {
              width: 0,
              height: 0,
            },
          },
          {
            type: "pcb_component",
            source_component_id: "generic_0",
            pcb_component_id: "pcb_generic_component_0",
            layer: "top",
            center: {
              x: 0,
              y: 0,
            },
            rotation: 0,
            width: 0,
            height: 0,
          },
          {
            type: "pcb_silkscreen_pill",
            layer: "bottom",
            pcb_component_id: "pcb_generic_component_0",
            pcb_silkscreen_pill_id: "pcb_silkscreen_pill_0",
            width: 1,
            height: 0.5,
            center: {
              x: 0,
              y: 0,
            },
          },
        ] as any
      }
    />
  )
}

export default SilkscreenPill
