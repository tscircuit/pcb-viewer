import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { addInteractionMetadataToPrimitives } from "../../src/lib/util/addInteractionMetadataToPrimitives"
import {
  buildErrorPreviewElementIndexes,
  getErrorFocusPoint,
  getErrorPreviewBounds,
  getRelatedIdsForError,
} from "../../src/lib/util/error-preview"

test("resolves focus point, preview bounds, and highlighted primitives for errors referencing pads, plated holes, traces, and components", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: 2,
      y: 4,
      width: 1,
      height: 0.6,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      shape: "rect",
      x: 4,
      y: 4,
      width: 1,
      height: 0.6,
      layer: "top",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_1",
      shape: "circle",
      x: -3,
      y: 2,
      outer_diameter: 1.4,
      hole_diameter: 0.8,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "src_1",
      center: { x: 10, y: 12 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "src_2",
      center: { x: 14, y: 12 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 6, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 6, y: 8, width: 0.2, layer: "top" },
      ],
    },
  ]

  const indexes = buildErrorPreviewElementIndexes(elements)

  const padOverlapError = {
    type: "pcb_footprint_overlap_error",
    error_type: "pcb_footprint_overlap_error",
    pcb_smtpad_ids: ["pad_1", "pad_2"],
    pcb_plated_hole_ids: ["ph_1"],
  }
  expect(getErrorFocusPoint({ error: padOverlapError, indexes })).toEqual({
    x: 3,
    y: 4,
  })
  const padBounds = getErrorPreviewBounds({ error: padOverlapError, indexes })
  expect(padBounds).not.toBeNull()
  expect(padBounds!.minX).toBeLessThanOrEqual(-3.7)
  expect(padBounds!.maxX).toBeGreaterThanOrEqual(4.5)

  const multiComponentError = {
    type: "pcb_placement_error",
    error_type: "pcb_placement_error",
    pcb_component_ids: ["comp_1", "comp_2"],
  }
  expect(getErrorFocusPoint({ error: multiComponentError, indexes })).toEqual({
    x: 12,
    y: 12,
  })

  const multiTraceError = {
    type: "pcb_trace_error",
    error_type: "pcb_trace_error",
    pcb_trace_ids: ["trace_1"],
  }
  expect(getErrorFocusPoint({ error: multiTraceError, indexes })).toEqual({
    x: 6,
    y: 0,
  })

  const relatedIds = getRelatedIdsForError({
    ...padOverlapError,
    pcb_trace_ids: ["trace_1"],
  })
  expect(relatedIds).toEqual(
    expect.arrayContaining(["pad_1", "pad_2", "ph_1", "trace_1"]),
  )

  const rawPrimitives = elements.flatMap((el) =>
    convertElementToPrimitives(el, elements),
  )
  const annotated = addInteractionMetadataToPrimitives({
    primitivesWithoutInteractionMetadata: rawPrimitives,
    drawingObjectIdsWithMouseOver: new Set(),
    primitiveIdsInMousedOverNet: relatedIds,
  })
  expect(
    annotated.some(
      (p) =>
        p._element?.type === "pcb_smtpad" &&
        p._element.pcb_smtpad_id === "pad_1" &&
        p.is_in_highlighted_net,
    ),
  ).toBe(true)
  expect(
    annotated.some(
      (p) =>
        p._element?.type === "pcb_plated_hole" &&
        p._element.pcb_plated_hole_id === "ph_1" &&
        p.layer !== "drill" &&
        p.is_in_highlighted_net,
    ),
  ).toBe(true)
})

test("computes component-outside-board preview bounds when board uses a custom outline", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_outline",
      center: { x: 0, y: 0 },
      outline: [
        { x: -10, y: -5 },
        { x: 10, y: -5 },
        { x: 10, y: 5 },
        { x: -10, y: 5 },
      ],
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    } as AnyCircuitElement,
  ]
  const indexes = buildErrorPreviewElementIndexes(elements)
  const bounds = getErrorPreviewBounds({
    error: {
      type: "pcb_component_outside_board_error",
      error_type: "pcb_component_outside_board_error",
      pcb_board_id: "board_outline",
      component_center: { x: 9.5, y: 0 },
      component_bounds: {
        min_x: 8,
        max_x: 11.5,
        min_y: -1,
        max_y: 1,
      },
    },
    indexes,
  })

  expect(bounds).not.toBeNull()
  expect(bounds!.maxX).toBeCloseTo(10.3, 5)
})
