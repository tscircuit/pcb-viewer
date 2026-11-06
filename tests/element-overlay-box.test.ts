import { expect, test } from "bun:test"
import { getTextForHighlightedPrimitive } from "../src/components/ElementOverlayBox"
import type { HighlightedPrimitive } from "../src/components/MouseElementTracker"

const base = {
  _pcb_drawing_object_id: "obj-1",
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  screen_x: 0,
  screen_y: 0,
  screen_w: 10,
  screen_h: 10,
} as const

test("trace label shows the length", () => {
  const primitive = {
    ...base,
    _element: { type: "pcb_trace", trace_length: 12.34567 },
  } as unknown as HighlightedPrimitive

  expect(getTextForHighlightedPrimitive(primitive)).toBe("12.346")
})

test("trace without length has no label", () => {
  const primitive = {
    ...base,
    _element: { type: "pcb_trace" },
  } as unknown as HighlightedPrimitive

  expect(getTextForHighlightedPrimitive(primitive)).toBe("")
})

test("pad label joins parent name and port hints", () => {
  const primitive = {
    ...base,
    _element: { type: "pcb_smtpad", port_hints: ["1", "VCC"] },
    _parent_source_component: { name: "U1" },
  } as unknown as HighlightedPrimitive

  // numeric hints are dropped, parent name prefixes the rest
  expect(getTextForHighlightedPrimitive(primitive)).toBe("U1.VCC")
})

test("pad label falls back to parent name alone", () => {
  const primitive = {
    ...base,
    _element: { type: "pcb_smtpad", port_hints: [] },
    _parent_source_component: { name: "R3" },
  } as unknown as HighlightedPrimitive

  expect(getTextForHighlightedPrimitive(primitive)).toBe("R3")
})

test("unnamed parents and ports produce no label", () => {
  const primitive = {
    ...base,
    _element: { type: "pcb_smtpad", port_hints: ["unnamed_1"] },
    _parent_source_component: { name: "unnamed_C5" },
  } as unknown as HighlightedPrimitive

  expect(getTextForHighlightedPrimitive(primitive)).toBe("")
})
