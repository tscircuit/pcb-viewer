import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { checkForShorts } from "../../src/lib/check-shorts/check-for-shorts"
import { convertShortsToErrorElements } from "../../src/lib/check-shorts/convert-shorts-to-error-elements"
import type { BitmapShort } from "../../src/lib/check-shorts/load-check-shorts-module"

const createShort = (overrides: Partial<BitmapShort> = {}): BitmapShort => ({
  mode: "pcb",
  layer: "top",
  firstConnectivityKey: "connectivity_net0",
  secondConnectivityKey: "connectivity_net1",
  pixelCount: 12,
  center: { x: 1, y: 2 },
  firstOwnerLabels: ["U1.VCC"],
  secondOwnerLabels: ["U1.GND"],
  ...overrides,
})

test("checkForShorts checks every copper layer of the board", async () => {
  const circuitJson = [
    { type: "pcb_board", pcb_board_id: "board", num_layers: 4 },
  ] as AnyCircuitElement[]
  const checkedLayers: string[] = []

  const shorts = await checkForShorts(circuitJson, {
    loadModule: async () => ({
      findBitmapShorts: async (_circuitJson, options) => {
        expect(options?.mode).toBe("pcb")
        checkedLayers.push(options!.layer!)
        return options?.layer === "inner1"
          ? [createShort({ layer: "inner1" })]
          : []
      },
    }),
  })

  expect(checkedLayers).toEqual(["top", "inner1", "inner2", "bottom"])
  expect(shorts.map((short) => short.layer)).toEqual(["inner1"])
})

test("convertShortsToErrorElements places a described error at each short", () => {
  const errors = convertShortsToErrorElements([
    createShort(),
    createShort({
      layer: "bottom",
      center: { x: -3, y: 4 },
      firstOwnerLabels: ["J1.1", "J1.2", "J1.3", "J1.4", "J1.5"],
      secondOwnerLabels: [],
    }),
  ]) as any[]

  expect(errors.map((error) => error.type)).toEqual([
    "pcb_trace_error",
    "pcb_trace_error",
  ])
  expect(errors.map((error) => error.center)).toEqual([
    { x: 1, y: 2 },
    { x: -3, y: 4 },
  ])
  expect(errors.map((error) => error.message)).toEqual([
    "Short on top layer: U1.VCC is touching U1.GND",
    "Short on bottom layer: J1.1, J1.2, J1.3 +2 more is touching (unknown)",
  ])
  expect(new Set(errors.map((error) => error.pcb_trace_error_id)).size).toBe(2)
})
