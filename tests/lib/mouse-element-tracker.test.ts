import { expect, it } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { getPrimitivesUnderPoint } from "../../src/components/MouseElementTracker"
import am3352 from "../../src/examples/2026/repros/am3352-dev-board/circuit.json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import type { Line, Primitive } from "../../src/lib/types"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace_0",
  route: [],
}

const createTracePrimitive = (layer: "top" | "bottom"): Line => ({
  _pcb_drawing_object_id: `line_${layer}`,
  _element: trace,
  pcb_drawing_type: "line",
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
  width: 0.15,
  layer,
})

it("only hit-tests PCB traces on the selected layer", () => {
  const topTrace = createTracePrimitive("top")
  const bottomTrace = createTracePrimitive("bottom")

  expect(
    getPrimitivesUnderPoint(
      [topTrace, bottomTrace],
      { x: 0.5, y: 0 },
      { a: 40, b: 0, c: 0, d: 40, e: 0, f: 0 },
      "top",
    ),
  ).toEqual([topTrace])
})

const transform = { a: 40, b: 0, c: 0, d: -40, e: 0, f: 0 }
const point = { x: 0, y: 0 }

it("only picks pads on the selected copper layer, including inner layers", () => {
  const pads = ["top", "inner1", "inner6", "bottom"].map(
    (layer) =>
      ({
        _pcb_drawing_object_id: `pad_${layer}`,
        _element: { type: "pcb_smtpad", pcb_smtpad_id: `pad_${layer}`, layer },
        pcb_drawing_type: "rect",
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        layer,
      }) as Primitive,
  )
  for (const layer of ["top", "inner1", "inner6", "bottom"] as const) {
    expect(getPrimitivesUnderPoint(pads, point, transform, layer)).toEqual(
      pads.filter((p) => p.layer === layer),
    )
  }
})

it("does not pick inactive polygon pads or BREP geometry", () => {
  const points = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ]
  const polygon = {
    _pcb_drawing_object_id: "polygon_bottom",
    layer: "bottom",
    _element: { type: "pcb_smtpad", pcb_smtpad_id: "polygon" },
    pcb_drawing_type: "polygon",
    points,
  } as Primitive
  const brep = {
    ...polygon,
    _pcb_drawing_object_id: "brep_bottom",
    pcb_drawing_type: "polygon_with_arcs",
    brep_shape: { outer_ring: { vertices: points } },
  } as Primitive
  expect(
    getPrimitivesUnderPoint([polygon, brep], point, transform, "top"),
  ).toEqual([])
  expect(
    getPrimitivesUnderPoint([polygon, brep], point, transform, "bottom"),
  ).toEqual([polygon, brep])
})

it("does not pick blind vias through their shared drill or inactive pads", () => {
  const via = {
    type: "pcb_via",
    pcb_via_id: "blind",
    layers: ["inner1", "inner2"],
  } as const
  const primitives = ["inner1", "inner2", "drill"].map(
    (layer) =>
      ({
        _pcb_drawing_object_id: `via_${layer}`,
        _element: via,
        pcb_drawing_type: "circle",
        x: 0,
        y: 0,
        r: 1,
        layer,
      }) as unknown as Primitive,
  )
  expect(getPrimitivesUnderPoint(primitives, point, transform, "top")).toEqual(
    [],
  )
  expect(
    getPrimitivesUnderPoint(primitives, point, transform, "inner1"),
  ).toEqual(primitives.slice(0, 2))
})

it("ignores soldermask and explicitly non-hoverable duplicates", () => {
  const pad = {
    _pcb_drawing_object_id: "pad",
    _element: { type: "pcb_smtpad", pcb_smtpad_id: "pad" },
    pcb_drawing_type: "circle",
    x: 0,
    y: 0,
    r: 1,
    layer: "top",
  } as Primitive
  const duplicates = [
    { ...pad, layer: "soldermask_with_copper_top" },
    { ...pad, is_hoverable: false },
  ] as Primitive[]
  expect(getPrimitivesUnderPoint(duplicates, point, transform, "top")).toEqual(
    [],
  )
})

