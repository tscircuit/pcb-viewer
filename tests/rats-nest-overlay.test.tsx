import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { renderToStaticMarkup } from "react-dom/server"
import { ContextProviders } from "../src/components/ContextProviders"
import { RatsNestOverlay } from "../src/components/RatsNestOverlay"

const routedPorts: AnyCircuitElement[] = [
  {
    type: "source_port",
    source_port_id: "source_port_1",
    source_component_id: "source_component_1",
    name: "1",
    pin_number: 1,
  },
  {
    type: "source_port",
    source_port_id: "source_port_2",
    source_component_id: "source_component_2",
    name: "1",
    pin_number: 1,
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_1", "source_port_2"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    pcb_component_id: "pcb_component_1",
    x: 0,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    pcb_component_id: "pcb_component_2",
    x: 5,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_1",
    source_trace_id: "source_trace_1",
    route: [
      {
        route_type: "wire",
        x: 0,
        y: 0,
        width: 0.2,
        layer: "top",
        start_pcb_port_id: "pcb_port_1",
      },
      {
        route_type: "wire",
        x: 5,
        y: 0,
        width: 0.2,
        layer: "top",
        end_pcb_port_id: "pcb_port_2",
      },
    ],
  },
]

function renderRatsNest(show: boolean, onlyUnconnected: boolean) {
  return renderToStaticMarkup(
    <ContextProviders
      initialState={{
        is_showing_rats_nest: show,
        is_showing_only_unconnected_rats_nest: onlyUnconnected,
      }}
    >
      <RatsNestOverlay soup={routedPorts}>
        <span>Board content</span>
      </RatsNestOverlay>
    </ContextProviders>,
  )
}

test("unconnected view omits an already routed connection", () => {
  expect(renderRatsNest(true, true).match(/<line /g) ?? []).toHaveLength(0)
})

test("all-connections view keeps the existing airwires", () => {
  expect(renderRatsNest(true, false).match(/<line /g) ?? []).toHaveLength(2)
})

test("hidden rats nest keeps the board content without an overlay", () => {
  const markup = renderRatsNest(false, true)
  expect(markup).toContain("Board content")
  expect(markup).not.toContain("<svg")
})
