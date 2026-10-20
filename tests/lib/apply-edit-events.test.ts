import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { applyEditEvents } from "../../src/lib/apply-edit-events"

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
