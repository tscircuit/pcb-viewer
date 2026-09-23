import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPadComponent } from "../../src/lib/get-pad-component"

const elements = [
  {
    type: "source_component",
    source_component_id: "source_u1",
    name: "U1",
    ftype: "simple_chip",
    manufacturer_part_number: "ATMEGA328P-AU",
  },
  {
    type: "source_component",
    source_component_id: "other_u1",
    name: "U1",
    ftype: "simple_chip",
    manufacturer_part_number: "OTHER",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_u1",
    source_component_id: "source_u1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 4,
    rotation: 0,
    layer: "top",
  },
] as AnyCircuitElement[]

for (const type of ["pcb_smtpad", "pcb_plated_hole"] as const) {
  test(`${type} resolves its owner by ID even with duplicate refdes and no net`, () => {
    const pad = { type, pcb_component_id: "pcb_u1" } as AnyCircuitElement
    expect(getPadComponent(pad, elements)).toEqual({
      source_component_id: "source_u1",
      pcb_component_id: "pcb_u1",
      refdes: "U1",
      manufacturer_part_number: "ATMEGA328P-AU",
    })
  })
}

test("missing component links and non-pad geometry have no component menu details", () => {
  const pad = {
    type: "pcb_smtpad",
    pcb_component_id: "missing",
  } as AnyCircuitElement
  expect(getPadComponent(pad, elements)).toBeUndefined()
  expect(
    getPadComponent(
      { ...pad, pcb_component_id: "pcb_u1" } as AnyCircuitElement,
      elements.filter((e) => e.type !== "source_component"),
    ),
  ).toBeUndefined()
  expect(getPadComponent(elements[2], elements)).toBeUndefined()
  expect(getPadComponent(undefined, elements)).toBeUndefined()
})

test("components without a part number still provide a navigation target", () => {
  const withoutMpn = elements.map((e) =>
    e.type === "source_component"
      ? { ...e, manufacturer_part_number: undefined }
      : e,
  )
  const result = getPadComponent(
    { type: "pcb_smtpad", pcb_component_id: "pcb_u1" } as AnyCircuitElement,
    withoutMpn,
  )
  expect(result?.source_component_id).toBe("source_u1")
  expect(result?.manufacturer_part_number).toBeUndefined()
})
