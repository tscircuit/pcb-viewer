import { expect, test } from "bun:test"
import {
  any_circuit_element,
  type AnyCircuitElement,
  type PcbPort,
} from "circuit-json"
import {
  createReturnCurrentExperimentFromTrace,
  getReturnCurrentGroundCandidates,
  getReturnCurrentTraceTerminals,
  type CreateReturnCurrentExperimentFromTraceOptions,
} from "../../../src/lib/return-current/experiment"

function board(): AnyCircuitElement[] {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_main",
      center: { x: 0, y: 0 },
      width: 8,
      height: 6,
      thickness: 0.8,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_net",
      source_net_id: "source_net_ground",
      name: "GND",
      is_ground: true,
      member_source_group_ids: [],
    },
    {
      type: "source_net",
      source_net_id: "source_net_power",
      name: "VCC",
      member_source_group_ids: [],
    },
  ]
  for (const [component, x, signal] of [
    ["U1", -2, "OUT"],
    ["U2", 2, "IN"],
  ] as const) {
    elements.push({
      type: "source_component",
      ftype: "simple_chip",
      source_component_id: `source_component_${component}`,
      name: component,
    })
    for (const [name, y] of [
      [signal, 0],
      ["GND", 1.5],
    ] as const)
      elements.push(
        {
          type: "source_port",
          source_port_id: `source_port_${component}_${name}`,
          source_component_id: `source_component_${component}`,
          name,
        },
        {
          type: "pcb_port",
          pcb_port_id: `pcb_port_${component}_${name}`,
          source_port_id: `source_port_${component}_${name}`,
          x,
          y,
          layers: ["top"],
        },
        {
          type: "pcb_smtpad",
          shape: "rect",
          pcb_smtpad_id: `pcb_smtpad_${component}_${name}`,
          pcb_port_id: `pcb_port_${component}_${name}`,
          x,
          y,
          width: 0.8,
          height: 0.8,
          layer: "top",
        },
      )
    elements.push({
      type: "source_trace",
      source_trace_id: `source_trace_ground_${component}`,
      connected_source_port_ids: [`source_port_${component}_GND`],
      connected_source_net_ids: ["source_net_ground"],
    })
  }
  elements.push(
    {
      type: "source_trace",
      source_trace_id: "source_trace_signal",
      connected_source_port_ids: ["source_port_U1_OUT", "source_port_U2_IN"],
      connected_source_net_ids: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_signal",
      source_trace_id: "source_trace_signal",
      route: [
        {
          route_type: "wire",
          x: -2,
          y: 0,
          layer: "top",
          width: 0.18,
          start_pcb_port_id: "pcb_port_U1_OUT",
        },
        {
          route_type: "wire",
          x: 2,
          y: 0,
          layer: "top",
          width: 0.18,
          end_pcb_port_id: "pcb_port_U2_IN",
        },
      ],
    },
  )
  return elements
}

function options(
  circuitJson = board(),
): CreateReturnCurrentExperimentFromTraceOptions {
  return {
    circuitJson,
    pcbTraceId: "pcb_trace_signal",
    sourcePcbPortId: "pcb_port_U1_OUT",
    loadPcbPortId: "pcb_port_U2_IN",
    returnSourcePcbPortId: "pcb_port_U2_GND",
    returnSinkPcbPortId: "pcb_port_U1_GND",
    groundSourceNetId: "source_net_ground",
    sourceCurrentA: 0.005,
    sourceResistanceOhms: 25,
    loadResistanceOhms: 100,
  }
}

function port(elements: AnyCircuitElement[], id: string): PcbPort {
  return elements.find(
    (element) => element.type === "pcb_port" && element.pcb_port_id === id,
  ) as PcbPort
}

test("a clicked complete trace resolves readable physical endpoint and ground candidates", () => {
  const circuitJson = board()
  const terminals = getReturnCurrentTraceTerminals(
    circuitJson,
    "pcb_trace_signal",
  )
  expect(terminals.source).toMatchObject({
    pcbPortId: "pcb_port_U1_OUT",
    label: "U1.OUT",
    x: -2,
    y: 0,
    layers: ["top"],
  })
  expect(terminals.loadPcbPortId).toBe("pcb_port_U2_IN")
  const grounds = getReturnCurrentGroundCandidates(
    circuitJson,
    "source_net_ground",
  )
  expect(grounds.map((candidate) => candidate.label)).toEqual([
    "U1.GND",
    "U2.GND",
  ])
  expect(grounds[0].sourceNets).toEqual([
    { sourceNetId: "source_net_ground", label: "GND", isGround: true },
  ])
})

