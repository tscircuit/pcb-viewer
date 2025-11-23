import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const PlatedHoleOvalShape: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "source_component",
              source_component_id: "generic_0",
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
              type: "pcb_plated_hole",
              x: -3,
              y: 0,
              layers: ["top", "bottom"],
              outer_width: 2.6,
              outer_height: 3.78,
              hole_width: 1.1,
              hole_height: 2.28,
              shape: "oval",
              port_hints: [],
              pcb_component_id: "pcb_generic_component_0",
            },
          ] as any
        }
      />
    </div>
  )
}

export default PlatedHoleOvalShape
