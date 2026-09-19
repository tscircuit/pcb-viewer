import { expect, test } from "bun:test"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getElementNetId, isXRayCopper } from "../../src/lib/x-ray-net"
import { scene } from "../x-ray-net/scene"
import { Drawer } from "../../src/lib/Drawer"

test("X-Ray follows electrical connectivity across layers without including other pads on a component", () => {
  const map = getFullConnectivityMapFromCircuitJson(scene)
  const pad = scene.find(
    (el) => el.type === "pcb_smtpad" && el.pcb_smtpad_id === "pad_a",
  )!
  const net = getElementNetId(pad, map)
  expect(net).toBeDefined()
  const selected = scene.filter(
    (el) => isXRayCopper(el) && getElementNetId(el, map) === net,
  )
  expect(selected.map((el) => (el as any)[`${el.type}_id`]).sort()).toEqual([
    "bottom_pad_a",
    "cross_bottom",
    "cross_inner1",
    "cross_top",
    "pad_a",
    "trace_a_bottom",
    "trace_a_inner1",
    "trace_a_top",
    "via_a",
  ])
})

test("X-Ray dims every ordinary copper layer, then restores selected-layer visibility", () => {
  const drawer = new Drawer({})
  drawer.foregroundLayer = "inner1"
  for (const opacity of [0, 0.05, 0.4, 1]) {
    drawer.hiddenLayerOpacity = opacity
    drawer.xRayNetActive = true
    for (const layer of ["top", "inner1", "inner2", "bottom"])
      expect(drawer.getLayerOpacity(layer)).toBe(opacity)
    for (const layer of [
      "board",
      "drill",
      "edge_cuts",
      "other",
      "top_silkscreen",
      "bottom_silkscreen",
      "soldermask_top",
      "top_fabrication",
      "top_notes",
      "top_courtyard",
    ])
      expect(drawer.getLayerOpacity(layer)).toBe(0)
    drawer.xRayNetActive = false
    for (const layer of ["board", "drill", "edge_cuts", "other"])
      expect(drawer.getLayerOpacity(layer)).toBe(1)
    expect(drawer.getLayerOpacity("inner1")).toBe(1)
    expect(drawer.getLayerOpacity("top")).toBe(opacity)
  }
})
