import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  getPcbKeepoutColorForLayer,
  getPcbKeepoutElementsForLayer,
} from "../../src/lib/draw-pcb-keepout"

const elements = [
  {
    type: "pcb_keepout",
    pcb_keepout_id: "top_keepout",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layers: ["top"],
  },
  {
    type: "pcb_keepout",
    pcb_keepout_id: "inner_keepout",
    shape: "circle",
    center: { x: 2, y: 0 },
    radius: 1,
    layers: ["inner1"],
  },
  {
    type: "pcb_keepout",
    pcb_keepout_id: "shared_keepout",
    shape: "rect",
    center: { x: 4, y: 0 },
    width: 1,
    height: 1,
    layers: ["top", "inner1"],
  },
] as AnyCircuitElement[]

describe("PCB keepout layer rendering", () => {
  it("only returns keepouts assigned to the requested copper layer", () => {
    expect(
      getPcbKeepoutElementsForLayer({ elements, layer: "top" }).map(
        (keepout) => keepout.pcb_keepout_id,
      ),
    ).toEqual(["top_keepout", "shared_keepout"])

    expect(
      getPcbKeepoutElementsForLayer({ elements, layer: "inner1" }).map(
        (keepout) => keepout.pcb_keepout_id,
      ),
    ).toEqual(["inner_keepout", "shared_keepout"])

    expect(
      getPcbKeepoutElementsForLayer({ elements, layer: "bottom" }),
    ).toEqual([])
  })

  it("uses a distinct highlight color for each copper layer", () => {
    expect(getPcbKeepoutColorForLayer("top")).not.toBe(
      getPcbKeepoutColorForLayer("inner1"),
    )
    expect(getPcbKeepoutColorForLayer("inner1")).not.toBe(
      getPcbKeepoutColorForLayer("bottom"),
    )
  })
})
