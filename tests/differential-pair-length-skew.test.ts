import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace, Point } from "circuit-json"
import { getDifferentialPairLengthSkews } from "../src/lib/get-differential-pair-length-skew"

const sameLayerRoute = (
  id: string,
  start: Point,
  end: Point,
): AnyCircuitElement[] => [
  {
    type: "source_trace",
    source_trace_id: id,
    connected_source_port_ids: [`${id}-start`, `${id}-end`],
    connected_source_net_ids: [],
  },
  ...[start, end].map(
    (point, index): AnyCircuitElement => ({
      type: "pcb_port",
      pcb_port_id: `${id}-pcb-${index}`,
      pcb_component_id: "component",
      source_port_id: `${id}-${index === 0 ? "start" : "end"}`,
      layers: ["top"],
      ...point,
    }),
  ),
  {
    type: "pcb_trace",
    pcb_trace_id: `${id}-pcb-trace`,
    source_trace_id: id,
    route: [
      {
        route_type: "wire",
        layer: "top",
        width: 0.1,
        start_pcb_port_id: `${id}-pcb-0`,
        ...start,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.1,
        end_pcb_port_id: `${id}-pcb-1`,
        ...end,
      },
    ],
  },
]

const pair = (tolerance?: number): AnyCircuitElement[] => [
  {
    type: "source_bus",
    source_bus_id: "bus",
    name: "DQS",
    source_trace_ids: ["p", "n"],
    max_length_skew: tolerance,
    differential_pair: {
      positive_source_trace_id: "p",
      negative_source_trace_id: "n",
    },
  },
  ...sameLayerRoute("p", { x: 0, y: 0 }, { x: 3, y: 4 }),
  ...sameLayerRoute("n", { x: 10, y: 0 }, { x: 16, y: 0 }),
]

test("measures end to end even with no parallel segments or overlay", () => {
  const [result] = getDifferentialPairLengthSkews(pair(1))
  expect(result).toMatchObject({
    sourceBusId: "bus",
    name: "DQS",
    positiveTraceId: "p-pcb-trace",
    negativeTraceId: "n-pcb-trace",
    positiveLengthMm: 5,
    negativeLengthMm: 6,
    lengthSkewMm: 1,
    toleranceMm: 1,
    passesTolerance: true,
  })
  expect(getDifferentialPairLengthSkews(pair(0.9))[0]?.passesTolerance).toBe(
    false,
  )
  expect(getDifferentialPairLengthSkews(pair())[0]?.passesTolerance).toBeNull()
})

test("includes the board's via travel rather than trusting cached trace_length", () => {
  const elements = pair()
  const n = elements.find(
    (e): e is PcbTrace => e.type === "pcb_trace" && e.source_trace_id === "n",
  )!
  // The two traces have the same planar lengths after this modification.
  n.trace_length = 999
  n.route = [
    { route_type: "wire", x: 10, y: 0, layer: "top", width: 0.1 },
    {
      route_type: "via",
      x: 11,
      y: 0,
      from_layer: "top",
      to_layer: "inner1",
    },
    { route_type: "wire", x: 15, y: 0, layer: "inner1", width: 0.1 },
  ]
  const nEnd = elements.find(
    (e) => e.type === "pcb_port" && e.pcb_port_id === "n-pcb-1",
  )
  if (!nEnd || nEnd.type !== "pcb_port") throw new Error("Missing test port")
  nEnd.layers = ["inner1"]
  nEnd.x = 15
  elements.push({
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 4,
    thickness: 1.2,
    material: "fr4",
  })
  const [result] = getDifferentialPairLengthSkews(elements)
  expect(result?.positiveLengthMm).toBe(5)
  expect(result?.negativeLengthMm).toBeCloseTo(5.4, 8)
  expect(result?.lengthSkewMm).toBeCloseTo(0.4, 8)
  elements.push({
    type: "pcb_stackup",
    pcb_stackup_id: "stackup",
    pcb_board_id: "board",
    layers: [
      { layer_type: "copper", layer: "top", thickness: 0.04 },
      { layer_type: "dielectric", thickness: 0.12 },
      { layer_type: "copper", layer: "inner1", thickness: 0.02 },
    ],
  })
  expect(getDifferentialPairLengthSkews(elements)[0]?.lengthSkewMm).toBeCloseTo(
    0.17,
    8,
  )
})

test("reports incomplete or ambiguous routes as unavailable, not zero", () => {
  const elements = pair(1)
  const positive = elements.find(
    (e): e is PcbTrace => e.type === "pcb_trace" && e.source_trace_id === "p",
  )!
  const complete = positive.route
  positive.trace_length = 5
  const last = complete[1]
  if (!last || last.route_type !== "wire") throw new Error("Missing test wire")
  positive.route = [complete[0]!, { ...last, x: 2 }]
  const [incomplete] = getDifferentialPairLengthSkews(elements)
  expect(incomplete?.negativeLengthMm).toBe(6)
  expect(incomplete?.positiveLengthMm).toBeNull()
  expect(incomplete?.lengthSkewMm).toBeNull()
  expect(incomplete?.passesTolerance).toBeNull()

  positive.route = complete
  elements.push({ ...positive, pcb_trace_id: "another-route" })
  expect(getDifferentialPairLengthSkews(elements)[0]?.lengthSkewMm).toBeNull()
})

test("the AM3352 DQS1 route is nearly matched end to end despite skew in the overlay", async () => {
  const elements: AnyCircuitElement[] = await Bun.file(
    new URL(
      "../src/examples/2026/differential-pair-phase-skew/am3352-ddr-track-a.circuit.json",
      import.meta.url,
    ),
  ).json()
  const result = getDifferentialPairLengthSkews(elements).find(
    (row) => row.name === "DDR_DQS_PAIR1",
  )
  expect(result?.positiveLengthMm).toBeCloseTo(20.157966, 5)
  expect(result?.negativeLengthMm).toBeCloseTo(20.157479, 5)
  expect(result?.lengthSkewMm).toBeCloseTo(0.000487, 6)
  expect(result?.toleranceMm).toBeNull()
  const overlay = elements.find(
    (e) =>
      e.type === "pcb_differential_pair_phase_skew" &&
      e.source_bus_id === result?.sourceBusId,
  )
  if (!overlay || overlay.type !== "pcb_differential_pair_phase_skew") {
    throw new Error("Missing DQS1 overlay")
  }
  expect(
    overlay.positive_trace.segments[0]?.start_length_difference_mm,
  ).toBeCloseTo(-1.00148, 5)
  expect(
    overlay.positive_trace.segments.at(-1)?.end_length_difference_mm,
  ).toBeCloseTo(-0.84583, 5)
})
