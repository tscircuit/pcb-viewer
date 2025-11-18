import { describe, it, expect, mock } from "bun:test"

mock.module("@tscircuit/circuit-json-util", () => ({
  su: () => ({
    pcb_port: new Map(),
  }),
}))

mock.module("circuit-json", () => ({
  distance: {
    parse: (value: number | string) =>
      typeof value === "number" ? value : Number.parseFloat(String(value)),
  },
}))

const convertElementToPrimitivesPromise = import(
  "../../src/lib/convert-element-to-primitive"
)

describe("convertElementToPrimitives", () => {
  describe("pcb_cutout path", () => {
    it("normalizes route arrays into polygon_with_arcs primitives", async () => {
      const { convertElementToPrimitives } =
        await convertElementToPrimitivesPromise

      const cutout = {
        type: "pcb_cutout",
        pcb_cutout_id: "cutout1",
        shape: "path",
        route: [
          { x: 0, y: 9 },
          { x: 9, y: 9 },
          { x: 9, y: -9 },
          { x: -9, y: -9 },
          { x: -9, y: 9 },
          { x: 0, y: 9 },
        ],
        slot_width: 1,
        slot_length: 6,
        space_between_slots: 0.6,
      } as any

      const primitives = convertElementToPrimitives(cutout, [cutout])

      expect(primitives).toHaveLength(1)
      const [primitive] = primitives

      expect(primitive.pcb_drawing_type).toBe("polygon_with_arcs")
      expect(primitive.layer).toBe("drill")
      expect(primitive.brep_shape?.outer_ring.vertices).toEqual([
        { x: 0, y: 9 },
        { x: 9, y: 9 },
        { x: 9, y: -9 },
        { x: -9, y: -9 },
        { x: -9, y: 9 },
        { x: 0, y: 9 },
      ])
    })
  })
})
