import { expect, test } from "bun:test"
import { createStore } from "../src/global-store"

test("PCB notes are shown by default and can be hidden", () => {
  const store = createStore()

  expect(store.getState().is_showing_pcb_notes).toBe(true)

  store.getState().setIsShowingPcbNotes(false)

  expect(store.getState().is_showing_pcb_notes).toBe(false)
})

test("DRC warnings are shown by default and can be hidden", () => {
  const store = createStore()

  expect(store.getState().is_showing_drc_warnings).toBe(true)

  store.getState().setIsShowingDrcWarnings(false)

  expect(store.getState().is_showing_drc_warnings).toBe(false)
})

test("setEditMode turns footprint movement on and off", () => {
  const store = createStore()

  expect(store.getState().in_move_footprint_mode).toBe(false)
  expect(store.getState().in_edit_mode).toBe(false)

  store.getState().setEditMode("move_footprint")

  expect(store.getState().in_move_footprint_mode).toBe(true)
  expect(store.getState().in_edit_mode).toBe(true)
  expect(store.getState().is_moving_component).toBe(false)

  store.getState().setEditMode("off")

  expect(store.getState().in_move_footprint_mode).toBe(false)
  expect(store.getState().in_edit_mode).toBe(false)
})

test("initialState can start the viewer in move-footprint mode", () => {
  const store = createStore({ in_move_footprint_mode: true })

  expect(store.getState().in_move_footprint_mode).toBe(true)
})
