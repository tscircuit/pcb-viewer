import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { renderToStaticMarkup } from "react-dom/server"
import { ContextProviders } from "../src/components/ContextProviders"
import { ErrorOverlay } from "../src/components/ErrorOverlay"
import { findErrorElementById, getErrorId } from "../src/lib/util/get-error-id"

test("displays component creation error message in red text when building circuit fails", () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="10mm" height="10mm">
      {/* @ts-expect-error testing invalid resistor props */}
      <resistor footprint="some-invalid-name" />
    </board>,
  )

  const elements = circuit.getCircuitJson() as AnyCircuitElement[]
  const html = renderToStaticMarkup(
    <ContextProviders>
      <ErrorOverlay elements={elements}>
        <div>canvas</div>
      </ErrorOverlay>
    </ContextProviders>,
  )

  expect(html).toContain("Could not create resistor")
  expect(html).toContain("color:red")
  expect(html).toContain("opacity:1")
})

test("renders pcb_component_outside_board_error and resolves fallback error IDs consistently", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_component_outside_board_error",
      error_type: "pcb_component_outside_board_error",
      pcb_component_id: "pcb_component_0",
      pcb_board_id: "pcb_board_0",
      component_center: { x: 12, y: 5 },
      component_bounds: {
        min_x: 9,
        max_x: 15,
        min_y: 3,
        max_y: 7,
      },
      message: "Component extends outside the board boundary",
    } as any,
  ]

  const fallbackErrorId = getErrorId(elements[1], 0)
  expect(findErrorElementById(elements, fallbackErrorId)).toBe(elements[1])

  const html = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_drc_errors: true }}>
      <ErrorOverlay elements={elements}>
        <div>canvas</div>
      </ErrorOverlay>
    </ContextProviders>,
  )

  expect(html).toContain("Component extends outside the board boundary")
})
