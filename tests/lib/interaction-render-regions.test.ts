import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import {
  boundsOverlap,
  canPartiallyRenderInteractions,
  createInteractionRenderIndex,
  getActivePrimitives,
  getChangedInteractionRegion,
  getInteractionClipBounds,
  getPrimitiveRenderBounds,
} from "../../src/lib/interaction-render-regions"
import type { Primitive } from "../../src/lib/types"

const primitive = (id: string, options: Record<string, unknown> = {}) =>
  ({
    _pcb_drawing_object_id: id,
    pcb_drawing_type: "circle",
    layer: "top",
    x: 0,
    y: 0,
    r: 1,
    ...options,
  }) as Primitive

const makeTrace = (id: string, startX = 0): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id: id,
  route: [
    { route_type: "wire", x: startX, y: 0, width: 4, layer: "top" },
    { route_type: "wire", x: startX + 10, y: 0, width: 0.1, layer: "top" },
  ],
})

const highlight = (p: Primitive) => ({ ...p, is_mouse_over: true })

describe("interaction render regions", () => {
  it("bounds the complete trace using the widest route point, including the first point", () => {
    const trace = makeTrace("wide-first")
    const narrowHitPrimitive = primitive("trace-hit", {
      _element: trace,
      pcb_drawing_type: "line",
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      width: 0.1,
    })
    const index = createInteractionRenderIndex([trace], [narrowHitPrimitive])
    const region = getChangedInteractionRegion(
      new Map(),
      getActivePrimitives([highlight(narrowHitPrimitive)]),
      index,
    )
    expect(region).toBeTruthy()
    expect(region!.bounds.minX).toBeLessThanOrEqual(-2)
    expect(region!.bounds.minY).toBeLessThanOrEqual(-2)
    expect(region!.bounds.maxX).toBeGreaterThanOrEqual(12)
    expect(region!.bounds.maxY).toBeGreaterThanOrEqual(2)
  })

  it("redraws every copper layer of a highlighted trace and of a through via", () => {
    const trace = makeTrace("multilayer")
    trace.route.push(
      { route_type: "wire", x: 10, y: 1, width: 0.1, layer: "inner6" },
      { route_type: "wire", x: 11, y: 1, width: 0.1, layer: "bottom" },
    )
    const board = { type: "pcb_board", num_layers: 8 } as AnyCircuitElement
    const via = {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 20,
      y: 0,
      outer_diameter: 1,
      hole_diameter: 0.5,
      from_layer: "top",
      to_layer: "bottom",
    } as AnyCircuitElement
    const tracePrimitive = primitive("trace-hit", { _element: trace })
    const viaPrimitive = primitive("via-hit", { _element: via })
    const index = createInteractionRenderIndex(
      [board, trace, via],
      [tracePrimitive, viaPrimitive],
    )
    const traceRegion = getChangedInteractionRegion(
      new Map(),
      getActivePrimitives([highlight(tracePrimitive)]),
      index,
    )
    expect([...traceRegion!.layers].sort()).toEqual(["bottom", "inner6", "top"])
    const viaRegion = getChangedInteractionRegion(
      new Map(),
      getActivePrimitives([highlight(viaPrimitive)]),
      index,
    )
    expect([...viaRegion!.layers].sort()).toEqual([
      "bottom",
      "inner1",
      "inner2",
      "inner3",
      "inner4",
      "inner5",
      "inner6",
      "top",
    ])
  })

  it("unions both old and new highlight bounds so clearing removes the previous highlight", () => {
    const a = makeTrace("a")
    const b = makeTrace("b", 100)
    const pa = primitive("a", { _element: a })
    const pb = primitive("b", { _element: b })
    const index = createInteractionRenderIndex([a, b], [pa, pb])
    const previous = getActivePrimitives([highlight(pa)])
    const current = getActivePrimitives([highlight(pb)])
    const region = getChangedInteractionRegion(previous, current, index)
    expect(region!.bounds.minX).toBeLessThanOrEqual(0)
    expect(region!.bounds.maxX).toBeGreaterThanOrEqual(110)
    const cleared = getChangedInteractionRegion(current, new Map(), index)
    expect(cleared!.bounds).toEqual(index.elementBounds.get(b)!)
  })

  it("does not redraw when only the source of the same visible highlight changes", () => {
    const p = primitive("same")
    const index = createInteractionRenderIndex([], [p])
    expect(
      getChangedInteractionRegion(
        getActivePrimitives([{ ...p, is_mouse_over: true }]),
        getActivePrimitives([{ ...p, is_in_highlighted_net: true }]),
        index,
      ),
    ).toBeUndefined()
  })

  it("keeps the whole antialiasing clip in the culling region at low zoom", () => {
    const geometry = { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    const clip = getInteractionClipBounds(geometry, {
      a: 0.5,
      b: 0,
      c: 0,
      d: -0.5,
      e: 100,
      f: 100,
    })!
    const adjacent = { minX: 4, minY: 0, maxX: 5, maxY: 1 }
    expect(boundsOverlap(geometry, adjacent)).toBe(false)
    expect(boundsOverlap(clip.world, adjacent)).toBe(true)
    expect(clip.world.minX).toBeLessThanOrEqual(-8)
    expect(clip.world.maxX).toBeGreaterThanOrEqual(9)
    expect(Number.isInteger(clip.pixels.minX)).toBe(true)
    expect(Number.isInteger(clip.pixels.maxX)).toBe(true)
  })

  it("uses conservative bounds for rotated pads", () => {
    const pad = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
    } as AnyCircuitElement
    const p = primitive("pad", {
      _element: pad,
      pcb_drawing_type: "rect",
      x: 5,
      y: 10,
      w: 6,
      h: 8,
      ccw_rotation: 45,
    })
    const index = createInteractionRenderIndex([pad], [p])
    expect(index.elementBounds.get(pad)).toEqual({
      minX: 0,
      minY: 5,
      maxX: 10,
      maxY: 15,
    })
  })

  it("falls back for interpolated traces, plated-hole offsets, and unknown element geometry", () => {
    const interpolated = {
      ...makeTrace("interpolated"),
      route_thickness_mode: "interpolated",
    } as PcbTrace
    const platedHole = {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "offset-hole",
      shape: "pill_hole_with_rect_pad",
      hole_offset_x: 50,
    } as AnyCircuitElement
    const copperText = {
      type: "pcb_copper_text",
      pcb_copper_text_id: "text",
    } as AnyCircuitElement
    for (const element of [interpolated, platedHole, copperText]) {
      const p = primitive("unknown", { _element: element })
      const index = createInteractionRenderIndex([element], [p])
      expect(index.elementBounds.get(element)).toBeUndefined()
      expect(
        getChangedInteractionRegion(
          new Map(),
          getActivePrimitives([highlight(p)]),
          index,
        ),
      ).toBeNull()
    }
  })

  it("limits partial rendering to finite, uniform, unrotated viewport transforms", () => {
    const normal = { a: 5, b: 0, c: 0, d: -5, e: 100, f: 200 }
    const bounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    expect(canPartiallyRenderInteractions(normal)).toBe(true)
    for (const transform of [
      { ...normal, a: 0, d: 0 },
      { ...normal, b: 1 },
      { ...normal, c: 1 },
      { ...normal, d: -4 },
      { ...normal, a: -5, d: 5 },
      { ...normal, e: Number.POSITIVE_INFINITY },
      { ...normal, f: Number.NaN },
    ]) {
      expect(canPartiallyRenderInteractions(transform)).toBe(false)
      expect(getInteractionClipBounds(bounds, transform)).toBeNull()
    }
    expect(
      getInteractionClipBounds({ ...bounds, maxX: Number.NaN }, normal),
    ).toBeNull()
  })

  it("rejects nonfinite geometry and padding rather than culling against invalid bounds", () => {
    for (const p of [
      primitive("bad-position", { x: Number.NaN }),
      primitive("bad-radius", { r: Number.POSITIVE_INFINITY }),
      primitive("negative-radius", { r: -1 }),
      primitive("bad-width", {
        pcb_drawing_type: "line",
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
        width: Number.NaN,
      }),
    ]) {
      expect(getPrimitiveRenderBounds(p)).toBeNull()
    }
    const pad = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bad-pad",
    } as AnyCircuitElement
    const validPart = primitive("valid-part", { _element: pad })
    const unknownPart = primitive("unknown-part", {
      _element: pad,
      pcb_drawing_type: "text",
    })
    const index = createInteractionRenderIndex([pad], [validPart, unknownPart])
    expect(index.elementBounds.get(pad)).toBeNull()
    expect(
      getChangedInteractionRegion(
        new Map(),
        getActivePrimitives([highlight(validPart)]),
        index,
      ),
    ).toBeNull()
  })

  it("does not cull text, arcs, or lines whose width is independent of zoom", () => {
    for (const p of [
      primitive("text", { pcb_drawing_type: "text", text: "label", size: 1 }),
      primitive("arc", { pcb_drawing_type: "polygon_with_arcs" }),
      primitive("line", { pcb_drawing_type: "line", zoomIndependent: true }),
    ]) {
      expect(getPrimitiveRenderBounds(p)).toBeNull()
    }
  })
})
