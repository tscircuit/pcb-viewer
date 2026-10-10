import { expect, test } from "bun:test"
import { compileCircuitJson } from "@tscircuit/circuit-json-webgpu"
import type { CircuitJson } from "circuit-json"
import translatedPaths from "./webgpu/fixtures/translated-fabrication-paths.circuit.json"

test("the bundled WebGPU renderer compiles translated fabrication paths", () => {
  const scene = compileCircuitJson(translatedPaths as CircuitJson)
  expect(scene.diagnostics).toEqual([])
  for (const name of ["top_fabrication", "bottom_fabrication"]) {
    const mesh = scene.layers.find((layer) => layer.name === name)!.paint
    expect(mesh.indices.length).toBeGreaterThan(0)
    expect([...mesh.vertices].every(Number.isFinite)).toBe(true)
  }
})
