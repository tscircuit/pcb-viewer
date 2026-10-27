import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import snapshot from "../../../src/examples/2026/repros/am3352-dev-board/circuit.json"
import { getReturnCurrentTraceTerminals } from "../../../src/lib/return-current/experiment"

const board = snapshot as AnyCircuitElement[]
const selected = "fr_source_net_106_0"
const busTraceIds = new Set(
  board.flatMap((element) =>
    element.type === "source_bus" ? element.source_trace_ids : [],
  ),
)
const fragments = board.filter(
  (element) =>
    element.type === "pcb_trace" && busTraceIds.has(element.source_trace_id!),
)

test("all 154 AM3352 DDR fragments resolve the same two real terminals per signal, including via-only fragments", () => {
  const before = JSON.stringify(board)
  const bySignal = new Map<string, string>()
  expect(busTraceIds.size).toBe(22)
  expect(fragments.length).toBe(154)
  for (const fragment of fragments) {
    if (fragment.type !== "pcb_trace") continue
    const result = getReturnCurrentTraceTerminals(board, fragment.pcb_trace_id)
    const route = result.signalTrace!.route
    expect(route[0].route_type).toBe("wire")
    expect(route.at(-1)!.route_type).toBe("wire")
    expect(result.source.label).toStartWith("U1.")
    expect(result.load.label).toStartWith("U3.")
    expect(route.filter((point) => point.route_type === "via")).toHaveLength(3)
    const key = fragment.source_trace_id!
    const previous = bySignal.get(key)
    const signature = JSON.stringify([
      result.sourcePcbPortId,
      result.loadPcbPortId,
      route,
    ])
    if (previous) expect(signature).toBe(previous)
    bySignal.set(key, signature)
  }
  expect(JSON.stringify(board)).toBe(before)
})

test("DDR routing follows the actual inner2 and bottom path without shortening the through barrels", () => {
  const result = getReturnCurrentTraceTerminals(board, selected)
  expect([result.source.label, result.load.label]).toEqual(["U1.P1", "U3.F3"])
  expect(
    result
      .signalTrace!.route.filter((point) => point.route_type === "via")
      .map((point) => [point.from_layer, point.to_layer]),
  ).toEqual([
    ["top", "inner2"],
    ["inner2", "bottom"],
    ["bottom", "top"],
  ])
  const via = board.find(
    (element) =>
      element.type === "pcb_via" && element.pcb_via_id === "pcb_via_145",
  )!
  expect(via).toMatchObject({
    layers: ["top", "inner1", "inner2", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  })
})

test("missing vias, broken routes and branches never become invented connections", () => {
  expect(() =>
    getReturnCurrentTraceTerminals(
      board.filter(
        (element) =>
          element.type !== "pcb_via" || element.pcb_via_id !== "pcb_via_146",
      ),
      selected,
    ),
  ).toThrow("physical plated via")
  expect(() =>
    getReturnCurrentTraceTerminals(
      board.filter(
        (element) =>
          element.type !== "pcb_trace" ||
          element.pcb_trace_id !== "fr_source_net_106_1",
      ),
      selected,
    ),
  ).toThrow("endpoint")
  const branch = structuredClone(board)
  branch.push({
    type: "pcb_trace",
    pcb_trace_id: "branch",
    source_trace_id: "source_trace_225",
    route: [
      { route_type: "wire", x: 3.6, y: -10.525, layer: "top", width: 0.1 },
      { route_type: "wire", x: 4, y: -10.525, layer: "top", width: 0.1 },
    ],
  })
  expect(() => getReturnCurrentTraceTerminals(branch, selected)).toThrow(
    "branched",
  )
})

test("local margin surrounds the full DDR route and selected return pads without altering the board", async () => {
  const { getReturnCurrentRegion } = await import(
    "../../../src/lib/return-current/region"
  )
  const route = getReturnCurrentTraceTerminals(board, selected).signalTrace!
    .route
  const one = getReturnCurrentRegion(
    board,
    route,
    ["pcb_port_17", "pcb_port_393"],
    1,
  )
  const two = getReturnCurrentRegion(
    board,
    route,
    ["pcb_port_17", "pcb_port_393"],
    2,
  )
  expect(one.maxX - one.minX).toBeCloseTo(11.575052, 6)
  expect(one.maxY - one.minY).toBeCloseTo(12.450131, 6)
  expect(two.minX).toBeCloseTo(one.minX - 1, 8)
  expect(two.maxY).toBeCloseTo(one.maxY + 1, 8)
  expect(() => getReturnCurrentRegion(board, route, [], 0)).toThrow("margin")
  expect(() => getReturnCurrentRegion(board, route, [], NaN)).toThrow("margin")
})

test("AM3352 uses its real inner1 pour as an identified port contact without inventing copper", async () => {
  const { createReturnCurrentExperimentFromTrace } = await import(
    "../../../src/lib/return-current/experiment"
  )
  const options = {
    circuitJson: board,
    pcbTraceId: selected,
    sourcePcbPortId: "pcb_port_13",
    loadPcbPortId: "pcb_port_410",
    returnSourcePcbPortId: "",
    returnSinkPcbPortId: "",
    returnPourId: "pcb_copper_pour_0",
    groundSourceNetId: "source_net_4",
    sourceCurrentA: 0.005,
    sourceResistanceOhms: 25,
    loadResistanceOhms: 100,
  }
  const before = JSON.stringify(board)
  const result = createReturnCurrentExperimentFromTrace(options)
  expect(result.circuitJson.slice(0, -2)).toEqual(board)
  expect(JSON.stringify(board)).toBe(before)
  const excitation = result.circuitJson.at(-1)!
  expect(excitation).toMatchObject({
    return_source: {
      contact_type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_0",
      layer: "inner1",
      x: -1.599946,
      y: -17.000131,
    },
    return_sink: { contact_type: "pcb_copper_pour", layer: "inner1", x: 3.6 },
    source_port: {
      signal_pcb_port_id: "pcb_port_13",
      reference_layer: "inner1",
    },
  })
  expect(excitation).toHaveProperty("source_port.reference_pcb_port_id", undefined)
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options,
      returnPourId: "missing",
    }),
  ).toThrow("existing ground pour")
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options,
      groundSourceNetId: "source_net_106",
    }),
  ).toThrow("grounded")
  const withHole = structuredClone(board)
  const pour = withHole.find((e) => e.type === "pcb_copper_pour")!
  if (pour.type !== "pcb_copper_pour" || pour.shape !== "brep")
    throw new Error("fixture pour missing")
  pour.brep_shape.inner_rings.push({
    vertices: [
      { x: 3, y: -7.5 },
      { x: 4, y: -7.5 },
      { x: 4, y: -6 },
      { x: 3, y: -6 },
    ],
  })
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options,
      circuitJson: withHole,
    }),
  ).toThrow("does not cover")
})
