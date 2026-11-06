import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { createStore } from "../src/global-store"
import { LAYER_NAME_TO_COLOR } from "../src/lib/Drawer"
import { applyEditEvents } from "../src/lib/apply-edit-events"
import colors from "../src/lib/colors"
import { convertElementToPrimitives } from "../src/lib/convert-element-to-primitive"

test("toggles move footprint mode via setEditMode and applies component location edits", async () => {
  const store = createStore()
  expect(store.getState().in_move_footprint_mode).toBe(false)
  expect(store.getState().in_edit_mode).toBe(false)

  store.getState().setEditMode("move_footprint")
  expect(store.getState().in_move_footprint_mode).toBe(true)
  expect(store.getState().in_edit_mode).toBe(true)

  store.getState().setEditMode("off")
  expect(store.getState().in_move_footprint_mode).toBe(false)
  expect(store.getState().in_edit_mode).toBe(false)

  const preEnabledStore = createStore({ in_move_footprint_mode: true })
  expect(preEnabledStore.getState().in_move_footprint_mode).toBe(true)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 12,
      height: 8,
      thickness: 1.4,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: -2.5, y: 0 },
      width: 2.4,
      height: 1.2,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      pcb_component_id: "pcb_component_1",
      shape: "rect",
      x: -3.2,
      y: 0,
      width: 0.8,
      height: 0.9,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      pcb_component_id: "pcb_component_1",
      shape: "rect",
      x: -1.8,
      y: 0,
      width: 0.8,
      height: 0.9,
      layer: "top",
    },
  ]

  const editedCircuitJson = applyEditEvents({
    circuitJson,
    editEvents: [
      {
        edit_event_id: "move_1",
        edit_event_type: "edit_pcb_component_location",
        pcb_edit_event_type: "edit_component_location",
        pcb_component_id: "pcb_component_1",
        original_center: { x: -2.5, y: 0 },
        new_center: { x: 2.5, y: 1.2 },
        in_progress: false,
        created_at: 1,
      },
    ],
  })

  const beforePrimitives = circuitJson.flatMap((el) =>
    convertElementToPrimitives(el, circuitJson),
  )
  const afterPrimitives = editedCircuitJson.flatMap((el) =>
    convertElementToPrimitives(el, editedCircuitJson),
  )

  const renderPads = (
    primitives: ReturnType<typeof convertElementToPrimitives>,
    opacity: number,
    strokeDasharray?: string,
  ) =>
    primitives
      .filter((p) => p.pcb_drawing_type === "rect" && p.layer === "top")
      .map((p) => {
        if (p.pcb_drawing_type !== "rect") return ""
        const dashAttr = strokeDasharray
          ? ` stroke="#ffffff" stroke-width="0.08" stroke-dasharray="${strokeDasharray}"`
          : ""
        return `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" fill="${LAYER_NAME_TO_COLOR.top}" opacity="${opacity}"${dashAttr}/>`
      })
      .join("\n    ")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="-6 -4 12 8">
  <title>Move Components mode footprint relocation</title>
  <rect x="-6" y="-4" width="12" height="8" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    ${renderPads(beforePrimitives, 0.35, "0.2 0.15")}
    ${renderPads(afterPrimitives, 1)}
    <line x1="-2.5" y1="0" x2="2.5" y2="1.2" stroke="#00e5ff" stroke-width="0.1" stroke-dasharray="0.25 0.15"/>
  </g>
</svg>`

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
