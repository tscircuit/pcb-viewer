import { expect, test } from "bun:test"
import { getUnconnectedRatsNestLines } from "../../src/lib/get-unconnected-rats-nest-lines"
import {
  makeRatsNestCircuit,
  makeRatsNestTrace,
  wire,
} from "../fixtures/rats-nest-circuit"

test("keeps one airwire from the nearest routed island port to an unrouted port", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [2, 0],
    [5, 0],
  ])
  circuit.push(
    makeRatsNestTrace("trace-ab", [
      wire([0, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([2, 0], { end_pcb_port_id: "pcb_port_1" }),
    ]),
  )
  const lines = getUnconnectedRatsNestLines(circuit)
  expect(lines).toHaveLength(1)
  expect([lines[0].startPcbPortId, lines[0].endPcbPortId]).toEqual([
    "pcb_port_1",
    "pcb_port_2",
  ])
})

test("recognizes geometric joins across trace records without direct endpoint IDs", () => {
  const circuit = makeRatsNestCircuit([
    [-4, 0],
    [4, 0],
  ])
  circuit.push(
    makeRatsNestTrace("trace-left", [
      wire([-4, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([0, 0]),
    ]),
    makeRatsNestTrace("trace-right", [
      wire([0, 0]),
      wire([4, 0], { end_pcb_port_id: "pcb_port_1" }),
    ]),
  )
  expect(getUnconnectedRatsNestLines(circuit)).toEqual([])
})

test("recognizes connectivity through an intermediate port", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [2, 0],
    [4, 0],
  ])
  circuit.push(
    makeRatsNestTrace("trace-ab", [
      wire([0, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([2, 0], { end_pcb_port_id: "pcb_port_1" }),
    ]),
    makeRatsNestTrace("trace-bc", [
      wire([2, 0], { start_pcb_port_id: "pcb_port_1" }),
      wire([4, 0], { end_pcb_port_id: "pcb_port_2" }),
    ]),
  )
  expect(getUnconnectedRatsNestLines(circuit)).toEqual([])
})

test("does not join closer ports belonging to different intended nets", () => {
  const circuit = makeRatsNestCircuit(
    [
      [0, 0],
      [10, 0],
      [0.1, 0],
      [10.1, 0],
    ],
    [
      [0, 1],
      [2, 3],
    ],
  )
  expect(
    getUnconnectedRatsNestLines(circuit).map((line) => [
      line.startPcbPortId,
      line.endPcbPortId,
    ]),
  ).toEqual([
    ["pcb_port_0", "pcb_port_1"],
    ["pcb_port_2", "pcb_port_3"],
  ])
})

test("crossing traces on separate copper layers stay unconnected", () => {
  const circuit = makeRatsNestCircuit([
    [-2, 0],
    [0, -2],
  ])
  for (const element of circuit) {
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_1") {
      element.layers = ["bottom"]
    }
  }
  circuit.push(
    makeRatsNestTrace("trace-top", [
      wire([-2, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([2, 0]),
    ]),
    makeRatsNestTrace("trace-bottom", [
      wire([0, -2], { layer: "bottom", start_pcb_port_id: "pcb_port_1" }),
      wire([0, 2], { layer: "bottom" }),
    ]),
  )
  expect(getUnconnectedRatsNestLines(circuit)).toHaveLength(1)
})

test("an explicit via transition connects the top and bottom route segments", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [4, 0],
  ])
  for (const element of circuit) {
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_1") {
      element.layers = ["bottom"]
    }
  }
  circuit.push(
    makeRatsNestTrace("trace-via", [
      wire([0, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([2, 0]),
      { route_type: "via", x: 2, y: 0, from_layer: "top", to_layer: "bottom" },
      wire([2, 0], { layer: "bottom" }),
      wire([4, 0], { layer: "bottom", end_pcb_port_id: "pcb_port_1" }),
    ]),
  )
  expect(getUnconnectedRatsNestLines(circuit)).toEqual([])
})

test("joins each disconnected island once, without duplicate lines or cycles", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [1, 0],
    [4, 0],
    [10, 0],
  ])
  const lines = getUnconnectedRatsNestLines(circuit)
  expect(lines.map((line) => [line.startPoint.x, line.endPoint.x])).toEqual([
    [0, 1],
    [1, 4],
    [4, 10],
  ])
})

