import { PCBViewer } from "../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const AsymmetricSoldermaskMargin = () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 14,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    // Rectangle with asymmetric positive margins
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_pos_asym",
      shape: "rect",
      layer: "top",
      x: -4,
      y: 2,
      width: 2,
      height: 1,
      soldermask_margin_left: 0.5,
      soldermask_margin_right: 0.1,
      soldermask_margin_top: 0.2,
      soldermask_margin_bottom: 0.8,
    },
    // Rectangle with asymmetric negative margins
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rect_neg_asym",
      shape: "rect",
      layer: "top",
      x: -4,
      y: -2,
      width: 2,
      height: 1.5,
      soldermask_margin_left: -0.2,
      soldermask_margin_right: -0.6,
      soldermask_margin_top: -0.1,
      soldermask_margin_bottom: -0.4,
    },
    // Rotated rectangle with asymmetric positive margins
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rot_rect_pos_asym",
      shape: "rotated_rect",
      layer: "top",
      x: 4,
      y: 2,
      width: 2,
      height: 1,
      ccw_rotation: 45,
      soldermask_margin_left: 0.8,
      soldermask_margin_right: 0.2,
      soldermask_margin_top: 0.1,
      soldermask_margin_bottom: 0.5,
    },
    // Rotated rectangle with asymmetric negative margins
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rot_rect_neg_asym",
      shape: "rotated_rect",
      layer: "top",
      x: 4,
      y: -2,
      width: 2,
      height: 1.5,
      ccw_rotation: 30,
      soldermask_margin_left: -0.5,
      soldermask_margin_right: -0.1,
      soldermask_margin_top: -0.4,
      soldermask_margin_bottom: -0.2,
    },
    // Labels
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text1",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: -4, y: 3.5 },
      anchor_alignment: "center",
      text: "Rect Pos Asym",
      font_size: 0.4,
      font: "tscircuit2024",
    } as any,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text2",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: -4, y: -3.8 },
      anchor_alignment: "center",
      text: "Rect Neg Asym",
      font_size: 0.4,
      font: "tscircuit2024",
    } as any,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text3",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 4, y: 3.8 },
      anchor_alignment: "center",
      text: "Rot Rect Pos Asym",
      font_size: 0.4,
      font: "tscircuit2024",
    } as any,
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "text4",
      pcb_component_id: "comp1",
      layer: "top",
      anchor_position: { x: 4, y: -3.8 },
      anchor_alignment: "center",
      text: "Rot Rect Neg Asym",
      font_size: 0.4,
      font: "tscircuit2024",
    } as any,
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuit} />
    </div>
  )
}

export default AsymmetricSoldermaskMargin
