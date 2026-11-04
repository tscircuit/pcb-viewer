import { expect, test } from "bun:test"
import { pickComponentAt } from "../src/components/EditPlacementOverlay"

const component = (id: string, layer: "top" | "bottom", x = 0, y = 0) => ({
  type: "pcb_component" as const,
  pcb_component_id: id,
  layer,
  center: { x, y },
  width: 2,
  height: 2,
} as any)

const soup = (): any[] => [component("top-1", "top"), component("bottom-1", "bottom")]

const point = { x: 0, y: 0 }

test("picks the component under the cursor", () => {
  expect(pickComponentAt(soup(), point, 0, "top")?.pcb_component_id).toBe("top-1")
})

test("ignores components on the side that is not selected", () => {
  // both symbols sit at the same spot; only the bottom one may be grabbed
  expect(pickComponentAt(soup(), point, 0, "bottom")?.pcb_component_id).toBe("bottom-1")
})

test("still picks top components that are not covered", () => {
  const elements = [component("top-far", "top", 20, 20), component("bottom-1", "bottom")]
  expect(pickComponentAt(elements, point, 0, "bottom")?.pcb_component_id).toBe("bottom-1")
  expect(pickComponentAt(elements, { x: 20, y: 20 }, 0, "bottom")).toBeNull()
})

test("empty space at the selected layer selects nothing", () => {
  expect(pickComponentAt(soup(), { x: 50, y: 50 }, 0, "bottom")).toBeNull()
})

test("inner layers leave every component pickable", () => {
  const picked = pickComponentAt(soup(), point, 0, "inner1")
  expect(picked?.pcb_component_id).toBe("top-1")
})

test("honours the tolerance used for hit testing", () => {
  const elements = [component("a", "bottom")]
  expect(pickComponentAt(elements, { x: 1.4, y: 0 }, 0.5, "bottom")).not.toBeNull()
  expect(pickComponentAt(elements, { x: 1.4, y: 0 }, 0.1, "bottom")).toBeNull()
})

test("ignores non-component elements", () => {
  const elements = [{ type: "pcb_trace", pcb_trace_id: "t" }, component("b", "top")]
  expect(pickComponentAt(elements as any, point, 0, "top")?.pcb_component_id).toBe("b")
})
