import { describe, expect, it } from "bun:test"
import type { Primitive } from "../../src/lib/types"
import { addInteractionMetadataToPrimitives } from "../../src/lib/util/addInteractionMetadataToPrimitives"

const primitive = (id: string, options: Partial<Primitive> = {}): Primitive =>
  ({
    pcb_drawing_type: "circle",
    _pcb_drawing_object_id: id,
    x: 0,
    y: 0,
    r: 1,
    layer: "top",
    ...options,
  }) as Primitive

const applyHighlight = (primitives: Primitive[], ids: string[] = []) =>
  addInteractionMetadataToPrimitives({
    primitivesWithoutInteractionMetadata: primitives,
    primitiveIdsInMousedOverNet: ids,
    drawingObjectIdsWithMouseOver: new Set(),
  })

describe("interaction metadata", () => {
  it("preserves unaffected geometry while highlighting trace, port, via, and component ids", () => {
    const primitives = [
      primitive("trace", {
        _element: { type: "pcb_trace", pcb_trace_id: "trace1", route: [] },
      }),
      primitive("port", {
        _element: { type: "pcb_port", pcb_port_id: "port1" } as any,
      }),
      primitive("via", {
        _element: { type: "pcb_via", pcb_via_id: "via1" } as any,
      }),
      primitive("component", {
        _element: {
          type: "pcb_component",
          pcb_component_id: "component1",
        } as any,
      }),
      primitive("unrelated"),
    ]
    const result = applyHighlight(primitives, [
      "trace1",
      "port1",
      "via1",
      "component1",
      "trace1",
    ])
    for (let index = 0; index < 4; index++) {
      expect(result[index].is_in_highlighted_net).toBe(true)
      expect(result[index]).not.toBe(primitives[index])
      expect(primitives[index].is_in_highlighted_net).toBeUndefined()
    }
    expect(result[4]).toBe(primitives[4])
    expect(applyHighlight(primitives)).toEqual(primitives)
  })

  it("highlights pads through parent components but keeps drills unhighlighted", () => {
    const pad = primitive("pad", {
      _element: { type: "pcb_smtpad", pcb_smtpad_id: "pad1" } as any,
      _parent_pcb_component: {
        type: "pcb_component",
        pcb_component_id: "component1",
      } as any,
    })
    const drill = { ...pad, layer: "drill" } as Primitive
    const result = addInteractionMetadataToPrimitives({
      primitivesWithoutInteractionMetadata: [pad, drill],
      primitiveIdsInMousedOverNet: ["component1"],
      drawingObjectIdsWithMouseOver: new Set(["pad"]),
    })
    expect(result[0].is_mouse_over).toBe(true)
    expect(result[0].is_in_highlighted_net).toBe(false)
    expect(result[1]).toBe(drill)
    expect(applyHighlight([pad], ["component1"])[0].is_in_highlighted_net).toBe(
      true,
    )
  })

  it("clears stale highlights without mutating input primitives", () => {
    const highlighted = primitive("old", {
      is_mouse_over: true,
      is_in_highlighted_net: true,
    })
    const result = applyHighlight([highlighted])
    expect(result[0].is_mouse_over).toBe(false)
    expect(result[0].is_in_highlighted_net).toBe(false)
    expect(highlighted.is_mouse_over).toBe(true)
    expect(highlighted.is_in_highlighted_net).toBe(true)
  })
})
