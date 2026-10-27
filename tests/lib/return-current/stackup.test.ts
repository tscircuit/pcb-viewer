import { expect, test } from "bun:test"
import {
  defaultReturnCurrentStackup,
  jlcpcbFourLayerStackup,
  returnCurrentStackupSchema,
} from "../../../src/lib/return-current/stackup"
import { createReturnCurrentSimulationClient } from "../../../src/lib/return-current/client"

test("JLCPCB preset preserves published dimensions and is only defaulted for matching boards", () => {
  const preset = jlcpcbFourLayerStackup()
  expect(returnCurrentStackupSchema.parse(preset)).toEqual(preset)
  expect(
    preset.layers.reduce(
      (sum, layer) =>
        sum +
        ("name" in layer
          ? layer.copperThicknessMm
          : layer.dielectricThicknessMm),
      0,
    ),
  ).toBeCloseTo(1.1212, 10)
  expect(JSON.parse(defaultReturnCurrentStackup(4, 1.2))).toEqual(preset)
  expect(defaultReturnCurrentStackup(4, 1.6)).toBe("")
  expect(defaultReturnCurrentStackup(2, 1.2)).toBe("")
  const wrong = structuredClone(preset)
  wrong.layers.reverse()
  expect(() => returnCurrentStackupSchema.parse(wrong)).toThrow("Alternate")
})

test("HTTP adapter preserves edited stackup and inner-layer selection", async () => {
  const stackup = jlcpcbFourLayerStackup()
  stackup.layers[1] = {
    material: "measured",
    dielectricThicknessMm: 0.2,
    dielectricConstant: 4.2,
    lossTangent: 0.01,
  }
  let body: any
  const client = createReturnCurrentSimulationClient({
    fetch: async (_url, init) => {
      body = JSON.parse(String(init?.body))
      return Response.json({
        accepted: true,
        request_id: "stackup-job",
        status: "queued",
        stackup,
      })
    },
  })
  const job = await client.submit({
    requestId: "stackup-job",
    circuitJson: [],
    experimentId: "experiment",
    frequencyHz: 400e6,
    copperModel: "surface_impedance_copper",
    sampleLayer: "inner2",
    cellSize: 0.1,
    meshSize: 2,
    order: 1,
    airPadding: 2,
    processes: 1,
    stackup,
  })
  expect(job.stackup).toEqual(stackup)
  expect(body.stackup).toEqual(stackup)
  expect(body.sample_layer).toBe("inner2")
})