test("synthetic official records preserve every original object and route, including prior experiments", () => {
  const circuitJson = board()
  const saved = JSON.stringify(circuitJson)
  const first = createReturnCurrentExperimentFromTrace(options(circuitJson))
  expect(JSON.stringify(circuitJson)).toBe(saved)
  for (let i = 0; i < circuitJson.length; i++)
    expect(first.circuitJson[i]).toBe(circuitJson[i])
  const experiment = first.circuitJson.at(-2)!
  const excitation = first.circuitJson.at(-1)!
  expect(any_circuit_element.safeParse(experiment).success).toBe(true)
  expect(any_circuit_element.safeParse(excitation).success).toBe(true)
  expect(experiment).toMatchObject({
    type: "simulation_experiment",
    simulation_experiment_id: first.experimentId,
    experiment_type: "pcb_return_current",
  })
  expect(excitation).toMatchObject({
    simulation_experiment_id: first.experimentId,
    simulation_return_current_excitation_id: first.excitationId,
    current: 0.005,
    return_source: {
      contact_type: "pcb_port",
      pcb_port_id: "pcb_port_U2_GND",
      x: 2,
      y: 1.5,
      layer: "top",
    },
    return_sink: { pcb_port_id: "pcb_port_U1_GND", x: -2, y: 1.5 },
    source_port: {
      signal_pcb_port_id: "pcb_port_U1_OUT",
      reference_pcb_port_id: "pcb_port_U1_GND",
      resistance: 25,
    },
    load_port: {
      signal_pcb_port_id: "pcb_port_U2_IN",
      reference_pcb_port_id: "pcb_port_U2_GND",
      resistance: 100,
    },
  })
  const second = createReturnCurrentExperimentFromTrace(
    options(first.circuitJson),
  )
  expect(second.experimentId).not.toBe(first.experimentId)
  expect(second.excitationId).not.toBe(first.excitationId)
  expect(second.circuitJson.slice(0, first.circuitJson.length)).toEqual(
    first.circuitJson,
  )
  expect(experiment).not.toHaveProperty("frequency_hz")
})

test("driver reversal changes terminal pairs while retaining the original trace ordering", () => {
  const input = options()
  const result = createReturnCurrentExperimentFromTrace({
    ...input,
    sourcePcbPortId: input.loadPcbPortId,
    loadPcbPortId: input.sourcePcbPortId,
    returnSourcePcbPortId: input.returnSinkPcbPortId,
    returnSinkPcbPortId: input.returnSourcePcbPortId,
  })
  expect(result.circuitJson.at(-2)).toMatchObject({
    name: "Return current: U2.IN to U1.OUT",
  })
  expect(result.circuitJson.at(-1)).toMatchObject({
    source_port: {
      signal_pcb_port_id: "pcb_port_U2_IN",
      reference_pcb_port_id: "pcb_port_U2_GND",
    },
    load_port: {
      signal_pcb_port_id: "pcb_port_U1_OUT",
      reference_pcb_port_id: "pcb_port_U1_GND",
    },
  })
  expect(
    result.circuitJson.find((element) => element.type === "pcb_trace"),
  ).toBe(input.circuitJson.find((element) => element.type === "pcb_trace")!)
})

test("GND pin names, proximity, and standalone vias never establish a return contact", () => {
  const circuitJson = board()
  const groundTrace = circuitJson.find(
    (element) =>
      element.type === "source_trace" &&
      element.source_trace_id === "source_trace_ground_U2",
  )!
  if (groundTrace.type !== "source_trace")
    throw new Error("Missing fixture trace")
  groundTrace.connected_source_net_ids = ["source_net_power"]
  expect(
    getReturnCurrentGroundCandidates(circuitJson, "source_net_ground").map(
      (candidate) => candidate.label,
    ),
  ).toEqual(["U1.GND"])
  expect(() =>
    createReturnCurrentExperimentFromTrace(options(circuitJson)),
  ).toThrow("electrically connected")
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options(),
      returnSourcePcbPortId: "pcb_via_ground",
    }),
  ).toThrow("physical PCB pad")
})

