import { PCBViewer } from "../PCBViewer"

export const PlatedHoleRotatedPillWithRectPad: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              x: 0,
              y: 0,
              type: "pcb_plated_hole",
              shape: "rotated_pill_hole_with_rect_pad",
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "pcb_port_1001",
              hole_height: 2,
              hole_width: 4,
              hole_ccw_rotation: 45,
              rect_pad_width: 5,
              rect_pad_height: 3,
              rect_ccw_rotation: 45,
              pcb_component_id: "pcb_component_1001",
              pcb_plated_hole_id: "pcb_plated_hole_1001",
            },
            {
              x: 6,
              y: 0,
              type: "pcb_plated_hole",
              shape: "rotated_pill_hole_with_rect_pad",
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "pcb_port_1002",
              hole_height: 2,
              hole_width: 4,
              hole_ccw_rotation: 0,
              rect_pad_width: 5,
              rect_pad_height: 3,
              rect_ccw_rotation: 0,
              pcb_component_id: "pcb_component_1002",
              pcb_plated_hole_id: "pcb_plated_hole_1002",
            },
          ] as any
        }
      />
    </div>
  )
}

export default PlatedHoleRotatedPillWithRectPad
