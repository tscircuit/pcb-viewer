import { expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { filterElementsByComponentSideVisibility } from "lib/filter-elements-by-component-side-visibility"
import { getPickablePcbComponents } from "lib/get-pickable-pcb-components"
import { createComponentPickingFixture } from "../component-visibility-picking/fixture"

const throughHoleIds = ["component_pth_top", "component_pth_bottom"]

test("valid layer-bearing through-hole components are pickable from either side", () => {
  const elements = createComponentPickingFixture()
  for (const element of elements) any_circuit_element.parse(element)
  const visibility = { showTopComponents: true, showBottomComponents: true }
  expect(
    getPickablePcbComponents(elements, "top", visibility).map(
      (c) => c.pcb_component_id,
    ),
  ).toEqual(["component_top", ...throughHoleIds])
  expect(
    getPickablePcbComponents(elements, "bottom", visibility).map(
      (c) => c.pcb_component_id,
    ),
  ).toEqual(["component_bottom", ...throughHoleIds])
})

test("side visibility never hides or disables owned plated holes", () => {
  const elements = createComponentPickingFixture()
  for (const selectedLayer of ["top", "bottom"] as const) {
    expect(
      getPickablePcbComponents(elements, selectedLayer, {
        showTopComponents: false,
        showBottomComponents: false,
      }).map((c) => c.pcb_component_id),
    ).toEqual(throughHoleIds)
  }
  expect(
    getPickablePcbComponents(elements, "top", {
      showTopComponents: false,
      showBottomComponents: true,
    }).map((c) => c.pcb_component_id),
  ).toEqual(throughHoleIds)
  expect(
    getPickablePcbComponents(elements, "bottom", {
      showTopComponents: true,
      showBottomComponents: false,
    }).map((c) => c.pcb_component_id),
  ).toEqual(throughHoleIds)
})

test("renderer and picker agree on visible through-hole components", () => {
  const elements = createComponentPickingFixture()
  const visibility = { showTopComponents: false, showBottomComponents: false }
  const visible = filterElementsByComponentSideVisibility(elements, visibility)
  expect(
    visible
      .filter((e) => e.type === "pcb_component")
      .map((c) => c.pcb_component_id),
  ).toEqual(throughHoleIds)
  expect(visible.filter((e) => e.type === "pcb_plated_hole")).toHaveLength(2)
  expect(
    getPickablePcbComponents(elements, "bottom", visibility).map(
      (c) => c.pcb_component_id,
    ),
  ).toEqual(throughHoleIds)
})

test("component filtering leaves source data and positions unchanged", () => {
  const elements = createComponentPickingFixture()
  const before = structuredClone(elements)
  const visibility = { showTopComponents: false, showBottomComponents: true }
  getPickablePcbComponents(elements, "bottom", visibility)
  filterElementsByComponentSideVisibility(elements, visibility)
  expect(elements).toEqual(before)
})
