import type React from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../PCBViewer"

export const CopperText: React.FC = () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Normal copper text on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct1",
      pcb_component_id: "comp1",
      text: "TOP",
      layer: "top",
      font_size: 1.5,
      anchor_position: { x: -10, y: 8 },
      anchor_alignment: "center",
    } as unknown as AnyCircuitElement,
    // Normal copper text on bottom layer (auto-mirrored)
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct2",
      pcb_component_id: "comp1",
      text: "BOT",
      layer: "bottom",
      font_size: 1.5,
      anchor_position: { x: 10, y: 8 },
      anchor_alignment: "center",
    } as unknown as AnyCircuitElement,
    // Rotated copper text on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct3",
      pcb_component_id: "comp1",
      text: "ROTATED",
      layer: "top",
      font_size: 1,
      anchor_position: { x: -10, y: 0 },
      anchor_alignment: "center",
      ccw_rotation: 45,
    } as unknown as AnyCircuitElement,
    // Knockout copper text on top layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct4",
      pcb_component_id: "comp1",
      text: "KNOCKOUT",
      layer: "top",
      font_size: 1.2,
      anchor_position: { x: 8, y: 0 },
      anchor_alignment: "center",
      is_knockout: true,
    } as unknown as AnyCircuitElement,
    // Knockout copper text on bottom layer
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct5",
      pcb_component_id: "comp1",
      text: "KO-BOT",
      layer: "bottom",
      font_size: 1,
      anchor_position: { x: -10, y: -8 },
      anchor_alignment: "center",
      is_knockout: true,
    } as unknown as AnyCircuitElement,
    // Knockout with custom padding
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "ct6",
      pcb_component_id: "comp1",
      text: "PAD",
      layer: "top",
      font_size: 1,
      anchor_position: { x: 10, y: -8 },
      anchor_alignment: "center",
      is_knockout: true,
      knockout_padding: {
        left: 1,
        right: 1,
        top: 0.8,
        bottom: 0.8,
      },
    } as unknown as AnyCircuitElement,
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "500px" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default CopperText
