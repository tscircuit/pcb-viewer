import { expect, test } from "bun:test"
import "bun-match-svg"
import type { ManualEditEvent } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import { LAYER_NAME_TO_COLOR } from "../../src/lib/Drawer"
import {
  applyEditEvents,
  undoLastEditEvent,
} from "../../src/lib/apply-edit-events"
import colors from "../../src/lib/colors"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

const circuitJson: CircuitJson = [
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  },
]

test("circuit json is reused when there are no edit events", () => {
  expect(applyEditEvents({ circuitJson, editEvents: [] })).toBe(circuitJson)
})

test("circuit json is cloned before applying edit events", () => {
  const editedCircuitJson = applyEditEvents({
    circuitJson,
    editEvents: [
      {
        edit_event_id: "edit_event_0",
        edit_event_type: "edit_pcb_component_location",
        pcb_edit_event_type: "edit_component_location",
        created_at: 0,
        pcb_component_id: "pcb_component_0",
        original_center: { x: 0, y: 0 },
        new_center: { x: 4, y: 5 },
      },
    ],
  })

  expect(editedCircuitJson).not.toBe(circuitJson)
  expect(editedCircuitJson[0]).toMatchObject({ center: { x: 4, y: 5 } })
  expect(circuitJson[0]).toMatchObject({ center: { x: 0, y: 0 } })
})

test("undoLastEditEvent reverts the latest completed component drag", async () => {
  const boardCircuitJson: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 2, y: 0 },
      width: 10,
      height: 6,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      shape: "rect",
      x: -0.7,
      y: 0,
      width: 0.6,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_component_id: "pcb_component_0",
      shape: "rect",
      x: 0.7,
      y: 0,
      width: 0.6,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      stroke_width: 0.12,
      route: [
        { x: -1.1, y: -0.6 },
        { x: 1.1, y: -0.6 },
        { x: 1.1, y: 0.6 },
        { x: -1.1, y: 0.6 },
        { x: -1.1, y: -0.6 },
      ],
    },
  ]

  const editEvents: ManualEditEvent[] = [
    {
      edit_event_id: "edit_event_0",
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      created_at: 1,
      pcb_component_id: "pcb_component_0",
      original_center: { x: 0, y: 0 },
      new_center: { x: 4, y: 1.2 },
      in_progress: false,
    },
  ]

  const draggedCircuitJson = applyEditEvents({
    circuitJson: boardCircuitJson,
    editEvents,
  })
  const undoneEvents = undoLastEditEvent(editEvents)
  expect(undoneEvents).toEqual([])

  const undoneCircuitJson = applyEditEvents({
    circuitJson: boardCircuitJson,
    editEvents: undoneEvents,
  })

  expect(draggedCircuitJson[1]).toMatchObject({ center: { x: 4, y: 1.2 } })
  expect(undoneCircuitJson[1]).toMatchObject({ center: { x: 0, y: 0 } })
  expect(undoneCircuitJson[2]).toMatchObject({ x: -0.7, y: 0 })
  expect(undoneCircuitJson[3]).toMatchObject({ x: 0.7, y: 0 })

  const draggedPrimitives = draggedCircuitJson.flatMap((el) =>
    convertElementToPrimitives(el, draggedCircuitJson),
  )
  const undonePrimitives = undoneCircuitJson.flatMap((el) =>
    convertElementToPrimitives(el, undoneCircuitJson),
  )

  const renderPadsAndLines = (
    primitives: ReturnType<typeof convertElementToPrimitives>,
    opacity = 1,
  ) =>
    primitives
      .map((p) => {
        if (p.pcb_drawing_type === "rect" && p.layer === "top") {
          return `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" fill="${LAYER_NAME_TO_COLOR.top}" opacity="${opacity}"/>`
        }
        if (p.pcb_drawing_type === "line" && p.layer === "top_silkscreen") {
          return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${colors.board.user_2}" stroke-width="${p.width}" stroke-linecap="round" opacity="${opacity}"/>`
        }
        return ""
      })
      .filter(Boolean)
      .join("\n    ")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="-3 -3 10 6">
  <title>Component returned to original center after undoing drag-and-drop</title>
  <rect x="-3" y="-3" width="10" height="6" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    ${renderPadsAndLines(draggedPrimitives, 0.3)}
    ${renderPadsAndLines(undonePrimitives, 1)}
    <line x1="4" y1="1.2" x2="0" y2="0" stroke="#fff" stroke-width="0.08" stroke-dasharray="0.2 0.15"/>
  </g>
</svg>`

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
