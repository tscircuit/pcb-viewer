import React from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    width: 48,
    height: 34,
    center: { x: 0, y: 0 },
    num_layers: 2,
    material: "fr4",
    thickness: 1.6,
  },
  {
    type: "source_component",
    source_component_id: "source_component_u1",
    name: "U1",
    supplier_part_numbers: {},
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_u1",
    source_component_id: "source_component_u1",
    layer: "top",
    center: { x: -8, y: 0 },
    rotation: 0,
    width: 6,
    height: 4,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_component_u1",
    pcb_smtpad_id: "pcb_smtpad_u1_0",
    shape: "rect",
    x: -10,
    y: 0,
    width: 1.2,
    height: 1.2,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_component_u1",
    pcb_smtpad_id: "pcb_smtpad_u1_1",
    shape: "rect",
    x: -6,
    y: 0,
    width: 1.2,
    height: 1.2,
  },
  {
    type: "source_component",
    source_component_id: "source_component_j1",
    name: "J1",
    supplier_part_numbers: {},
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_j1",
    source_component_id: "source_component_j1",
    layer: "top",
    center: { x: 21, y: 9 },
    rotation: 0,
    width: 7,
    height: 5,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_component_j1",
    pcb_smtpad_id: "pcb_smtpad_j1_0",
    shape: "rect",
    x: 19,
    y: 9,
    width: 1.2,
    height: 1.2,
  },
  {
    type: "pcb_smtpad",
    layer: "top",
    pcb_component_id: "pcb_component_j1",
    pcb_smtpad_id: "pcb_smtpad_j1_1",
    shape: "rect",
    x: 23,
    y: 9,
    width: 1.2,
    height: 1.2,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    layers: ["top"],
    x: -10,
    y: 0,
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    layers: ["top"],
    x: -2,
    y: 6,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    route: [
      {
        x: -10,
        y: 0,
        route_type: "wire",
        layer: "top",
        width: 0.22,
        start_pcb_port_id: "pcb_port_0",
      },
      {
        x: -6,
        y: 3,
        route_type: "wire",
        layer: "top",
        width: 0.22,
      },
      {
        x: -2,
        y: 6,
        route_type: "wire",
        layer: "top",
        width: 0.22,
        end_pcb_port_id: "pcb_port_1",
      },
    ],
  },
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_0",
    pcb_trace_id: "pcb_trace_0",
    x: 7,
    y: -4,
    hole_diameter: 0.25,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_1",
    pcb_trace_id: "pcb_trace_0",
    x: 7.55,
    y: -4.05,
    hole_diameter: 0.25,
    outer_diameter: 0.6,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
  {
    type: "pcb_trace_error",
    pcb_trace_error_id: "pcb_trace_error_focus_0",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
    pcb_port_ids: ["pcb_port_0", "pcb_port_1"],
    pcb_component_ids: ["pcb_component_u1"],
    error_type: "pcb_trace_error",
    center: { x: -6, y: 3 },
    message:
      "Trace overlaps a nearby pad. Clicking this should smoothly zoom to the trace segment and highlight the overlap region.",
  } as any,
  {
    type: "pcb_via_clearance_error",
    pcb_via_clearance_error_id: "pcb_via_clearance_error_focus_0",
    pcb_error_id: "pcb_error_via_clearance_0",
    error_type: "pcb_via_clearance_error",
    pcb_via_ids: ["pcb_via_0", "pcb_via_1"],
    minimum_clearance: 0.2,
    actual_clearance: 0.08,
    pcb_center: { x: 7.275, y: -4.025 },
    message:
      "Vias are too close together. Clicking this should zoom to the via pair and highlight them.",
  } as any,
  {
    type: "pcb_component_outside_board_error",
    pcb_component_outside_board_error_id: "pcb_component_outside_board_error_0",
    error_type: "pcb_component_outside_board_error",
    pcb_component_id: "pcb_component_j1",
    pcb_board_id: "pcb_board_0",
    component_center: { x: 21, y: 9 },
    component_bounds: {
      min_x: 17.5,
      max_x: 24.5,
      min_y: 6.5,
      max_y: 11.5,
    },
    message:
      "Component extends outside the board boundary. Clicking this should zoom to the component near the edge.",
  } as any,
  {
    type: "source_failed_to_create_component_error",
    source_failed_to_create_component_error_id:
      "source_failed_to_create_component_error_0",
    component_name: "DNP1",
    error_type: "source_failed_to_create_component_error",
    pcb_center: { x: 0, y: 0 },
    message:
      'Could not create component "DNP1". This error should highlight in the list, but it should not trigger a zoom because there is no valid PCB target to focus.',
  } as any,
]

export const ErrorFocusValidRepro: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", padding: 16 }}>
      <div
        style={{
          color: "white",
          fontFamily: "sans-serif",
          marginBottom: 12,
          maxWidth: 720,
          lineHeight: 1.4,
        }}
      >
        Click errors in the toolbar to test smooth zoom-to-error behavior.
        Trace, via-clearance, and component-outside-board errors should focus
        the viewer. The `source_failed_to_create_component_error` entry should
        not zoom.
      </div>
      <PCBViewer
        circuitJson={circuitJson}
        height={560}
        initialState={{
          is_showing_drc_errors: true,
        }}
      />
    </div>
  )
}

export default ErrorFocusValidRepro
