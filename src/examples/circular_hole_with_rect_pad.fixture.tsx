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
              shape: "circular_hole_with_rect_pad",
              layers: ["top", "bottom"],
              port_hints: ["1"],
              pcb_port_id: "pcb_port_100",
              hole_diameter: 0.6,
              rect_pad_width: 2,
              rect_pad_height: 2,
              pcb_component_id: "pcb_component_100",
              pcb_plated_hole_id: "pcb_plated_hole_100",
              hole_offset_x: 0.5,
              hole_offset_y: 0.6,
            },
          ] as any
        }
      />
    </div>
  )
}
export default PlatedHoleRotatedPillWithRectPad
