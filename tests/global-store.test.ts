import { expect, test } from "bun:test";
import { createStore } from "../src/global-store";

test("PCB notes are shown by default and can be hidden", () => {
  const store = createStore();

  expect(store.getState().is_showing_pcb_notes).toBe(true);

  store.getState().setIsShowingPcbNotes(false);

  expect(store.getState().is_showing_pcb_notes).toBe(false);
});

test("DRC warnings are shown by default and can be hidden", () => {
  const store = createStore();

  expect(store.getState().is_showing_drc_warnings).toBe(true);

  store.getState().setIsShowingDrcWarnings(false);

  expect(store.getState().is_showing_drc_warnings).toBe(false);
});
