import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  elementHitsCopperRenderLayers,
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

test("keeps a through-hole on both copper canvases", () => {
  expect(elementHitsCopperRenderLayers(["top", "bottom"], ["top_copper"])).toBe(
    true,
  )
  expect(
    elementHitsCopperRenderLayers(["top", "bottom"], ["bottom_copper"]),
  ).toBe(true)
})

test("drops a bottom-only span from the top copper canvas", () => {
  expect(elementHitsCopperRenderLayers(["bottom"], ["top_copper"])).toBe(false)
  expect(elementHitsCopperRenderLayers(["bottom"], ["bottom_copper"])).toBe(
    true,
  )
})

test("drops a top-only via from the bottom copper canvas", () => {
  expect(elementHitsCopperRenderLayers(["top"], ["bottom_copper"])).toBe(false)
  expect(elementHitsCopperRenderLayers(["top"], ["top_copper"])).toBe(true)
})

test("legacy spans with no layers list still draw on copper canvases", () => {
  expect(elementHitsCopperRenderLayers(undefined, ["top_copper"])).toBe(true)
  expect(elementHitsCopperRenderLayers([], ["bottom_copper"])).toBe(true)
  expect(elementHitsCopperRenderLayers(undefined, ["drill"])).toBe(false)
})
