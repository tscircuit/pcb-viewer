import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import drv8307EvmFabricationDimensions from "../webgpu/fixtures/drv8307evm-fabrication-dimensions.circuit.json"
import { getDefaultPcbViewBounds } from "../../src/lib/get-default-pcb-view-bounds"

test("fits a converted EVM to its board instead of fabrication annotations", () => {
  const bounds = getDefaultPcbViewBounds(
    drv8307EvmFabricationDimensions as AnyCircuitElement[],
  )

  expect(bounds.center.x).toBeCloseTo(61.4426)
  expect(bounds.center.y).toBeCloseTo(76.463652)
  expect(bounds.width).toBeCloseTo(87.7316)
  expect(bounds.height).toBeCloseTo(75.000104)
})
