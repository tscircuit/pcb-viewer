import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import { getHighlightedCopperPourIds } from "../../src/lib/get-highlighted-copper-pour-ids"
import { getElementNetId, isXRayCopper } from "../../src/lib/x-ray-net"
import { scene } from "../x-ray-net/scene"

const pours: AnyCircuitElement[] = ["top", "inner1", "bottom"].map((layer) => ({
  type: "pcb_copper_pour",
  pcb_copper_pour_id: `pour_${layer}`,
  source_net_id: "net_a",
  layer: layer as "top" | "inner1" | "bottom",
  shape: "rect",
  center: { x: 0, y: 10 },
  width: 4,
  height: 4,
  covered_with_solder_mask: false,
}))
const elements: AnyCircuitElement[] = [
  ...scene,
  ...pours,
  {
    ...pours[0],
    pcb_copper_pour_id: "other_net",
    source_net_id: "net_b",
  } as AnyCircuitElement,
  {
    ...pours[0],
    pcb_copper_pour_id: "unconnected",
    source_net_id: undefined,
  } as AnyCircuitElement,
]
const map = getFullConnectivityMapFromCircuitJson(elements)
const expected = ["pour_top", "pour_inner1", "pour_bottom"]

test("pad and trace net highlights include connected pours without interaction primitives", () => {
  for (const pour of pours)
    expect(convertElementToPrimitives(pour, elements)).toEqual([])
  for (const id of ["port_a", "trace_a_top", "pad_a", "via_a"])
    expect(
      getHighlightedCopperPourIds(
        elements,
        map.getIdsConnectedToNet(map.getNetConnectedToId(id)!),
        map,
      ),
    ).toEqual(expected)
})

test("clearing hover, unknown IDs and component highlights do not highlight pours", () => {
  for (const ids of [[], ["missing"], ["shared_component"]])
    expect(getHighlightedCopperPourIds(elements, ids, map)).toEqual([])
  expect(getHighlightedCopperPourIds(elements, ["port_b"], map)).toEqual([
    "other_net",
  ])
})

test("duplicate net IDs are harmless and hidden pours are not selected", () => {
  expect(
    getHighlightedCopperPourIds(
      elements,
      ["port_a", "trace_a_top", "port_a"],
      map,
    ),
  ).toEqual(expected)
  expect(
    getHighlightedCopperPourIds(
      elements.filter((element) => element.type !== "pcb_copper_pour"),
      ["port_a"],
      map,
    ),
  ).toEqual([])
})

test("X-Ray from a ground pad resolves the same pours through source_net_id", () => {
  const pad = elements.find(
    (element) =>
      element.type === "pcb_smtpad" && element.pcb_smtpad_id === "pad_a",
  )!
  const net = getElementNetId(pad, map)
  expect(
    elements
      .filter(
        (element) =>
          isXRayCopper(element) &&
          getElementNetId(element, map) === net &&
          element.type === "pcb_copper_pour",
      )
      .map((element) => (element as any).pcb_copper_pour_id),
  ).toEqual(expected)
})
