import { expect, mock, test } from "bun:test"
import "bun-match-svg"
import { getPrimitivesUnderPoint } from "../../src/components/MouseElementTracker"
import { Drawer, LAYER_NAME_TO_COLOR } from "../../src/lib/Drawer"
import colors from "../../src/lib/colors"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { drawPrimitive } from "../../src/lib/draw-primitives"
import { getPrimitiveSnapPoints } from "../../src/lib/util/get-primitive-snap-points"
import { getPrimitiveBoundingBox } from "../../src/lib/util/get-primitive-bounding-box"
import { jaeShellPad } from "../fixtures/jae-usb-c/shell-pad"

test("rotates a polygon plated hole", async () => {
  const element = { ...jaeShellPad, ccw_rotation: 90 }
  const primitives = convertElementToPrimitives(element, [element])
  const pad = primitives.find((p) => p.pcb_drawing_type === "polygon")!
  const drill = primitives.find((p) => p.pcb_drawing_type === "pill")!
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="7 -8 6 6">
  <title>JAE shell pad and drill primitives at 90 degrees</title>
  <rect x="7" y="-8" width="6" height="6" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    <polygon points="${pad.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="${LAYER_NAME_TO_COLOR.top}"/>
    <rect x="${drill.x - drill.w / 2}" y="${drill.y - drill.h / 2}" width="${drill.w}" height="${drill.h}" rx="${Math.min(drill.w, drill.h) / 2}" transform="rotate(${drill.ccw_rotation} ${drill.x} ${drill.y})" fill="${LAYER_NAME_TO_COLOR.drill}"/>
  </g>
</svg>`

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
  expect(drill).toMatchObject({
    x: expect.closeTo(9.4, 6),
    y: expect.closeTo(4.4, 6),
  })
  expect(getPrimitiveBoundingBox(pad)).toEqual({
    minX: expect.closeTo(8.25, 6),
    maxX: expect.closeTo(10.55, 6),
    minY: expect.closeTo(3.8, 6),
    maxY: expect.closeTo(5.55, 6),
  })
})

test("rotates an oval drill", async () => {
  const element = {
    ...jaeShellPad,
    hole_shape: "oval" as const,
    ccw_rotation: 30,
  }
  const primitives = convertElementToPrimitives(element, [element])
  const pad = primitives.find((p) => p.pcb_drawing_type === "polygon")!
  const drill = primitives.find((p) => p.pcb_drawing_type === "oval")!
  const ellipse = mock<CanvasRenderingContext2D["ellipse"]>(() => {})
  const ctx = {
    beginPath() {},
    closePath() {},
    fill() {},
    ellipse,
  } as unknown as CanvasRenderingContext2D
  const drawer = new Drawer({})
  drawer.ctxLayerMap.drill = ctx
  drawer.transform = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 }
  drawPrimitive(drawer, drill)
  const [x, y, rx, ry, cwRotationRadians] = ellipse.mock.calls[0]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="7 -8 6 6">
  <title>Polygon pad and oval drill primitives at 30 degrees</title>
  <rect x="7" y="-8" width="6" height="6" fill="${colors.board.background}"/>
  <polygon points="${pad.points.map((p) => `${p.x},${-p.y}`).join(" ")}" fill="${LAYER_NAME_TO_COLOR.top}"/>
  <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${(cwRotationRadians * 180) / Math.PI} ${x} ${y})" fill="${ctx.fillStyle}"/>
</svg>`

  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "polygon-plated-hole-oval",
  )
  expect(cwRotationRadians).toBeCloseTo(-Math.PI / 6, 6)
  expect(getPrimitiveBoundingBox(drill)).toEqual({
    minX: expect.closeTo(8.638974562, 6),
    maxX: expect.closeTo(9.721794953, 6),
    minY: expect.closeTo(4.383328808, 6),
    maxY: expect.closeTo(6.055901676, 6),
  })
  expect(getPrimitiveSnapPoints(drill)).toContainEqual({
    anchor: "oval_right",
    point: {
      x: expect.closeTo(9.440192379, 6),
      y: expect.closeTo(5.369615242, 6),
    },
  })
  expect(
    getPrimitivesUnderPoint({
      primitives: [drill],
      rwPoint: { x: drill.x - 0.4, y: drill.y + 0.7 },
      selectedLayer: "top",
      transform: drawer.transform,
    }),
  ).toEqual([drill])
})

