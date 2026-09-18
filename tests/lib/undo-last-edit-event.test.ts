import { expect, test } from "bun:test"
import type { ManualEditEvent } from "@tscircuit/props"
import { undoLastEditEvent } from "../../src/lib/undo-last-edit-event"

const move = (id: string, in_progress: boolean): ManualEditEvent =>
  ({
    edit_event_id: id,
    edit_event_type: "edit_pcb_component_location",
    pcb_edit_event_type: "edit_component_location",
    pcb_component_id: "pcb_component_1",
    original_center: { x: 0, y: 0 },
    new_center: { x: 1, y: 0 },
    in_progress,
    created_at: 1,
  }) as ManualEditEvent

test("undoLastEditEvent removes the last completed footprint move", () => {
  const events = [move("a", false), move("b", false)]

  expect(undoLastEditEvent(events).map((e) => e.edit_event_id)).toEqual(["a"])
})

test("undoLastEditEvent skips an in-progress drag and drops the previous move", () => {
  const events = [move("a", false), move("b", true)]

  expect(undoLastEditEvent(events).map((e) => e.edit_event_id)).toEqual(["b"])
})

test("undoLastEditEvent is a no-op when nothing has been dropped yet", () => {
  const events = [move("drag", true)]

  expect(undoLastEditEvent(events)).toBe(events)
  expect(undoLastEditEvent([])).toEqual([])
})
