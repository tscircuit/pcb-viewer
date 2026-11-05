import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { renderToStaticMarkup } from "react-dom/server"
import { identity } from "transformation-matrix"
import { HighlightedPrimitiveBoxWithText } from "../../src/components/ElementOverlayBox"
import { getPrimitivesUnderPoint } from "../../src/components/MouseElementTracker"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { createTraceOverlayElementIndex } from "../../src/lib/get-trace-overlay-text"

test("getPrimitivesUnderPoint hit-tests rotated rect and pill pads in local coordinates", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_rot_90",
      shape: "rotated_rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 0.6,
      ccw_rotation: 90,
      port_hints: ["pin1"],
    },
  ]

  const primitives = elements.flatMap((el) =>
    convertElementToPrimitives(el, elements),
  )

  // At 90 deg rotation, a 2x0.6 pad spans x in [-0.3, 0.3], y in [-1, 1]
  const hitOnTopEnd = getPrimitivesUnderPoint({
    primitives,
    rwPoint: { x: 0, y: 0.8 },
    selectedLayer: "top",
    transform: identity(),
  })
  expect(hitOnTopEnd).toHaveLength(1)

  const missOnUnrotatedSide = getPrimitivesUnderPoint({
    primitives,
    rwPoint: { x: 0.8, y: 0 },
    selectedLayer: "top",
    transform: identity(),
  })
  expect(missOnUnrotatedSide).toHaveLength(0)
})

test("HighlightedPrimitiveBoxWithText rotates overlay box for rect-pad plated holes", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "src_1",
      name: "J1",
      ftype: "simple_chip",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_1",
      source_component_id: "src_1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 90,
      width: 4,
      height: 4,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_1",
      pcb_component_id: "pcb_1",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x: 0,
      y: 0,
      hole_diameter: 1,
      rect_pad_width: 2.4,
      rect_pad_height: 1.4,
      rect_ccw_rotation: 90,
      layers: ["top", "bottom"],
      port_hints: ["pin1"],
    },
  ]

  const primitives = elements.flatMap((el) =>
    convertElementToPrimitives(el, elements),
  )
  const topPadPrimitive = primitives.find(
    (p) => p.pcb_drawing_type === "rect" && p.layer === "top",
  )!

  const html = renderToStaticMarkup(
    <HighlightedPrimitiveBoxWithText
      primitive={{
        ...(topPadPrimitive as any),
        x: 0,
        y: 0,
        w: 2.4,
        h: 1.4,
        screen_x: 100,
        screen_y: 100,
        screen_w: 48,
        screen_h: 28,
      }}
      mousePos={{ x: 100, y: 100 }}
      traceOverlayElementIndex={createTraceOverlayElementIndex(elements)}
    />,
  )

  expect(html).toContain("rotate(-90deg)")
  expect(html).toContain("J1.pin1")
})
