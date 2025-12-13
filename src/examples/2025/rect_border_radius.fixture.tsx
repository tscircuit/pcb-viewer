import { PCBViewer } from "../../PCBViewer"
import React from "react"

export const RectBorderRadius: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_plated_hole",
              shape: "circular_hole_with_rect_pad",
              x: -8,
              y: 0,
              layers: ["top", "bottom"],
              hole_diameter: 0.8,
              rect_pad_width: 2.5,
              rect_pad_height: 2,
              rect_border_radius: 0.3,
            },
            {
              type: "pcb_plated_hole",
              shape: "pill_hole_with_rect_pad",
              x: -4,
              y: 0,
              layers: ["top", "bottom"],
              hole_width: 0.8,
              hole_height: 1.6,
              rect_pad_width: 2.5,
              rect_pad_height: 2,
              rect_border_radius: 0.3,
            },
            {
              type: "pcb_plated_hole",
              shape: "rotated_pill_hole_with_rect_pad",
              x: 0,
              y: 0,
              layers: ["top", "bottom"],
              hole_width: 0.8,
              hole_height: 1.6,
              hole_ccw_rotation: 45,
              rect_pad_width: 2.5,
              rect_pad_height: 2,
              rect_ccw_rotation: 45,
              rect_border_radius: 0.3,
            },
            {
              type: "pcb_smtpad",
              shape: "rect",
              x: 4,
              y: 0,
              width: 2,
              height: 1,
              layer: "top",
              rect_border_radius: 0.3,
            },
            {
              type: "pcb_smtpad",
              shape: "rotated_rect",
              x: 8,
              y: 0,
              width: 2,
              height: 1,
              layer: "top",
              ccw_rotation: 45,
              rect_border_radius: 0.3,
            },
          ] as any
        }
      />
    </div>
  )
}

export default RectBorderRadius
