import { expect, test } from "bun:test"
import { compileCircuitJson } from "@tscircuit/circuit-json-webgpu"
import type { CircuitJson } from "circuit-json"

test("the released WebGPU dependency paints blind and buried via drills", () => {
  for (const layers of [
    ["top", "bottom"],
    ["top", "inner1"],
    ["inner1", "inner2"],
    ["inner4", "bottom"],
  ]) {
    const scene = compileCircuitJson([
      {
        type: "pcb_board",
        pcb_board_id: "board",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        num_layers: 6,
      },
      {
        type: "pcb_via",
        pcb_via_id: "via",
        x: 0,
        y: 0,
        layers,
        outer_diameter: 0.4,
        hole_diameter: 0.25,
      },
    ] as CircuitJson)
    expect(scene.diagnostics).toEqual([])
    const drill = scene.layers.find(
      (layer) => layer.name === "drill" || layer.name.startsWith("drill:"),
    )
    expect(drill).toBeDefined()
    expect(drill!.paint.indices.length).toBeGreaterThan(0)
    expect([...drill!.paint.vertices.slice(2, 6)]).toEqual([
      1,
      expect.closeTo(38 / 255),
      expect.closeTo(226 / 255),
      1,
    ])
  }
})
