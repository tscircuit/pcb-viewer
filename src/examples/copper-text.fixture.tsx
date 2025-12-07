import type React from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../PCBViewer"

export const CopperText: React.FC = () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 50,
      height: 40,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // === TRACES UNDERNEATH KNOCKOUT TEXT TO VERIFY SEE-THROUGH ===
    // Diagonal trace under "KNOCKOUT" text on top layer
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_under_knockout_bottom",
      route: [
        { route_type: "wire", x: -8, y: 13, width: 0.5, layer: "bottom" },
        { route_type: "wire", x: 8, y: 17, width: 0.5, layer: "bottom" },
      ],
    },
    // Horizontal trace under "ROT+KO TOP" text
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_under_rotko_bottom",
      route: [
        { route_type: "wire", x: -6, y: 3, width: 0.4, layer: "bottom" },
        { route_type: "wire", x: 6, y: 3, width: 0.4, layer: "bottom" },
      ],
    },
    // Trace under "BOTTOM KO" on bottom layer

    // Top layer basic text
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_top_basic",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "TOP LAYER",
      layer: "top",
      anchor_position: { x: -15, y: 15 },
      anchor_alignment: "center",
    },
    // Bottom layer basic text
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_bottom_basic",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "BOTTOM LAYER",
      layer: "bottom",
      anchor_position: { x: -15, y: 10 },
      anchor_alignment: "center",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -15, y: 17 },
      anchor_alignment: "center",
      text: "TOP LAYER",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "bottom",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      font: "tscircuit2024",
      font_size: 0.7,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: -15, y: 8 },
      anchor_alignment: "center",
      text: "BOTTOM LAYER",
    },
    // Text with knockout on top layer (using default padding)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_knockout_top",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 1,
      text: "KNOCKOUT",
      layer: "top",
      anchor_position: { x: 0, y: 15 },
      anchor_alignment: "center",
      is_knockout: true,
    },
    // Text with knockout on bottom layer (using default padding)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_knockout_bottom",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "BOTTOM KO",
      layer: "bottom",
      anchor_position: { x: 0, y: 10 },
      anchor_alignment: "center",
      is_knockout: true,
    },
    // Rotated text 45° on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_rotated_45_top",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.5,
      text: "45° TOP",
      layer: "top",
      anchor_position: { x: 15, y: 15 },
      anchor_alignment: "center",
      ccw_rotation: 45,
    },
    // Rotated text 90° on bottom layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_rotated_90_bottom",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.5,
      text: "90° BOTTOM",
      layer: "bottom",
      anchor_position: { x: 15, y: 10 },
      anchor_alignment: "center",
      ccw_rotation: 90,
    },
    // Rotated text with knockout on top layer (using default padding)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_rotated_knockout_top",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "ROT+KO TOP",
      layer: "top",
      anchor_position: { x: 0, y: 3 },
      anchor_alignment: "center",
      ccw_rotation: 15,
      is_knockout: true,
    },
    // Rotated text with knockout on bottom layer (using default padding)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_rotated_knockout_bottom",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "ROT+KO BTM",
      layer: "bottom",
      anchor_position: { x: 0, y: -2 },
      anchor_alignment: "center",
      ccw_rotation: -15,
      is_knockout: true,
    },
    // Mirrored text on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_mirrored_top",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.5,
      text: "MIRROR",
      layer: "top",
      anchor_position: { x: 15, y: 3 },
      anchor_alignment: "center",
      is_mirrored: true,
    },
    // Multi-line text on bottom layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_multiline_bottom",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.5,
      text: "MULTI\nLINE\nBOTTOM",
      layer: "bottom",
      anchor_position: { x: 15, y: -4 },
      anchor_alignment: "center",
    },
    // Different anchor alignments on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_top_left",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "TL",
      layer: "top",
      anchor_position: { x: -20, y: -12 },
      anchor_alignment: "top_left",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_bottom_right",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "BR",
      layer: "bottom",
      anchor_position: { x: -10, y: -12 },
      anchor_alignment: "bottom_right",
    },
    // Combined: bottom + rotation + knockout + multiline (using default padding)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text_all_features",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      font_size: 0.7,
      text: "ALL\nFEATURES",
      layer: "bottom",
      anchor_position: { x: -15, y: -13 },
      anchor_alignment: "center",
      ccw_rotation: 25,
      is_knockout: true,
    },
  ]
  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "500px" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default CopperText
