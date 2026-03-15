import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SparkfunBoards: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "700px" }}>
      <PCBViewer
        circuitJson={[
          {
            type: "pcb_plated_hole",
            pcb_plated_hole_id: "pcb_plated_hole_0",
            pcb_component_id: "pcb_component_0",
            pcb_port_id: "pcb_port_0",
            outer_diameter: 1.88,
            hole_diameter: 1.016,
            shape: "circle",
            port_hints: ["unnamed_platedhole1", "pin1"],
            x: -8,
            y: 0,
            layers: ["top", "bottom"],
            is_covered_with_solder_mask: false,
            subcircuit_id: "subcircuit_source_group_0",
          },
          {
            type: "pcb_plated_hole",
            pcb_plated_hole_id: "pcb_plated_hole_5",
            pcb_component_id: "pcb_component_1",
            pcb_port_id: "pcb_port_5",
            outer_diameter: 1.88,
            hole_diameter: 1.016,
            shape: "circle",
            port_hints: ["unnamed_platedhole6", "1"],
            x: 8,
            y: 0,
            layers: ["top", "bottom"],
            is_covered_with_solder_mask: false,
            subcircuit_id: "subcircuit_source_group_0",
          },
          {
            type: "pcb_trace",
            pcb_trace_id: "source_net_0_0",
            route: [
              {
                route_type: "wire",
                x: 8,
                y: 0,
                width: 0.15,
                layer: "bottom",
                start_pcb_port_id: "pcb_port_5",
              },
              {
                route_type: "wire",
                x: 0,
                y: 0,
                width: 0.15,
                layer: "bottom",
              },
              {
                route_type: "via",
                x: 0,
                y: 0,
                from_layer: "bottom",
                to_layer: "top",
              },
              {
                route_type: "wire",
                x: 0,
                y: 0,
                width: 0.15,
                layer: "top",
              },
              {
                route_type: "wire",
                x: -8,
                y: 0,
                width: 0.15,
                layer: "top",
                end_pcb_port_id: "pcb_port_0",
              },
            ],
            subcircuit_id: "subcircuit_source_group_0",
            source_trace_id: "source_net_0",
          },
          {
            type: "pcb_via",
            pcb_via_id: "pcb_via_0",
            pcb_trace_id: "source_net_0_0",
            x: 0,
            y: 0,
            hole_diameter: 0.2,
            outer_diameter: 0.3,
            layers: ["bottom", "top"],
            from_layer: "bottom",
            to_layer: "top",
          },
        ]}
      />
    </div>
  )
}

export default SparkfunBoards
