import { PCBViewer } from "../PCBViewer"
import type React from "react"

export const RectBorderRadius: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_plated_hole",
              shape: "circular_hole_with_rect_pad",
              x: 0,
              y: 0,
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "port1",
              hole_diameter: 0.6,
              rect_pad_width: 2,
              rect_pad_height: 2,
              rect_border_radius: 0.2,
              pcb_component_id: "comp1",
              pcb_plated_hole_id: "hole1",
            },
            {
              type: "pcb_plated_hole",
              shape: "pill_hole_with_rect_pad",
              x: 5,
              y: 0,
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "port2",
              hole_width: 1,
              hole_height: 2,
              rect_pad_width: 3,
              rect_pad_height: 4,
              rect_border_radius: 0.3,
              pcb_component_id: "comp2",
              pcb_plated_hole_id: "hole2",
            },
            {
              type: "pcb_plated_hole",
              shape: "rotated_pill_hole_with_rect_pad",
              x: 10,
              y: 0,
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "port3",
              hole_width: 1,
              hole_height: 2,
              hole_ccw_rotation: 45,
              rect_pad_width: 3,
              rect_pad_height: 4,
              rect_ccw_rotation: 45,
              rect_border_radius: 0.4,
              pcb_component_id: "comp3",
              pcb_plated_hole_id: "hole3",
            },
            {
              type: "pcb_smtpad",
              shape: "rect",
              x: 0,
              y: 5,
              width: 2,
              height: 3,
              layer: "top",
              rect_border_radius: 0.1,
              pcb_smtpad_id: "pad1",
              pcb_component_id: "comp4",
            },
            {
              type: "pcb_smtpad",
              shape: "rotated_rect",
              x: 5,
              y: 5,
              width: 2,
              height: 3,
              layer: "top",
              ccw_rotation: 45,
              rect_border_radius: 0.2,
              pcb_smtpad_id: "pad2",
              pcb_component_id: "comp5",
            },
          ] as any
        }
      />
    </div>
  )
}

export default RectBorderRadius
