import { expect, test } from "bun:test"
import {
  convertElementToPrimitives,
  createPrimitiveMetadataIndex,
} from "../../src/lib/convert-element-to-primitive"

test("indexed metadata preserves component and port associations", () => {
  const elements = [
    { type: "source_component", source_component_id: "source", name: "R1" },
    {
      type: "pcb_component",
      pcb_component_id: "component",
      source_component_id: "source",
    },
    { type: "source_port", source_port_id: "source-port", name: "1" },
    { type: "pcb_port", pcb_port_id: "port", source_port_id: "source-port" },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      pcb_component_id: "component",
      pcb_port_id: "port",
      shape: "circle",
      radius: 1,
      x: 0,
      y: 0,
      layer: "top",
    },
  ] as any
  const legacy = convertElementToPrimitives(elements[4], elements)[0]
  const indexed = convertElementToPrimitives(
    elements[4],
    elements,
    createPrimitiveMetadataIndex(elements),
  )[0]
  expect(indexed._parent_pcb_component).toBe(legacy._parent_pcb_component)
  expect(indexed._parent_source_component).toBe(legacy._parent_source_component)
  expect(indexed._source_port).toBe(legacy._source_port)
  expect(indexed._source_port).toBe(elements[2])
})
