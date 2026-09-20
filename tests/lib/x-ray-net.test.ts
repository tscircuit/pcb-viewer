import { getXRayGroups } from "../../src/lib/x-ray-net"
import { expect, test } from "bun:test"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import {
  getElementNetId,
  getXRayDisplayName,
  isXRayCopper,
} from "../../src/lib/x-ray-net"
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
    "plated_a",
    "pour_a_bottom",
    "pour_a_inner1",
    "pour_a_top",
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

test("X-Ray labels prefer explicit names, then connection labels, then Net", () => {
  const trace = scene.find(
    (el) => el.type === "pcb_trace" && el.pcb_trace_id === "trace_a_top",
  )!
  for (const [sourceFields, expected] of [
    [{ name: "  clock  ", display_name: "U1.1 to U2.2" }, "clock"],
    [{ name: " ", display_name: " U1.1 to U2.2 " }, "U1.1 to U2.2"],
    [{ name: "", display_name: "" }, "Net"],
  ] as const) {
    const elements = scene.map((el) =>
      el.type === "source_trace" && el.source_trace_id === "source_a"
        ? { ...el, ...sourceFields }
        : el,
    )
    const map = getFullConnectivityMapFromCircuitJson(elements)
    expect(getXRayDisplayName(trace, elements, map)).toBe(expected)
    const pad = elements.find(
      (el) => el.type === "pcb_smtpad" && el.pcb_smtpad_id === "pad_a",
    )!
    expect(getXRayDisplayName(pad, elements, map)).toBe(expected)
  }
})

test("X-Ray uses a connected source net name before a generated connection label", () => {
  const elements = scene.map((el) =>
    el.type === "source_trace" && el.source_trace_id === "source_a"
      ? { ...el, name: "", display_name: "U1.1 to U2.2" }
      : el,
  )
  elements.push({
    type: "source_net",
    source_net_id: "net_a",
    name: "GND",
    member_source_group_ids: [],
  })
  const map = getFullConnectivityMapFromCircuitJson(elements)
  for (const element of elements.filter(
    (el) =>
      isXRayCopper(el) &&
      getElementNetId(el, map) === map.getNetConnectedToId("net_a"),
  ))
    expect(getXRayDisplayName(element, elements, map)).toBe("GND")
})

test("X-Ray groups resolve electrical membership, deduplicate nets and ignore missing members", () => {
  const map = getFullConnectivityMapFromCircuitJson(scene)
  const net = map.getNetConnectedToId("source_a")!
  const elements = [
    ...scene,
    {
      type: "source_bus" as const,
      source_bus_id: "pair_usb",
      name: "USB",
      source_trace_ids: ["source_a", "source_a", "source_b", "missing"],
    },
  ]
  const groups = getXRayGroups(net, elements, map)
  expect(groups.map((group) => group.name)).toEqual(["DATA", "USB"])
  expect(groups[1].netIds).toEqual([net, map.getNetConnectedToId("source_b")!])
  expect(getXRayGroups("unrelated", elements, map)).toEqual([])
})
