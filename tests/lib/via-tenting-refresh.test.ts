import { expect, test } from "bun:test"
import type {
  PcbBoard,
  PcbTrace,
  PcbTraceRoutePointVia,
  PcbVia,
} from "circuit-json"
import { calculateCircuitJsonKey } from "../../src/lib/calculate-circuit-json-key"

test("board, standalone via, and route via tenting changes invalidate the viewer", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  }
  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    outer_diameter: 0.6,
    hole_diameter: 0.3,
  }
  const routeVia: PcbTraceRoutePointVia = {
    route_type: "via",
    x: 1,
    y: 0,
    from_layer: "top",
    to_layer: "bottom",
  }
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [routeVia],
  }
  const circuit = [board, via, trace]
  const originalKey = calculateCircuitJsonKey(circuit)

  expect(
    calculateCircuitJsonKey([
      { ...board, default_via_tented_on_top: true },
      via,
      trace,
    ]),
  ).not.toBe(originalKey)
  expect(
    calculateCircuitJsonKey([
      { ...board, default_via_tented_on_bottom: false },
      via,
      trace,
    ]),
  ).not.toBe(originalKey)
  expect(
    calculateCircuitJsonKey([board, { ...via, tented_on_top: false }, trace]),
  ).not.toBe(originalKey)
  expect(
    calculateCircuitJsonKey([board, { ...via, tented_on_bottom: true }, trace]),
  ).not.toBe(originalKey)
  expect(
    calculateCircuitJsonKey([
      board,
      via,
      { ...trace, route: [{ ...routeVia, tented_on_top: false }] },
    ]),
  ).not.toBe(originalKey)
  expect(
    calculateCircuitJsonKey([
      board,
      via,
      { ...trace, route: [{ ...routeVia, tented_on_bottom: true }] },
    ]),
  ).not.toBe(originalKey)
  expect(calculateCircuitJsonKey(structuredClone(circuit))).toBe(originalKey)
})
