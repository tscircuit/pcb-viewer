import { PCBViewer } from "../PCBViewer"

export const PlatedHoleSoldermaskOverlay: React.FC = () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 25,
      height: 25,
    },
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
      x: -4,
      y: 0,
      outer_diameter: 3,
      hole_diameter: 1.4,
      shape: "circle",
      layer: "top",
      is_covered_with_solder_mask: true,
      pcb_component_id: "pcb_generic_component_0",
      port_hints: [],
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
      is_covered_with_solder_mask: true,
    },
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
      is_covered_with_solder_mask: true,
    },
    {
      x: 3,
      y: 3,
      type: "pcb_plated_hole",
      shape: "circular_hole_with_rect_pad",
      layers: ["top", "bottom"],
      port_hints: ["1"],
      pcb_port_id: "pcb_port_100",
      hole_diameter: 1,
      rect_pad_width: 2,
      rect_pad_height: 2,
      pcb_component_id: "pcb_component_100",
      pcb_plated_hole_id: "pcb_plated_hole_100",
      is_covered_with_solder_mask: true,
    },
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default PlatedHoleSoldermaskOverlay
