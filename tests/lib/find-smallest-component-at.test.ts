import { expect, test } from "bun:test"
import { findSmallestComponentAt } from "../../src/lib/find-smallest-component-at"

const big = {
  pcb_component_id: "big",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
} as const

const small = {
  pcb_component_id: "small",
  center: { x: 0, y: 0 },
  width: 6,
  height: 4,
} as const

const elsewhere = {
  pcb_component_id: "elsewhere",
  center: { x: 100, y: 100 },
  width: 2,
  height: 2,
} as const

test("prefers the smallest overlapping component", () => {
  expect(findSmallestComponentAt([big, small], { x: 0, y: 0 })?.pcb_component_id).toBe(
    "small",
  )
  // order-independent: smallest wins even when listed last
  expect(findSmallestComponentAt([small, big], { x: 0, y: 0 })?.pcb_component_id).toBe(
    "small",
  )
})

test("returns null when nothing contains the point", () => {
  expect(findSmallestComponentAt([big, small], { x: 50, y: 50 })).toBeNull()
  expect(findSmallestComponentAt([], { x: 0, y: 0 })).toBeNull()
})

test("padding extends the hit area", () => {
  // point just outside small (half-width 3), inside with padding 2
  expect(findSmallestComponentAt([small], { x: 4, y: 0 }, 0)).toBeNull()
  expect(
    findSmallestComponentAt([small], { x: 4, y: 0 }, 2)?.pcb_component_id,
  ).toBe("small")
})

test("ignores components that do not contain the point", () => {
  expect(
    findSmallestComponentAt([big, elsewhere], { x: 0, y: 0 })?.pcb_component_id,
  ).toBe("big")
})
