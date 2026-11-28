import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  elementHitsCopperRenderLayers,
  getCopperLayerDrawOrder,
  getCopperLayerRefsFromElements,
  getOrderedCanvasLayers,
} from "../../src/lib/copper-layers"
import { zIndexMap } from "../../src/lib/util/z-index-map"

const tenLayerBoard = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 10,
  },
] as AnyCircuitElement[]

test("creates canvases for every copper layer on a 10-layer board", () => {
  expect(getCopperLayerRefsFromElements(tenLayerBoard)).toEqual([
    "top",
    "inner1",
    "inner2",
    "inner3",
    "inner4",
    "inner5",
    "inner6",
    "inner7",
    "inner8",
    "bottom",
  ])

  const orderedLayers = getOrderedCanvasLayers(tenLayerBoard)
  expect(orderedLayers).toContain("inner7")
  expect(orderedLayers).toContain("inner8")
  expect(orderedLayers.length).toBeLessThanOrEqual(zIndexMap.topLayer)
})

test("orders X-Ray copper back to front and promotes the selected layer", () => {
  const elements = [{ type: "pcb_board", num_layers: 4 }] as any
  expect(getCopperLayerDrawOrder(elements, "top")).toEqual([
    "bottom",
    "inner2",
    "inner1",
    "top",
  ])
  expect(getCopperLayerDrawOrder(elements, "bottom")).toEqual([
    "inner2",
    "inner1",
    "top",
    "bottom",
  ])
  expect(getCopperLayerDrawOrder(elements, "inner1")).toEqual([
    "bottom",
    "inner2",
    "top",
    "inner1",
  ])
})

test("elementHitsCopperRenderLayers matches spanning and legacy layers on copper canvases only", () => {
  expect(elementHitsCopperRenderLayers(["top", "bottom"], ["top_copper"])).toBe(
    true,
  )
  expect(
    elementHitsCopperRenderLayers(["top", "bottom"], ["bottom_copper"]),
  ).toBe(true)
  expect(elementHitsCopperRenderLayers(["bottom"], ["top_copper"])).toBe(false)
  expect(
    elementHitsCopperRenderLayers(["top", "inner1"], ["bottom_copper"]),
  ).toBe(false)
  expect(elementHitsCopperRenderLayers([], ["top_copper"])).toBe(true)
  expect(elementHitsCopperRenderLayers([], ["bottom_copper"])).toBe(true)
  expect(elementHitsCopperRenderLayers([], ["drill"])).toBe(false)
})
