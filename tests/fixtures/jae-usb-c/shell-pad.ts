import type { PcbHoleWithPolygonPad } from "circuit-json"

// Original ground land for the JAE DX07S024JJ2 shell's 0.6 × 1.9 mm slot.
// The copper extension puts the drill 0.6 mm left and above the land origin.
export const jaeShellPad: PcbHoleWithPolygonPad = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "jae_shell_pad",
  shape: "hole_with_polygon_pad",
  x: 10,
  y: 5,
  port_hints: ["SH"],
  hole_shape: "pill",
  hole_width: 0.6,
  hole_height: 1.9,
  hole_offset_x: -0.6,
  hole_offset_y: 0.6,
  layers: ["top", "bottom"],
  pad_outline: [
    { x: -1.2, y: -0.55 },
    { x: 0.55, y: -0.55 },
    { x: 0.55, y: 0.55 },
    { x: 0, y: 0.55 },
    { x: 0, y: 1.75 },
    { x: -1.2, y: 1.75 },
  ],
}
