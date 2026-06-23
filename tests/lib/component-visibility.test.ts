import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  classifyPcbComponents,
  filterElementsByVisibility,
  getHiddenPcbComponentIds,
} from "../../src/lib/util/component-visibility"

const mkPcbComponent = (id: string, layer: "top" | "bottom") =>
  ({
    type: "pcb_component",
    pcb_component_id: id,
    source_component_id: `src_${id}`,
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer,
    rotation: 0,
  }) as unknown as AnyCircuitElement

const mkSmtPad = (id: string, parent: string, layer: "top" | "bottom") =>
  ({
    type: "pcb_smtpad",
    pcb_smtpad_id: id,
    pcb_component_id: parent,
    shape: "rect",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    layer,
  }) as unknown as AnyCircuitElement

const mkPlatedHole = (id: string, parent: string) =>
  ({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: id,
    pcb_component_id: parent,
    shape: "circle",
    x: 0,
    y: 0,
    hole_diameter: 0.6,
    outer_diameter: 1.0,
  }) as unknown as AnyCircuitElement

const mkBoard = () =>
  ({
    type: "pcb_board",
    pcb_board_id: "board0",
    center: { x: 0, y: 0 },
    width: 50,
    height: 14,
    num_layers: 2,
  }) as unknown as AnyCircuitElement

describe("classifyPcbComponents", () => {
  it("classifies a top-side SMT chip as smt_top", () => {
    const elements = [mkPcbComponent("c1", "top"), mkSmtPad("p1", "c1", "top")]
    const kindById = classifyPcbComponents(elements)
    expect(kindById.get("c1")).toBe("smt_top")
  })

  it("classifies a bottom-side SMT chip as smt_bottom", () => {
    const elements = [
      mkPcbComponent("c1", "bottom"),
      mkSmtPad("p1", "c1", "bottom"),
    ]
    const kindById = classifyPcbComponents(elements)
    expect(kindById.get("c1")).toBe("smt_bottom")
  })

  it("classifies a connector with a plated hole as through_hole", () => {
    const elements = [mkPcbComponent("c1", "top"), mkPlatedHole("ph1", "c1")]
    const kindById = classifyPcbComponents(elements)
    expect(kindById.get("c1")).toBe("through_hole")
  })

  it("classifies a chip with both SMT pads and a plated hole as through_hole", () => {
    const elements = [
      mkPcbComponent("c1", "top"),
      mkSmtPad("p1", "c1", "top"),
      mkPlatedHole("ph1", "c1"),
    ]
    expect(classifyPcbComponents(elements).get("c1")).toBe("through_hole")
  })
})

describe("getHiddenPcbComponentIds", () => {
  const mixedBoard: AnyCircuitElement[] = [
    mkBoard(),
    mkPcbComponent("top1", "top"),
    mkSmtPad("p_top1", "top1", "top"),
    mkPcbComponent("top2", "top"),
    mkSmtPad("p_top2", "top2", "top"),
    mkPcbComponent("bot1", "bottom"),
    mkSmtPad("p_bot1", "bot1", "bottom"),
    mkPcbComponent("conn1", "top"),
    mkPlatedHole("ph_conn1", "conn1"),
  ]

  it("returns an empty set when both layers are visible", () => {
    expect(getHiddenPcbComponentIds(mixedBoard, true, true).size).toBe(0)
  })

  it("hides only top SMT components when top is toggled off", () => {
    const hidden = getHiddenPcbComponentIds(mixedBoard, false, true)
    expect(hidden.has("top1")).toBe(true)
    expect(hidden.has("top2")).toBe(true)
    expect(hidden.has("bot1")).toBe(false)
    expect(hidden.has("conn1")).toBe(false) // through-hole stays visible
  })

  it("hides only bottom SMT components when bottom is toggled off", () => {
    const hidden = getHiddenPcbComponentIds(mixedBoard, true, false)
    expect(hidden.has("top1")).toBe(false)
    expect(hidden.has("bot1")).toBe(true)
    expect(hidden.has("conn1")).toBe(false)
  })

  it("keeps through-hole components visible even when both SMT layers are off", () => {
    const hidden = getHiddenPcbComponentIds(mixedBoard, false, false)
    expect(hidden.has("top1")).toBe(true)
    expect(hidden.has("top2")).toBe(true)
    expect(hidden.has("bot1")).toBe(true)
    expect(hidden.has("conn1")).toBe(false)
  })
})

describe("filterElementsByVisibility", () => {
  const board: AnyCircuitElement[] = [
    mkBoard(),
    mkPcbComponent("top1", "top"),
    mkSmtPad("p_top1", "top1", "top"),
    mkPcbComponent("conn1", "top"),
    mkPlatedHole("ph_conn1", "conn1"),
    {
      type: "pcb_trace",
      pcb_trace_id: "t1",
      route: [],
    } as unknown as AnyCircuitElement,
  ]

  it("returns the original array when nothing is hidden", () => {
    const out = filterElementsByVisibility(board, new Set())
    expect(out).toBe(board)
  })

  it("drops elements whose pcb_component_id is hidden, keeps board/trace untouched", () => {
    const out = filterElementsByVisibility(board, new Set(["top1"]))
    expect(
      out.find((e) => (e as any).pcb_component_id === "top1"),
    ).toBeUndefined()
    expect(
      out.find((e) => (e as any).pcb_smtpad_id === "p_top1"),
    ).toBeUndefined()
    expect(out.find((e) => e.type === "pcb_board")).toBeDefined()
    expect(out.find((e) => e.type === "pcb_trace")).toBeDefined()
    expect(
      out.find((e) => (e as any).pcb_component_id === "conn1"),
    ).toBeDefined()
    expect(
      out.find((e) => (e as any).pcb_plated_hole_id === "ph_conn1"),
    ).toBeDefined()
  })
})
