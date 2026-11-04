import { expect, test } from "bun:test"
import { compileCircuitJson } from "@tscircuit/circuit-json-webgpu"
import type { CircuitJson } from "circuit-json"

test("the released WebGPU dependency renders named-color PCB notes", () => {
  for (const [color, hex] of [
    ["white", "#ffffff"],
    ["red", "#ff0000"],
    ["rebeccapurple", "#663399"],
    ["  WHITE  ", "#ffffff"],
  ]) {
    const notes = (value: string): CircuitJson => [
      {
        type: "pcb_note_text",
        pcb_note_text_id: "colored_note",
        text: "Named color\nPCB note",
        font: "tscircuit2024",
        font_size: 1,
        anchor_position: { x: 0, y: 0 },
        anchor_alignment: "center",
        color: value,
        layer: "top",
      },
    ]
    const named = compileCircuitJson(notes(color))
    const numeric = compileCircuitJson(notes(hex))
    expect(named.diagnostics).toEqual([])
    expect(named.layers.some((layer) => layer.paint.indices.length > 0)).toBe(
      true,
    )
    expect(named.layers).toEqual(numeric.layers)
  }
})
