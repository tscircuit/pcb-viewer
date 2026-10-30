import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import sitaraCircuitJson from "../fixtures/tmds62levm-off-board-notes.circuit.json"

export type ViewportScenario = "sitara" | "panel" | "multiple_boards"

export function createViewportCircuitJson({
  scenario,
  panelWidth = 80,
  secondBoardX = 30,
  componentX = 0,
}: {
  scenario: ViewportScenario
  panelWidth?: number
  secondBoardX?: number
  componentX?: number
}): AnyCircuitElement[] {
  if (scenario === "sitara") return sitaraCircuitJson as AnyCircuitElement[]

  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "first_board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  }
  const elements: AnyCircuitElement[] = [
    board,
    {
      type: "pcb_component",
      pcb_component_id: "resistor",
      source_component_id: "source_resistor",
      center: { x: componentX, y: 0 },
      width: 2,
      height: 2,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "resistor_pad",
      pcb_component_id: "resistor",
      shape: "rect",
      x: componentX,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    },
  ]

  if (scenario === "panel") {
    elements.push({
      type: "pcb_panel",
      pcb_panel_id: "panel",
      center: { x: 0, y: 0 },
      width: panelWidth,
      height: 60,
      thickness: 1.6,
      covered_with_solder_mask: false,
    })
  } else {
    elements.push({
      ...board,
      pcb_board_id: "second_board",
      center: { x: secondBoardX, y: 0 },
    })
  }
  return elements
}
