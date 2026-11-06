import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement, PcbBoard, PcbSmtPad } from "circuit-json"
import { LAYER_NAME_TO_COLOR } from "../../src/lib/Drawer"
import colors from "../../src/lib/colors"
import { normalizePcbPanelElement } from "../../src/lib/draw-pcb-panel"
import { getPcbViewportBounds } from "../../src/lib/get-pcb-viewport-bounds"

test("centers a half-size offset panel around origin-centered boards", async () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      width: 50,
      height: 20,
      thickness: 1.6,
      covered_with_solder_mask: true,
      center: { x: 25, y: 10 },
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: -11, y: 0 },
      width: 20,
      height: 15,
      material: "fr4",
      num_layers: 2,
      thickness: 1.4,
      position_mode: "relative_to_panel_anchor",
      display_offset_x: "-11mm",
      display_offset_y: "0mm",
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      center: { x: 11, y: 0 },
      width: 20,
      height: 15,
      material: "fr4",
      num_layers: 2,
      thickness: 1.4,
      position_mode: "relative_to_panel_anchor",
      display_offset_x: "11mm",
      display_offset_y: "0mm",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "r1_pad1",
      layer: "top",
      shape: "rect",
      x: -11.5,
      y: 0,
      width: 0.6,
      height: 0.6,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "r1_pad2",
      layer: "top",
      shape: "rect",
      x: -10.5,
      y: 0,
      width: 0.6,
      height: 0.6,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "r2_pad1",
      layer: "top",
      shape: "rect",
      x: 10.5,
      y: 0,
      width: 0.6,
      height: 0.6,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "r2_pad2",
      layer: "top",
      shape: "rect",
      x: 11.5,
      y: 0,
      width: 0.6,
      height: 0.6,
    },
  ]

  const panel = elements[0]
  if (panel.type !== "pcb_panel") throw new Error("Expected pcb_panel")

  const normalizedPanel = normalizePcbPanelElement(panel, elements)
  expect(normalizedPanel.center).toEqual({ x: 0, y: 0 })

  expect(getPcbViewportBounds(elements)).toEqual({
    center: { x: 0, y: 0 },
    width: 50,
    height: 20,
  })

  const boards = elements.filter(
    (el): el is PcbBoard => el.type === "pcb_board",
  )
  const pads = elements.filter(
    (el): el is Extract<PcbSmtPad, { shape: "rect" }> =>
      el.type === "pcb_smtpad" && el.shape === "rect",
  )

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="-30 -15 60 30">
  <title>Centered 50x20mm panel enclosing two 20x15mm boards</title>
  <rect x="-30" y="-15" width="60" height="30" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    <rect x="${normalizedPanel.center.x - normalizedPanel.width / 2}" y="${normalizedPanel.center.y - normalizedPanel.height / 2}" width="${normalizedPanel.width}" height="${normalizedPanel.height}" fill="none" stroke="rgba(255, 255, 255, 0.7)" stroke-width="0.25"/>
${boards
  .map(
    (b) =>
      `    <rect x="${b.center.x - b.width! / 2}" y="${b.center.y - b.height! / 2}" width="${b.width}" height="${b.height}" fill="none" stroke="rgba(255, 255, 255, 0.5)" stroke-width="0.2"/>`,
  )
  .join("\n")}
${pads
  .map(
    (p) =>
      `    <rect x="${p.x - p.width / 2}" y="${p.y - p.height / 2}" width="${p.width}" height="${p.height}" fill="${LAYER_NAME_TO_COLOR.top}"/>`,
  )
  .join("\n")}
  </g>
</svg>`

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
