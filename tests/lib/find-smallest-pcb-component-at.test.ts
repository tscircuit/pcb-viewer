import { describe, expect, test } from "bun:test"
import type { PcbComponent } from "circuit-json"
import { findSmallestPcbComponentAt } from "../../src/lib/find-smallest-pcb-component-at"

const pcb = (
  id: string,
  center: { x: number; y: number },
  width: number,
  height: number,
): PcbComponent =>
  ({
    type: "pcb_component",
    pcb_component_id: id,
    center,
    width,
    height,
    layer: "top",
    rotation: 0,
    source_component_id: `source_${id}`,
  }) as PcbComponent

describe("findSmallestPcbComponentAt", () => {
  test("returns null when nothing is under the point", () => {
    const soup = [pcb("big", { x: 0, y: 0 }, 10, 10)]
    expect(findSmallestPcbComponentAt(soup, { x: 100, y: 100 })).toBeNull()
  })

  test("returns the only component under the point", () => {
    const soup = [pcb("only", { x: 0, y: 0 }, 4, 2)]
    expect(
      findSmallestPcbComponentAt(soup, { x: 0, y: 0 })?.pcb_component_id,
    ).toBe("only")
  })

  test("prefers the smallest overlapping component even if a larger one appears first", () => {
    const soup = [
      pcb("board_chip", { x: 0, y: 0 }, 20, 20),
      pcb("tiny_cap", { x: 1, y: 1 }, 1, 1),
      pcb("medium", { x: 0.5, y: 0.5 }, 4, 4),
    ]

    expect(
      findSmallestPcbComponentAt(soup, { x: 1, y: 1 })?.pcb_component_id,
    ).toBe("tiny_cap")
  })

  test("respects padding when deciding hits", () => {
    const soup = [pcb("edge", { x: 0, y: 0 }, 2, 2)]
    expect(findSmallestPcbComponentAt(soup, { x: 1.4, y: 0 }, 0)).toBeNull()
    expect(
      findSmallestPcbComponentAt(soup, { x: 1.4, y: 0 }, 0.5)?.pcb_component_id,
    ).toBe("edge")
  })
})