it("picks legacy vias on intermediate layers within their endpoint span", () => {
  for (const endpoints of [
    { from_layer: "top", to_layer: "bottom" },
    { from_layer: "inner1", to_layer: "inner3" },
    { from_layer: "inner3", to_layer: "inner1" },
    {},
  ] as const) {
    const via = {
      type: "pcb_via",
      pcb_via_id: "legacy_via",
      x: 0,
      y: 0,
      outer_diameter: 1,
      hole_diameter: 0.5,
      ...endpoints,
    }
    const primitives = convertElementToPrimitives(via as any, [via] as any)
    expect(
      getPrimitivesUnderPoint(primitives, point, transform, "inner2").length,
    ).toBeGreaterThan(0)
    if (endpoints.from_layer?.startsWith("inner")) {
      for (const layer of ["top", "inner4", "bottom"] as const) {
        expect(
          getPrimitivesUnderPoint(primitives, point, transform, layer),
        ).toEqual([])
      }
    }
  }
})

it("picks legacy vias through the bottom endpoint in either direction", () => {
  for (const [from_layer, to_layer] of [
    ["inner3", "bottom"],
    ["bottom", "inner3"],
    ["bottom", "bottom"],
  ] as const) {
    const via = {
      type: "pcb_via",
      pcb_via_id: "bottom_via",
      x: 0,
      y: 0,
      outer_diameter: 1,
      hole_diameter: 0.5,
      from_layer,
      to_layer,
    }
    const primitives = convertElementToPrimitives(via as any, [via] as any)
    expect(
      getPrimitivesUnderPoint(primitives, point, transform, "bottom").length,
    ).toBeGreaterThan(0)
    for (const layer of ["top", "inner2"] as const) {
      expect(
        getPrimitivesUnderPoint(primitives, point, transform, layer),
      ).toEqual([])
    }
    for (const layer of ["inner3", "inner6"] as const) {
      const hits = getPrimitivesUnderPoint(primitives, point, transform, layer)
      if (from_layer === to_layer) expect(hits).toEqual([])
      else expect(hits.length).toBeGreaterThan(0)
    }
  }
})

it("keeps through-hole pads selectable only on their spanned layers", () => {
  const pad = {
    _pcb_drawing_object_id: "plated_pad",
    layer: "top",
    pcb_drawing_type: "circle",
    x: 0,
    y: 0,
    r: 1,
    _element: {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole",
      layers: ["top", "inner1", "bottom"],
    },
  } as Primitive
  for (const layer of ["top", "inner1", "bottom"] as const) {
    expect(getPrimitivesUnderPoint([pad], point, transform, layer)).toEqual([
      pad,
    ])
  }
  expect(getPrimitivesUnderPoint([pad], point, transform, "inner2")).toEqual([])
})

it("does not pick AM3352 top-side pads while an inner layer is active", () => {
  const pads = am3352.filter(
    (element) => element.type === "pcb_smtpad" && element.layer === "top",
  )
  const primitives = pads.flatMap((pad) =>
    convertElementToPrimitives(pad as any, am3352 as any),
  )
  expect(primitives.length).toBeGreaterThan(0)
  for (const pad of pads.slice(0, 20)) {
    expect(
      getPrimitivesUnderPoint(
        primitives,
        { x: pad.x, y: pad.y },
        transform,
        "inner3",
      ),
    ).toEqual([])
  }
})

it.each(["pcb_via", "pcb_plated_hole"])(
  "keeps AM3352 %s selectable on all eight spanned layers",
  (type) => {
    const elements = am3352.filter((element) => element.type === type)
    expect(elements.length).toBeGreaterThan(0)
    for (const element of elements.slice(0, 20)) {
      const primitives = convertElementToPrimitives(
        element as any,
        am3352 as any,
      )
      for (const layer of [
        "top",
        "inner1",
        "inner2",
        "inner3",
        "inner4",
        "inner5",
        "inner6",
        "bottom",
      ] as const) {
        const hits = getPrimitivesUnderPoint(
          primitives,
          { x: element.x, y: element.y },
          transform,
          layer,
        )
        expect(hits.length).toBeGreaterThan(0)
        expect(hits.every((hit) => hit.layer !== "drill")).toBe(true)
      }
    }
  },
)
