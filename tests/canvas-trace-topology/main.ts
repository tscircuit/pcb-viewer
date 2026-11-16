import type { AnyCircuitElement, LayerRef, PcbTrace } from "circuit-json"
import { compose, scale, translate, applyToPoint } from "transformation-matrix"
import { drawPcbTraceElementsForLayer } from "../../src/lib/draw-pcb-trace"
import type { Primitive } from "../../src/lib/types"
import circuitJson from "../../src/examples/2026/repros/nema17-canvas-shorts/nema17.circuit.json"

const transform = compose(translate(600, 500), scale(40, -40))
const wire = (x: number, y: number, layer: LayerRef) =>
  ({ route_type: "wire", x, y, layer, width: 0.2 }) as const
const throughPad = (x: number, from: LayerRef, to: LayerRef) =>
  ({
    route_type: "through_pad",
    start: { x, y: 0 },
    end: { x, y: 0 },
    start_layer: from,
    end_layer: to,
    width: 0.2,
    pcb_plated_hole_id: `pad_${x}`,
  }) as const
const via = (x: number, from: LayerRef, to: LayerRef) =>
  ({ route_type: "via", x, y: 0, from_layer: from, to_layer: to }) as const

const cases = [
  {
    name: "through-pad",
    transitions: [
      throughPad(-2, "top", "inner1"),
      throughPad(2, "inner1", "top"),
    ],
  },
  {
    name: "via",
    transitions: [via(-2, "top", "inner1"), via(2, "inner1", "top")],
  },
  { name: "layer-change", transitions: [] },
].map(({ name, transitions }) => ({
  type: "pcb_trace",
  pcb_trace_id: name,
  route: [
    wire(-4, 0, "top"),
    wire(-2, 0, "top"),
    ...transitions.slice(0, 1),
    wire(-2, 0, "inner1"),
    wire(-2, 2, "inner1"),
    wire(2, 2, "inner1"),
    wire(2, 0, "inner1"),
    ...transitions.slice(1),
    wire(2, 0, "top"),
    wire(4, 0, "top"),
  ],
})) as PcbTrace[]

function render(
  trace: PcbTrace,
  layer: LayerRef,
  highlighted: boolean,
  matrix = transform,
) {
  const canvas = document.createElement("canvas")
  canvas.width = 1000
  canvas.height = 800
  const primitives = highlighted
    ? [
        {
          _element: trace,
          is_mouse_over: true,
        } as Primitive,
      ]
    : []
  drawPcbTraceElementsForLayer({
    canvas,
    elements: [trace] as AnyCircuitElement[],
    layers: [`${layer}_copper`],
    realToCanvasMat: matrix,
    primitives,
    showCopperPours: false,
  })
  return (x: number, y: number) => {
    const point = applyToPoint(matrix, { x, y })
    return canvas
      .getContext("2d")!
      .getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data[3]
  }
}

const results: Record<string, number> = {}
for (const highlighted of [false, true]) {
  for (const trace of cases) {
    const prefix = `${trace.pcb_trace_id}/${highlighted}`
    const top = render(trace, "top", highlighted)
    const inner = render(trace, "inner1", highlighted)
    results[`${prefix}/top-left`] = top(-3, 0)
    results[`${prefix}/top-right`] = top(3, 0)
    results[`${prefix}/false-bridge`] = top(0, 0)
    results[`${prefix}/hidden-inner`] = top(0, 2)
    results[`${prefix}/inner-run`] = inner(0, 2)
    results[`${prefix}/hidden-top`] = inner(-3, 0)
  }
  // The exact route responsible for the line across J_USB in the published board.
  const trace = circuitJson.find(
    (e) => e.type === "pcb_trace" && e.pcb_trace_id === "top_assembly_165",
  ) as PcbTrace
  const matrix = compose(translate(600, 780), scale(40, -40))
  results[`board/${highlighted}/false-bridge`] = render(
    trace,
    "top",
    highlighted,
    matrix,
  )(-7, 15.2943068)
  results[`board/${highlighted}/inner-run`] = render(
    trace,
    "inner1",
    highlighted,
    matrix,
  )(-7, 15.0419)
}

declare global {
  interface Window {
    canvasTraceTopologyResults: typeof results
  }
}
window.canvasTraceTopologyResults = results
