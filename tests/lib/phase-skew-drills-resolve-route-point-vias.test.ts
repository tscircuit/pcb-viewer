import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPhaseSkewDrilledElements } from "../../src/lib/get-phase-skew-drilled-elements"
import {
  renderRouteOnlyViaPairBoard,
  renderViaPairBoard,
} from "../fixtures/phase-skew/via-pair-board"

test("the overlay's drill pass gets each via once, including route-point vias, and no traces", () => {
  const routeOnlyDrills = getPhaseSkewDrilledElements({
    elements: renderRouteOnlyViaPairBoard() as AnyCircuitElement[],
  })
  expect(
    routeOnlyDrills.map((drill) => [drill.type, drill.x, drill.y]),
  ).toEqual([
    ["pcb_via", 0, 0.3],
    ["pcb_via", 0, -0.3],
  ])
  // A pcb_via record covers its route point, so no second via is made.
  const elements = renderViaPairBoard() as AnyCircuitElement[]
  const recordedVias = elements.filter((element) => element.type === "pcb_via")
  expect(getPhaseSkewDrilledElements({ elements })).toEqual(recordedVias)
})