test("same-layer coincident, missing, shorted and reused signal references are rejected", () => {
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options(),
      returnSinkPcbPortId: "pcb_port_U1_OUT",
    }),
  ).toThrow("four distinct")
  const coincident = board()
  port(coincident, "pcb_port_U1_GND").y = 0
  expect(() =>
    createReturnCurrentExperimentFromTrace(options(coincident)),
  ).toThrow("cannot coincide")
  const shorted = board()
  shorted.push({
    type: "source_trace",
    source_trace_id: "source_trace_short",
    connected_source_port_ids: ["source_port_U1_OUT"],
    connected_source_net_ids: ["source_net_ground"],
  })
  expect(() =>
    createReturnCurrentExperimentFromTrace(options(shorted)),
  ).toThrow("electrically grounded")
})

test("endpoint matching refuses ambiguous, stale and branched routes", () => {
  const ambiguous = board()
  const trace = ambiguous.find((element) => element.type === "pcb_trace")!
  if (trace.type !== "pcb_trace" || trace.route[0].route_type !== "wire")
    throw new Error("Missing fixture route")
  delete trace.route[0].start_pcb_port_id
  const original = port(ambiguous, "pcb_port_U1_OUT")
  ambiguous.push(
    { ...original, pcb_port_id: "pcb_port_duplicate_location" },
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "pcb_smtpad_duplicate_location",
      pcb_port_id: "pcb_port_duplicate_location",
      x: -2,
      y: 0,
      width: 0.8,
      height: 0.8,
      layer: "top",
    },
  )
  expect(() =>
    getReturnCurrentTraceTerminals(ambiguous, "pcb_trace_signal"),
  ).toThrow("exactly one physical pad")
  const stale = board()
  port(stale, "pcb_port_U1_OUT").x = -2.5
  expect(() =>
    getReturnCurrentTraceTerminals(stale, "pcb_trace_signal"),
  ).toThrow("exactly one physical pad")
  const branched = board()
  const sourceTrace = branched.find(
    (element) =>
      element.type === "source_trace" &&
      element.source_trace_id === "source_trace_signal",
  )!
  if (sourceTrace.type !== "source_trace")
    throw new Error("Missing fixture source trace")
  sourceTrace.connected_source_port_ids.push("source_port_third_branch")
  expect(() =>
    getReturnCurrentTraceTerminals(branched, "pcb_trace_signal"),
  ).toThrow("branched")
})

test("plated return pads need an explicit valid contact layer", () => {
  const circuitJson = board().filter(
    (element) =>
      !(
        element.type === "pcb_smtpad" &&
        element.pcb_port_id === "pcb_port_U1_GND"
      ),
  )
  port(circuitJson, "pcb_port_U1_GND").layers = ["top", "bottom"]
  circuitJson.push({
    type: "pcb_plated_hole",
    shape: "circle",
    pcb_plated_hole_id: "pcb_plated_hole_ground",
    pcb_port_id: "pcb_port_U1_GND",
    x: -2,
    y: 1.5,
    outer_diameter: 0.8,
    hole_diameter: 0.2,
    layers: ["top", "bottom"],
  })
  expect(() =>
    createReturnCurrentExperimentFromTrace(options(circuitJson)),
  ).toThrow("choose its contact layer")
  expect(() =>
    createReturnCurrentExperimentFromTrace({
      ...options(circuitJson),
      returnSinkLayer: "inner1",
    }),
  ).toThrow("no physical pad")
  const result = createReturnCurrentExperimentFromTrace({
    ...options(circuitJson),
    returnSinkLayer: "bottom",
  })
  expect(result.circuitJson.at(-1)).toMatchObject({
    return_sink: { layer: "bottom" },
    source_port: { reference_layer: "bottom" },
  })
})

test("invalid amplitudes, resistances and duplicated input identifiers are rejected", () => {
  for (const key of [
    "sourceCurrentA",
    "sourceResistanceOhms",
    "loadResistanceOhms",
  ] as const)
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() =>
        createReturnCurrentExperimentFromTrace({ ...options(), [key]: value }),
      ).toThrow("greater than zero")
  const duplicated = board()
  duplicated.push(duplicated[0])
  expect(() =>
    createReturnCurrentExperimentFromTrace(options(duplicated)),
  ).toThrow("duplicate element")
})
