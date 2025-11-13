import { PCBViewer } from "../PCBViewer"

export const RectangularHole = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_rect_hole_0",
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
              pcb_hole_id: "pcb_hole_rect_0",
              x: -4,
              y: 0,
              hole_shape: "rect",
              hole_width: 3,
              hole_height: 2,
            },
            {
              type: "pcb_hole",
              pcb_hole_id: "pcb_hole_circle_0",
              x: 4,
              y: 0,
              hole_shape: "circle",
              hole_diameter: 2,
            },
            {
              type: "pcb_hole",
              pcb_hole_id: "pcb_hole_rect_1",
              x: 0,
              y: -4,
              hole_shape: "rect",
              hole_width: 2,
              hole_height: 4,
            },
          ] as any
        }
      />
    </div>
  )
}

export default RectangularHole
