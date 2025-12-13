import { PCBViewer } from "../../PCBViewer"

export const HoleWithPolygonPadFixture = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "board_0",
              center: { x: 0, y: 0 },
              width: 40,
              height: 40,
              material: "fr4",
              num_layers: 2,
              thickness: 1.6,
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_1",
              hole_shape: "circle",
              hole_diameter: 1.5,
              x: -10,
              y: 10,
              hole_offset_x: 0,
              hole_offset_y: 0,
              pad_outline: [
                { x: -2, y: -2 },
                { x: 2, y: -2 },
                { x: 2, y: 2 },
                { x: -2, y: 2 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_2",
              hole_shape: "oval",
              hole_width: 1.2,
              hole_height: 2.0,
              x: 0,
              y: 10,
              hole_offset_x: 0.5,
              hole_offset_y: -0.5,
              pad_outline: [
                { x: -3, y: -3 },
                { x: 3, y: -3 },
                { x: 3, y: 3 },
                { x: -3, y: 3 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_3",
              hole_shape: "pill",
              hole_width: 2.0,
              hole_height: 1.0,
              x: 10,
              y: 10,
              hole_offset_x: 0,
              hole_offset_y: 0,
              pad_outline: [
                { x: -1.5, y: -2 },
                { x: 1.5, y: -2 },
                { x: 2.5, y: 0 },
                { x: 1.5, y: 2 },
                { x: -1.5, y: 2 },
                { x: -2.5, y: 0 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_4",
              hole_shape: "rotated_pill",
              hole_width: 1.5,
              hole_height: 3.0,
              x: -10,
              y: 0,
              hole_offset_x: 1.0,
              hole_offset_y: 0.5,
              pad_outline: [
                { x: -2, y: -3 },
                { x: 3, y: -3 },
                { x: 4, y: 0 },
                { x: 3, y: 3 },
                { x: -2, y: 3 },
                { x: -3, y: 0 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_5",
              hole_shape: "circle",
              hole_diameter: 1.0,
              x: 0,
              y: 0,
              hole_offset_x: 0,
              hole_offset_y: 0,
              pad_outline: [
                { x: -2, y: -2 },
                { x: 2, y: -2 },
                { x: 2, y: 2 },
                { x: -2, y: 2 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_6",
              hole_shape: "oval",
              hole_width: 1.5,
              hole_height: 2.5,
              x: 10,
              y: 0,
              hole_offset_x: -0.8,
              hole_offset_y: 0.3,
              pad_outline: [
                { x: -2.5, y: -3 },
                { x: 2.5, y: -3 },
                { x: 3, y: 0 },
                { x: 2.5, y: 3 },
                { x: -2.5, y: 3 },
                { x: -3, y: 0 },
              ],
              layers: ["top", "bottom"],
            },

            {
              type: "pcb_plated_hole",
              shape: "hole_with_polygon_pad",
              pcb_plated_hole_id: "hole_polygon_7",
              hole_shape: "pill",
              hole_width: 2.5,
              hole_height: 1.2,
              x: 0,
              y: -10,
              hole_offset_x: 0.5,
              hole_offset_y: -0.3,
              pad_outline: [
                { x: -3, y: -2.5 },
                { x: 3, y: -2.5 },
                { x: 3.5, y: 0 },
                { x: 3, y: 2.5 },
                { x: -3, y: 2.5 },
                { x: -3.5, y: 0 },
              ],
              layers: ["top", "bottom"],
            },
          ] as any
        }
      />
    </div>
  )
}

export default HoleWithPolygonPadFixture
