import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { renderToStaticMarkup } from "react-dom/server"
import { ReturnCurrentSimulationOverlay } from "../../src/components/ReturnCurrentSimulationOverlay"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "signal",
    route: [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      { route_type: "via", x: 1, y: 0, from_layer: "top", to_layer: "bottom" },
      { route_type: "wire", x: 1, y: 1, width: 0.2, layer: "bottom" },
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "actual-ground-pad",
    source_port_id: "ground-source-port",
    x: -1,
    y: 1,
    layers: ["top"],
  },
  {
    type: "simulation_experiment",
    simulation_experiment_id: "experiment",
    name: "Unit test",
    experiment_type: "pcb_return_current",
  },
  {
    type: "simulation_return_current_excitation",
    simulation_return_current_excitation_id: "excitation",
    simulation_experiment_id: "experiment",
    pcb_trace_id: "signal",
    ground_source_net_id: "ground",
    current: 0.005,
    return_source: {
      contact_type: "pcb_port",
      pcb_port_id: "actual-ground-pad",
      x: -1,
      y: 1,
      layer: "top",
    },
    return_sink: {
      contact_type: "pcb_port",
      pcb_port_id: "actual-ground-pad",
      x: -1,
      y: 1,
      layer: "top",
    },
  },
  {
    type: "simulation_pcb_return_current_result",
    simulation_pcb_return_current_result_id: "result",
    simulation_experiment_id: "experiment",
    pcb_board_id: "board",
    simulation_return_current_excitation_ids: ["excitation"],
    frequency_hz: 400e6,
  },
  {
    type: "simulation_pcb_return_current_heatmap",
    simulation_pcb_return_current_heatmap_id: "heatmap",
    simulation_pcb_return_current_result_id: "result",
    source_net_id: "ground",
    layer: "bottom",
    min_x: -2,
    max_x: 2,
    min_y: -1,
    max_y: 1,
    image_asset: {
      project_relative_path: "unit.png",
      mimetype: "image/png",
      url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    },
  },
  {
    type: "simulation_pcb_return_current_marker",
    simulation_pcb_return_current_marker_id: "return-marker",
    simulation_pcb_return_current_result_id: "result",
    role: "return_sink",
    target_type: "pcb_port",
    pcb_port_id: "actual-ground-pad",
    layer: "top",
    label: "Actual GND pad",
    label_x: 0,
    label_y: 0,
  },
]

const render = (elements = circuitJson, zoom = 10) =>
  renderToStaticMarkup(
    <ReturnCurrentSimulationOverlay
      circuitJson={elements}
      simulation={{ resultId: "result", layer: "bottom", pcbTraceId: "signal" }}
      transform={{ a: zoom, b: 0, c: 0, d: -zoom, e: 100, f: 100 }}
      width={200}
      height={200}
    />,
  )

test("overlay aligns the stored PNG to PCB bounds and highlights both signal layers through the via", () => {
  const svg = render()
  expect(svg).toContain('transform="matrix(40 0 0 20 80 90)"')
  expect(svg).toContain('data-signal-layer="top"')
  expect(svg).toContain('data-signal-layer="bottom"')
  expect(svg).toContain('data-signal-transition="top:bottom"')
  expect(svg).toContain('stroke="#08d9ef"')
  expect(svg).toContain('stroke="#ff941f"')
  expect(svg).toContain("400 MHz")
  expect(svg).toContain("pointer-events:none")
})

test("GND terminal circles use the referenced actual PCB port, while labels stay the same screen size through zoom", () => {
  const svg = render()
  const terminal = svg.match(
    /<g[^>]*data-role="return_sink"[^>]*>(.*?)<\/g>/,
  )?.[1]
  expect(svg).toContain('data-target-id="actual-ground-pad"')
  expect(terminal).toContain('cx="90" cy="90"')
  expect(terminal).toContain('r="7"')
  expect(terminal).toContain('font-size="11"')
  const zoomed = render(circuitJson, 20)
  const zoomedTerminal = zoomed.match(
    /<g[^>]*data-role="return_sink"[^>]*>(.*?)<\/g>/,
  )?.[1]
  expect(zoomedTerminal).toContain('cx="80" cy="80"')
  expect(zoomedTerminal).toContain('r="7"')
  expect(zoomedTerminal).toContain('font-size="11"')
})

test("missing GND marker targets surface an error instead of inventing a return location", () => {
  const svg = render(
    circuitJson.filter((element) => element.type !== "pcb_port"),
  )
  expect(svg).toContain('data-state="error"')
  expect(svg).toContain(
    "Simulation terminal references a missing PCB pad or via",
  )
  expect(svg).not.toContain("data-return-current-terminal")
})
