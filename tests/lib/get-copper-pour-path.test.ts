import { afterEach, describe, expect, it } from "bun:test"
import type { PcbCopperPour } from "circuit-json"
import { getCopperPourPath } from "../../src/lib/get-copper-pour-path"

class RecordingPath {
  commands: Array<[string, ...number[]]> = []
  moveTo(x: number, y: number) {
    this.commands.push(["moveTo", x, y])
  }
  lineTo(x: number, y: number) {
    this.commands.push(["lineTo", x, y])
  }
  closePath() {
    this.commands.push(["closePath"])
  }
  arc(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    ccw: boolean,
  ) {
    this.commands.push(["arc", x, y, radius, start, end, Number(ccw)])
  }
}
const originalPath2D = globalThis.Path2D
const transform = { a: 2, b: 0, c: 0, d: -2, e: 100, f: 200 }
function record(pour: PcbCopperPour) {
  globalThis.Path2D = RecordingPath as unknown as typeof Path2D
  return getCopperPourPath(pour, transform) as unknown as RecordingPath & Path2D
}
afterEach(() => {
  globalThis.Path2D = originalPath2D
})

describe("copper pour paths", () => {
  it("reuses translation-independent paths and rebuilds after zoom or replacement", () => {
    const pour = {
      type: "pcb_copper_pour",
      shape: "polygon",
      layer: "top",
      pcb_copper_pour_id: "p",
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 2 },
      ],
    } as PcbCopperPour
    const first = record(pour)
    expect(first.commands).toEqual([
      ["moveTo", 2, -4],
      ["lineTo", 6, -8],
      ["lineTo", 10, -4],
      ["closePath"],
    ])
    expect(getCopperPourPath(pour, { ...transform, e: 500, f: 700 })).toBe(
      first,
    )
    expect(getCopperPourPath(pour, { ...transform, a: 4, d: -4 })).not.toBe(
      first,
    )
    expect(getCopperPourPath({ ...pour }, transform)).not.toBe(first)
  })

  it("applies rotation and zoom to rectangular pours", () => {
    const path = record({
      type: "pcb_copper_pour",
      shape: "rect",
      layer: "top",
      pcb_copper_pour_id: "r",
      center: { x: 3, y: 4 },
      width: 2,
      height: 4,
      rotation: 90,
    } as PcbCopperPour)
    const expected = [
      [10, -6],
      [10, -10],
      [2, -10],
      [2, -6],
    ]
    for (let i = 0; i < expected.length; i++) {
      expect(path.commands[i][1] as number).toBeCloseTo(expected[i][0])
      expect(path.commands[i][2] as number).toBeCloseTo(expected[i][1])
    }
    expect(path.commands.at(-1)).toEqual(["closePath"])
  })

  it("preserves curved holes in brep pours under the flipped canvas transform", () => {
    const path = record({
      type: "pcb_copper_pour",
      shape: "brep",
      layer: "top",
      pcb_copper_pour_id: "b",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 4, y: 4 },
            { x: 0, y: 4 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: 1, y: 2, bulge: 1 },
              { x: 3, y: 2, bulge: 1 },
            ],
          },
        ],
      },
    } as PcbCopperPour)
    const arcs = path.commands.filter((command) => command[0] === "arc")
    expect(arcs).toHaveLength(2)
    for (const arc of arcs) {
      expect(arc.slice(1, 4)).toEqual([4, -4, 2])
      expect(arc[6]).toBe(0)
    }
  })
})