test("preserves ccw_rotation on oval plated hole pad and drill primitives", () => {
  const element = {
    type: "pcb_plated_hole" as const,
    pcb_plated_hole_id: "oval_ph_1",
    shape: "oval" as const,
    x: 4,
    y: 5,
    outer_width: 3,
    outer_height: 1.5,
    hole_width: 2,
    hole_height: 1,
    ccw_rotation: 90,
    layers: ["top" as const, "bottom" as const],
  }
  const primitives = convertElementToPrimitives(element, [element])
  const ovals = primitives.filter((p) => p.pcb_drawing_type === "oval")
  expect(ovals).toHaveLength(2)
  expect(ovals[0]).toMatchObject({
    layer: "top",
    rX: 1.5,
    rY: 0.75,
    ccw_rotation: 90,
  })
  expect(ovals[1]).toMatchObject({
    layer: "drill",
    rX: 1,
    rY: 0.5,
    ccw_rotation: 90,
  })
  expect(getPrimitiveBoundingBox(ovals[0]!)).toEqual({
    minX: expect.closeTo(4 - 0.75, 6),
    maxX: expect.closeTo(4 + 0.75, 6),
    minY: expect.closeTo(5 - 1.5, 6),
    maxY: expect.closeTo(5 + 1.5, 6),
  })
})

test("applies hole offsets and rect_ccw_rotation on rect-pad plated holes", () => {
  const circularWithRect = {
    type: "pcb_plated_hole" as const,
    pcb_plated_hole_id: "circ_rect_1",
    shape: "circular_hole_with_rect_pad" as const,
    hole_shape: "circle" as const,
    pad_shape: "rect" as const,
    x: 10,
    y: 20,
    hole_diameter: 1,
    rect_pad_width: 4,
    rect_pad_height: 2,
    rect_ccw_rotation: 90,
    hole_offset_x: 0.5,
    hole_offset_y: -0.25,
    layers: ["top" as const, "bottom" as const],
  }
  const circPrims = convertElementToPrimitives(circularWithRect, [
    circularWithRect,
  ])
  const circRects = circPrims.filter((p) => p.pcb_drawing_type === "rect")
  expect(circRects.map((r) => r.ccw_rotation)).toEqual([90, 90])

  const pillWithRect = {
    type: "pcb_plated_hole" as const,
    pcb_plated_hole_id: "pill_rect_1",
    shape: "pill_hole_with_rect_pad" as const,
    hole_shape: "pill" as const,
    pad_shape: "rect" as const,
    x: 10,
    y: 20,
    hole_width: 1.2,
    hole_height: 0.8,
    rect_pad_width: 3,
    rect_pad_height: 2,
    hole_offset_x: 0.4,
    hole_offset_y: -0.3,
    layers: ["top" as const, "bottom" as const],
  }
  const pillDrill = convertElementToPrimitives(pillWithRect, [
    pillWithRect,
  ]).find((p) => p.pcb_drawing_type === "pill")!
  expect(pillDrill).toMatchObject({
    x: expect.closeTo(10.4, 6),
    y: expect.closeTo(19.7, 6),
    layer: "drill",
  })

  const rotatedPillWithRect = {
    type: "pcb_plated_hole" as const,
    pcb_plated_hole_id: "rot_pill_rect_1",
    shape: "rotated_pill_hole_with_rect_pad" as const,
    hole_shape: "rotated_pill" as const,
    pad_shape: "rect" as const,
    x: 10,
    y: 20,
    hole_width: 1.2,
    hole_height: 0.8,
    hole_ccw_rotation: 45,
    rect_pad_width: 3,
    rect_pad_height: 2,
    rect_ccw_rotation: 45,
    hole_offset_x: -0.6,
    hole_offset_y: 0.5,
    layers: ["top" as const, "bottom" as const],
  }
  const rotPillDrill = convertElementToPrimitives(rotatedPillWithRect, [
    rotatedPillWithRect,
  ]).find((p) => p.pcb_drawing_type === "pill")!
  expect(rotPillDrill).toMatchObject({
    x: expect.closeTo(9.4, 6),
    y: expect.closeTo(20.5, 6),
    ccw_rotation: 45,
    layer: "drill",
  })
})