test("explicit component-internal connections suppress only their own airwire", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [1, 0],
    [4, 0],
  ])
  for (const element of circuit) {
    if (
      element.type === "source_port" &&
      element.source_port_id === "source_port_1"
    ) {
      element.source_component_id = "source_component_0"
      element.name = "2"
      element.pin_number = 2
    }
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_1") {
      element.pcb_component_id = "pcb_component_0"
    }
  }
  circuit.push({
    type: "source_component",
    source_component_id: "source_component_0",
    ftype: "simple_chip",
    name: "U1",
    internally_connected_source_port_ids: [["source_port_0", "source_port_1"]],
  })
  const lines = getUnconnectedRatsNestLines(circuit)
  expect(lines).toHaveLength(1)
  expect([lines[0].startPcbPortId, lines[0].endPcbPortId]).toEqual([
    "pcb_port_1",
    "pcb_port_2",
  ])
})

test("internal-connection elements also suppress already connected pins", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [1, 0],
  ])
  for (const element of circuit) {
    if (
      element.type === "source_port" &&
      element.source_port_id === "source_port_1"
    ) {
      element.source_component_id = "source_component_0"
      element.name = "2"
      element.pin_number = 2
    }
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_1") {
      element.pcb_component_id = "pcb_component_0"
    }
  }
  circuit.push({
    type: "source_component_internal_connection",
    source_component_internal_connection_id: "internal-connection",
    source_component_id: "source_component_0",
    source_port_ids: ["source_port_0", "source_port_1"],
  })
  expect(getUnconnectedRatsNestLines(circuit)).toEqual([])
})

test("named-net styling accepts custom IDs without a source_net prefix", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [1, 0],
  ])
  for (const element of circuit) {
    if (element.type === "source_trace")
      element.connected_source_net_ids = ["GND"]
  }
  expect(getUnconnectedRatsNestLines(circuit)[0].isInNet).toBe(true)
})

test("empty and single-port nets do not invent an airwire", () => {
  expect(getUnconnectedRatsNestLines([])).toEqual([])
  expect(getUnconnectedRatsNestLines(makeRatsNestCircuit([[0, 0]]))).toEqual([])
})

test("internal connections preserve separate routed islands with sparse net IDs", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [0, 10],
    [0, 20],
    [4, 20],
  ])
  for (const [portIndex, y] of [
    [0, 0],
    [1, 10],
  ]) {
    circuit.push(
      makeRatsNestTrace(`trace-${portIndex}`, [
        wire([0, y], { start_pcb_port_id: `pcb_port_${portIndex}` }),
        wire([2, y]),
      ]),
    )
  }
  for (const element of circuit) {
    if (
      element.type === "source_port" &&
      element.source_port_id === "source_port_3"
    ) {
      element.source_component_id = "source_component_2"
      element.name = "2"
      element.pin_number = 2
    }
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_3") {
      element.pcb_component_id = "pcb_component_2"
    }
  }
  circuit.push({
    type: "source_component",
    source_component_id: "source_component_2",
    ftype: "simple_chip",
    name: "U1",
    internally_connected_source_port_ids: [["source_port_2", "source_port_3"]],
  })
  expect(getUnconnectedRatsNestLines(circuit)).toHaveLength(2)
})

test("custom port IDs cannot collide with generated routed island IDs", () => {
  const circuit = makeRatsNestCircuit([
    [0, 0],
    [2, 0],
    [5, 0],
  ])
  for (const element of circuit) {
    if (element.type === "pcb_port" && element.pcb_port_id === "pcb_port_2") {
      element.pcb_port_id = "connectivity_net0"
    }
  }
  circuit.push(
    makeRatsNestTrace("trace-ab", [
      wire([0, 0], { start_pcb_port_id: "pcb_port_0" }),
      wire([2, 0], { end_pcb_port_id: "pcb_port_1" }),
    ]),
  )
  const lines = getUnconnectedRatsNestLines(circuit)
  expect(lines).toHaveLength(1)
  expect(lines[0].endPcbPortId).toBe("connectivity_net0")
})
