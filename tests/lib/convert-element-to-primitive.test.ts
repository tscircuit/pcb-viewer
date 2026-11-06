import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbTrace, PcbTraceHint } from "circuit-json"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { drawPrimitives } from "../../src/lib/draw-primitives"
import { addInteractionMetadataToPrimitives } from "../../src/lib/util/addInteractionMetadataToPrimitives"

test("interpolated traces accept through-pad route points", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_through_pad",
    route_thickness_mode: "interpolated",
    route: [
      {
        route_type: "wire",
        x: -2,
        y: 0,
        width: 0.2,
        layer: "inner7",
      },
      {
        route_type: "through_pad",
        start: { x: -1, y: 0 },
        end: { x: 1, y: 0 },
        width: 0.6,
        start_layer: "inner7",
        end_layer: "inner8",
      },
      {
        route_type: "wire",
        x: 2,
        y: 0,
        width: 0.2,
        layer: "inner8",
      },
    ],
  }

  const primitives = convertElementToPrimitives(trace, [trace])

  expect(primitives).toHaveLength(1)
  expect(primitives[0]?.pcb_drawing_type).toBe("polygon")
  expect(
    primitives[0]?.pcb_drawing_type === "polygon" &&
      primitives[0].points.every(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      ),
  ).toBe(true)
})

test("pcb_trace_hint converts port-to-route lines, via circles, and lights up on component/port hover", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: false,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      source_port_id: "source_port_0",
      x: 1,
      y: 2,
      layers: ["top"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_0",
      shape: "rect",
      x: 1,
      y: 2,
      width: 0.5,
      height: 0.5,
      layer: "top",
    },
    {
      type: "pcb_trace_hint",
      pcb_trace_hint_id: "pcb_trace_hint_0",
      pcb_component_id: "pcb_component_0",
      pcb_port_id: "pcb_port_0",
      route: [
        { x: 3, y: 2, trace_width: 0.3 },
        { x: 3, y: 5, via: true, to_layer: "bottom", trace_width: 0.3 },
        { x: 6, y: 5, trace_width: 0.3 },
      ],
    } satisfies PcbTraceHint,
  ]

  const allPrimitives = elements.flatMap((el) =>
    convertElementToPrimitives(el, elements),
  )
  const hintPrimitives = allPrimitives.filter(
    (p) => p._element?.type === "pcb_trace_hint",
  )

  // 1 dashed line from port (1,2)->(3,2), 1 line (3,2)->(3,5), 1 empty circle via at (3,5), 1 line (3,5)->(6,5) on bottom
  expect(hintPrimitives).toHaveLength(4)

  const firstLine = hintPrimitives[0]
  expect(firstLine?.pcb_drawing_type).toBe("line")
  if (firstLine?.pcb_drawing_type === "line") {
    expect(firstLine.x1).toBe(1)
    expect(firstLine.y1).toBe(2)
    expect(firstLine.x2).toBe(3)
    expect(firstLine.y2).toBe(2)
    expect(firstLine.is_dashed).toBe(true)
    expect(firstLine.layer).toBe("top")
  }

  const secondLine = hintPrimitives[1]
  expect(secondLine?.pcb_drawing_type).toBe("line")
  if (secondLine?.pcb_drawing_type === "line") {
    expect(secondLine.x1).toBe(3)
    expect(secondLine.y1).toBe(2)
    expect(secondLine.x2).toBe(3)
    expect(secondLine.y2).toBe(5)
    expect(secondLine.is_dashed).toBeUndefined()
    expect(secondLine.layer).toBe("top")
  }

  const viaCircle = hintPrimitives[2]
  expect(viaCircle?.pcb_drawing_type).toBe("circle")
  if (viaCircle?.pcb_drawing_type === "circle") {
    expect(viaCircle.x).toBe(3)
    expect(viaCircle.y).toBe(5)
    expect(viaCircle.r).toBe(0.3)
    expect(viaCircle.is_filled).toBe(false)
    expect(viaCircle.has_stroke).toBe(true)
    expect(viaCircle.stroke_width).toBeCloseTo(0.1)
  }

  const thirdLine = hintPrimitives[3]
  expect(thirdLine?.pcb_drawing_type).toBe("line")
  if (thirdLine?.pcb_drawing_type === "line") {
    expect(thirdLine.x1).toBe(3)
    expect(thirdLine.y1).toBe(5)
    expect(thirdLine.x2).toBe(6)
    expect(thirdLine.y2).toBe(5)
    expect(thirdLine.layer).toBe("bottom")
  }

  // Hovering the component pad lights up the trace hint primitives (opacity 0.5 -> 1.0)
  const padPrimitive = allPrimitives.find(
    (p) => p._element?.type === "pcb_smtpad",
  )!
  const unhovered = addInteractionMetadataToPrimitives({
    primitivesWithoutInteractionMetadata: allPrimitives,
    drawingObjectIdsWithMouseOver: new Set(),
    primitiveIdsInMousedOverNet: [],
  }).filter((p) => p._element?.type === "pcb_trace_hint")

  const hovered = addInteractionMetadataToPrimitives({
    primitivesWithoutInteractionMetadata: allPrimitives,
    drawingObjectIdsWithMouseOver: new Set([
      padPrimitive._pcb_drawing_object_id,
    ]),
    primitiveIdsInMousedOverNet: [],
  }).filter((p) => p._element?.type === "pcb_trace_hint")

  expect(unhovered.every((p) => !p.is_in_highlighted_net)).toBe(true)
  expect(hovered.every((p) => p.is_in_highlighted_net)).toBe(true)

  const equippedColorsUnhovered: string[] = []
  const equippedColorsHovered: string[] = []
  const createMockDrawer = (colorsOut: string[]) =>
    ({
      transform: { a: 40, b: 0, c: 0, d: -40, e: 0, f: 0 },
      equip: (opts: { color?: string }) => {
        if (opts.color) colorsOut.push(opts.color)
      },
      moveTo: () => {},
      lineTo: () => {},
      circle: () => {},
    }) as any

  drawPrimitives(createMockDrawer(equippedColorsUnhovered), unhovered)
  drawPrimitives(createMockDrawer(equippedColorsHovered), hovered)

  expect(equippedColorsUnhovered.every((c) => c.includes("0.5"))).toBe(true)
  expect(equippedColorsHovered.every((c) => !c.includes("0.5"))).toBe(true)
})
