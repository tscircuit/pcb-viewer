import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { checkForShorts } from "../../src/lib/check-shorts/check-for-shorts"
import type { BitmapShort } from "../../src/lib/check-shorts/load-check-shorts-module"

const inner1Short: BitmapShort = {
  mode: "pcb",
  layer: "inner1",
  firstConnectivityKey: "connectivity_net0",
  secondConnectivityKey: "connectivity_net1",
  pixelCount: 12,
  center: { x: 1, y: 2 },
  firstOwnerLabels: ["U1.VCC"],
  secondOwnerLabels: ["U1.GND"],
}

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
        return options?.layer === "inner1" ? [inner1Short] : []
      },
    }),
  })

  expect(checkedLayers).toEqual(["top", "inner1", "inner2", "bottom"])
  expect(shorts).toEqual([inner1Short])
})
