import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  filterHiddenComponentElements,
  isComponentPickable,
} from "../../src/lib/component-visibility"

const topChip = {
  type: "pcb_component",
  pcb_component_id: "top-chip",
  layer: "top",
  center: { x: 0, y: 0 },
  width: 6,
  height: 3,
} as const

const bottomChip = {
  type: "pcb_component",
  pcb_component_id: "bottom-chip",
  layer: "bottom",
  center: { x: 10, y: 0 },
  width: 6,
  height: 3,
} as const

const topPad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad-1",
  pcb_component_id: "top-chip",
  layer: "top",
} as unknown as AnyCircuitElement

const bottomPad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad-2",
  pcb_component_id: "bottom-chip",
  layer: "bottom",
} as unknown as AnyCircuitElement

const freeTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace-1",
} as unknown as AnyCircuitElement

test("picker respects the selected copper layer", () => {
  const all = { showTopComponents: true, showBottomComponents: true }

  expect(isComponentPickable(topChip, "top", all)).toBe(true)
  expect(isComponentPickable(topChip, "bottom", all)).toBe(false)
  expect(isComponentPickable(bottomChip, "bottom", all)).toBe(true)
  expect(isComponentPickable(bottomChip, "top", all)).toBe(false)
  // inner layers hold no components
  expect(isComponentPickable(topChip, "inner1", all)).toBe(false)
})

test("picker respects the visibility toggles", () => {
  expect(
    isComponentPickable(topChip, "top", {
      showTopComponents: false,
      showBottomComponents: true,
    }),
  ).toBe(false)
  expect(
    isComponentPickable(bottomChip, "bottom", {
      showTopComponents: true,
      showBottomComponents: false,
    }),
  ).toBe(false)
  expect(
    isComponentPickable(bottomChip, "bottom", {
      showTopComponents: false,
      showBottomComponents: true,
    }),
  ).toBe(true)
})

test("components without a layer stay pickable", () => {
  expect(
    isComponentPickable({} as any, "bottom", {
      showTopComponents: false,
      showBottomComponents: false,
    }),
  ).toBe(true)
})

test("hidden-side component visuals are filtered, everything else kept", () => {
  const soup = [topChip, bottomChip, topPad, bottomPad, freeTrace].map((e) =>
    JSON.parse(JSON.stringify(e)),
  ) as AnyCircuitElement[]

  const filtered = filterHiddenComponentElements(soup, {
    showTopComponents: false,
    showBottomComponents: true,
  })
  const ids = filtered.map(
    (e: any) => e.pcb_smtpad_id ?? e.pcb_trace_id ?? e.pcb_component_id,
  )

  // the top pad is gone, its component entry stays (renders nothing),
  // the bottom side and the free trace are untouched
  expect(ids).toEqual(["top-chip", "bottom-chip", "pad-2", "trace-1"])
})

test("no filtering when both sides are shown", () => {
  const soup = [topPad, freeTrace] as AnyCircuitElement[]
  expect(
    filterHiddenComponentElements(soup, {
      showTopComponents: true,
      showBottomComponents: true,
    }),
  ).toBe(soup)
})
