import { PCBViewer } from "../PCBViewer"

export const RotatedPillHole = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_rotated_pill_0",
              center: { x: 0, y: 0 },
              thickness: 1.6,
              num_layers: 2,
              width: 20,
              height: 12,
              outline: undefined,
              material: "fr4",
            },
            {
              type: "pcb_hole",
              pcb_hole_id: "pcb_hole_rotated_pill_0",
              x: -4,
              y: 0,
              hole_shape: "pill",
              hole_width: 2.5,
              hole_height: 5,
              ccw_rotation: 45,
            },
            {
              type: "pcb_hole",
              pcb_hole_id: "pcb_hole_rotated_pill_1",
              x: 4,
              y: 0,
              hole_shape: "pill",
              hole_width: 2.5,
              hole_height: 5,
              ccw_rotation: 0,
            },
          ] as any
        }
      />
    </div>
  )
}

export default RotatedPillHole
