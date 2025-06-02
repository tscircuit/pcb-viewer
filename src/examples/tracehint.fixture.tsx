import { PCBViewer } from "../PCBViewer"

export const TraceHintExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "source_component",
              source_component_id: "simple_resistor_0",
              name: "R1",
              supplier_part_numbers: {},
              ftype: "simple_resistor",
              resistance: "10k",
              pcbX: -5,
              pcbY: 0,
            },
            {
              type: "schematic_component",
              source_component_id: "simple_resistor_0",
              schematic_component_id: "schematic_component_simple_resistor_0",
              rotation: 0,
              size: {
                width: 1,
                height: 0.3,
              },
              center: {
                x: 0,
                y: 0,
              },
            },
            {
              type: "source_port",
              name: "left",
              source_port_id: "source_port_0",
              source_component_id: "simple_resistor_0",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_0",
              source_port_id: "source_port_0",
              center: {
                x: -0.5,
                y: 0,
              },
              facing_direction: "left",
              schematic_component_id: "schematic_component_simple_resistor_0",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_0",
              source_port_id: "source_port_0",
              pcb_component_id: "pcb_component_simple_resistor_0",
              x: -5.95,
              y: 0,
              layers: ["top"],
            },
            {
              type: "source_port",
              name: "right",
              source_port_id: "source_port_1",
              source_component_id: "simple_resistor_0",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_1",
              source_port_id: "source_port_1",
              center: {
                x: 0.5,
                y: 0,
              },
              facing_direction: "right",
              schematic_component_id: "schematic_component_simple_resistor_0",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_1",
              source_port_id: "source_port_1",
              pcb_component_id: "pcb_component_simple_resistor_0",
              x: -4.05,
              y: 0,
              layers: ["top"],
            },
            {
              type: "schematic_text",
              text: "R1",
              schematic_text_id: "schematic_text_0",
              schematic_component_id: "schematic_component_simple_resistor_0",
              anchor: "left",
              position: {
                x: -0.2,
                y: -0.5,
              },
              rotation: 0,
            },
            {
              type: "schematic_text",
              text: "10k",
              schematic_text_id: "schematic_text_1",
              schematic_component_id: "schematic_component_simple_resistor_0",
              anchor: "left",
              position: {
                x: -0.2,
                y: -0.3,
              },
              rotation: 0,
            },
            {
              type: "pcb_component",
              source_component_id: "simple_resistor_0",
              pcb_component_id: "pcb_component_simple_resistor_0",
              layer: "top",
              center: {
                x: -5,
                y: 0,
              },
              rotation: 0,
              width: 3.1,
              height: 1.2,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              shape: "rect",
              x: -5.95,
              y: 0,
              width: 1.2,
              height: 1.2,
              layer: "top",
              pcb_component_id: "pcb_component_simple_resistor_0",
              port_hints: ["1", "left"],
              pcb_port_id: "pcb_port_0",
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_1",
              shape: "rect",
              x: -4.05,
              y: 0,
              width: 1.2,
              height: 1.2,
              layer: "top",
              pcb_component_id: "pcb_component_simple_resistor_0",
              port_hints: ["2", "right"],
              pcb_port_id: "pcb_port_1",
            },
            {
              type: "source_trace",
              source_trace_id: "source_trace_0",
              connected_source_port_ids: ["source_port_0", "source_port_1"],
              connected_source_net_ids: [],
            },
            {
              type: "schematic_trace",
              source_trace_id: "source_trace_0",
              schematic_trace_id: "schematic_trace_0",
              edges: [
                {
                  from: {
                    x: -0.6000000000000001,
                    y: 0,
                  },
                  to: {
                    x: -0.6000000000000001,
                    y: -0.19999999999999996,
                  },
                },
                {
                  from: {
                    x: -0.6000000000000001,
                    y: -0.19999999999999996,
                  },
                  to: {
                    x: 0.7000000000000002,
                    y: -0.19999999999999996,
                  },
                },
                {
                  from: {
                    x: 0.7000000000000002,
                    y: -0.19999999999999996,
                  },
                  to: {
                    x: 0.7000000000000002,
                    y: 0,
                  },
                },
                {
                  from: {
                    x: -0.5,
                    y: 0,
                    ti: 0,
                  },
                  to: {
                    x: -0.6000000000000001,
                    y: 0,
                  },
                },
                {
                  from: {
                    x: 0.5,
                    y: 0,
                    ti: 1,
                  },
                  to: {
                    x: 0.7000000000000002,
                    y: 0,
                  },
                },
              ],
            },
            {
              type: "pcb_trace",
              pcb_trace_id: "pcb_trace_0",
              source_trace_id: "source_trace_0",
              route_thickness_mode: "interpolated",
              route: [
                {
                  route_type: "wire",
                  layer: "top",
                  width: 0.2,
                  x: -4,
                  y: 0,
                  start_pcb_port_id: "pcb_port_0",
                },
                {
                  route_type: "wire",
                  layer: "top",
                  width: 0.5,
                  x: -5.9,
                  y: 4,
                  start_pcb_port_id: "pcb_port_1",
                },
                {
                  route_type: "wire",
                  layer: "top",
                  width: 0.5,
                  x: -5.9,
                  y: 0,
                  start_pcb_port_id: "pcb_port_1",
                },
              ],
            },
          ] as any
        }
      />
    </div>
  )
}

export default TraceHintExample
