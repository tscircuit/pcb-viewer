import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { filterElementsByComponentSideVisibility } from "lib/filter-elements-by-component-side-visibility"

const elements = [
  {
    type: "pcb_component",
    pcb_component_id: "top_component",
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "top_pad",
    pcb_component_id: "top_component",
    layer: "top",
  },
  {
    type: "pcb_component",
    pcb_component_id: "bottom_component",
    layer: "bottom",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "bottom_pad",
    pcb_component_id: "bottom_component",
    layer: "bottom",
  },
  {
    type: "pcb_component",
    pcb_component_id: "through_hole_component",
    layer: "top",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "through_hole",
    pcb_component_id: "through_hole_component",
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    layer: "top",
  },
] as AnyCircuitElement[]

test("hides top-side SMT components and keeps through-hole components visible", () => {
  const filtered = filterElementsByComponentSideVisibility(elements, {
    showTopComponents: false,
    showBottomComponents: true,
  })

  expect(filtered.map((element) => element.type)).toContain("pcb_trace")
  expect(
    filtered.some(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "top_component",
    ),
  ).toBe(false)
  expect(
    filtered.some(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "bottom_component",
    ),
  ).toBe(true)
  expect(
    filtered.some(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "through_hole_component",
    ),
  ).toBe(true)
})

test("hides bottom-side SMT components", () => {
  const filtered = filterElementsByComponentSideVisibility(elements, {
    showTopComponents: true,
    showBottomComponents: false,
  })

  expect(
    filtered.some(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "top_component",
    ),
  ).toBe(true)
  expect(
    filtered.some(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "bottom_component",
    ),
  ).toBe(false)
})
