import { expect, it } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import type { HighlightedPrimitive } from "../../src/components/MouseElementTracker"
import { filterTracesIfMultiple } from "../../src/lib/filter-traces-if-multiple"
import { createTraceOverlayElementIndex } from "../../src/lib/get-trace-overlay-text"
import type { Primitive } from "../../src/lib/types"
import { getPrimitiveBoundingBox } from "../../src/lib/util/get-primitive-bounding-box"
import { getPrimitiveSnapPoints } from "../../src/lib/util/get-primitive-snap-points"

it("keeps named trace overlays visible when ordinary trace lengths are hidden", () => {
  const pcbTrace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_net_0",
    route: [],
  }
  const elements = [
    pcbTrace,
    {
      type: "source_net",
      source_net_id: "source_net_0",
      name: "GND",
      member_source_group_ids: [],
    },
  ] as AnyCircuitElement[]
  const primitive = {
    _element: pcbTrace,
  } as HighlightedPrimitive

  expect(
    filterTracesIfMultiple({
      primitives: [primitive],
      is_showing_multiple_traces_length: false,
      traceOverlayElementIndex: createTraceOverlayElementIndex(elements),
    }),
  ).toEqual([primitive])
})

it("deduplicates multiple hovered segments of the same trace and keeps display_name overlays", () => {
  const pcbTrace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_corner",
    source_trace_id: "source_trace_corner",
    trace_length: 8.5,
    route: [],
  }
  const elements = [
    pcbTrace,
    {
      type: "source_trace",
      source_trace_id: "source_trace_corner",
      display_name: "U1.1 to R1.2",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    },
  ] as AnyCircuitElement[]
  const segment1 = {
    _pcb_drawing_object_id: "line_1",
    _element: pcbTrace,
  } as HighlightedPrimitive
  const segment2 = {
    _pcb_drawing_object_id: "line_2",
    _element: pcbTrace,
  } as HighlightedPrimitive

  expect(
    filterTracesIfMultiple({
      primitives: [segment1, segment2],
      is_showing_multiple_traces_length: false,
      traceOverlayElementIndex: createTraceOverlayElementIndex(elements),
    }),
  ).toEqual([segment1])
})

it("prefers a trace with a finite trace_length when an earlier candidate has undefined trace_length", () => {
  const traceWithoutLength: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_no_len",
    route: [],
  }
  const traceWithLength: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_with_len",
    trace_length: 4.2,
    route: [],
  }
  const prim1 = { _element: traceWithoutLength } as HighlightedPrimitive
  const prim2 = { _element: traceWithLength } as HighlightedPrimitive

  expect(
    filterTracesIfMultiple({
      primitives: [prim1, prim2],
      is_showing_multiple_traces_length: true,
      traceOverlayElementIndex: createTraceOverlayElementIndex([]),
    }),
  ).toEqual([prim2])
})

it("includes bulge arc extrema and midpoints in polygon_with_arcs bounds and snap points", () => {
  const circularBrepPour: Primitive = {
    _pcb_drawing_object_id: "poly_arcs_0",
    pcb_drawing_type: "polygon_with_arcs",
    layer: "top",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: 30, y: 20, bulge: 1 },
          { x: 50, y: 20, bulge: 1 },
        ],
      },
    },
  }

  const bounds = getPrimitiveBoundingBox(circularBrepPour)
  expect(bounds).not.toBeNull()
  expect(bounds?.minX).toBeCloseTo(30, 5)
  expect(bounds?.maxX).toBeCloseTo(50, 5)
  expect(bounds?.minY).toBeCloseTo(10, 5)
  expect(bounds?.maxY).toBeCloseTo(30, 5)

  const snapPoints = getPrimitiveSnapPoints(circularBrepPour)
  const bottomMid = snapPoints.find(
    (s) => s.anchor === "polygon_with_arcs_arc_mid_0",
  )
  const topMid = snapPoints.find(
    (s) => s.anchor === "polygon_with_arcs_arc_mid_1",
  )
  expect(bottomMid?.point.x).toBeCloseTo(40, 5)
  expect(bottomMid?.point.y).toBeCloseTo(10, 5)
  expect(topMid?.point.x).toBeCloseTo(40, 5)
  expect(topMid?.point.y).toBeCloseTo(30, 5)
})
