import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const KeepoutRectExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "source_port",
              source_port_id: "source_port_0",
              name: "pin1",
              pin_number: 1,
              port_hints: ["-", "left", "pin1", "1"],
              source_component_id: "source_component_0",
            },
            {
              type: "source_port",
              source_port_id: "source_port_1",
              name: "pin2",
              pin_number: 2,
              port_hints: ["+", "right", "pin2", "2"],
              source_component_id: "source_component_0",
            },
            {
              type: "source_component",
              source_component_id: "source_component_0",
              ftype: "simple_resistor",
              name: "R1",
              resistance: 100000,
            },
            {
              type: "source_port",
              source_port_id: "source_port_2",
              name: "pin1",
              pin_number: 1,
              port_hints: ["anode", "pos", "pin1", "1"],
              source_component_id: "source_component_1",
            },
            {
              type: "source_port",
              source_port_id: "source_port_3",
              name: "pin2",
              pin_number: 2,
              port_hints: ["cathode", "neg", "pin2", "2"],
              source_component_id: "source_component_1",
            },
            {
              type: "source_component",
              source_component_id: "source_component_1",
              ftype: "simple_diode",
              name: "LED1",
            },
            {
              type: "source_trace",
              source_trace_id: "source_trace_0",
              connected_source_port_ids: ["source_port_0", "source_port_2"],
              connected_source_net_ids: [],
            },
            {
              type: "schematic_component",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -2,
                y: 0,
              },
              rotation: 0,
              size: {
                width: 1,
                height: 0.55,
              },
              source_component_id: "source_component_0",
              symbol_name: "boxresistor_horz",
            },
            {
              type: "schematic_component",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 2,
                y: 0,
              },
              rotation: 0,
              size: {
                width: 1.0521572000000003,
                height: 0.4594567000000005,
              },
              source_component_id: "source_component_1",
              symbol_name: "led_horz",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_0",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -2.5,
                y: 0,
              },
              source_port_id: "source_port_0",
              facing_direction: "left",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_1",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -1.5,
                y: 0,
              },
              source_port_id: "source_port_1",
              facing_direction: "right",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_2",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 1.4633128999999994,
                y: -0.0018268500000008514,
              },
              source_port_id: "source_port_2",
              facing_direction: "left",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_3",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 2.5357314999999994,
                y: -0.0013733499999983023,
              },
              source_port_id: "source_port_3",
              facing_direction: "right",
            },
            {
              type: "schematic_trace",
              schematic_trace_id: "schematic_trace_0",
              source_trace_id: "source_trace_0",
              edges: [
                {
                  from: {
                    x: -2.6501,
                    y: 0,
                  },
                  to: {
                    x: -2.65,
                    y: 0,
                  },
                },
                {
                  from: {
                    x: -2.65,
                    y: 0,
                  },
                  to: {
                    x: -2.65,
                    y: 0.42500000000000004,
                  },
                },
                {
                  from: {
                    x: -2.65,
                    y: 0.42500000000000004,
                  },
                  to: {
                    x: 1.3132128999999995,
                    y: 0.42500000000000004,
                  },
                },
                {
                  from: {
                    x: 1.3132128999999995,
                    y: 0.42500000000000004,
                  },
                  to: {
                    x: 1.3132128999999995,
                    y: -0.0018268500000008236,
                  },
                },
              ],
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_component_0",
              center: {
                x: -2,
                y: 0,
              },
              width: 0,
              height: 0,
              layer: "top",
              rotation: 0,
              source_component_id: "source_component_0",
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_component_1",
              center: {
                x: 2,
                y: 0,
              },
              width: 0,
              height: 0,
              layer: "top",
              rotation: 0,
              source_component_id: "source_component_1",
            },
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_0",
              center: {
                x: 0,
                y: 0,
              },
              width: 10,
              height: 10,
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_0",
              pcb_component_id: "pcb_component_0",
              layers: ["top"],
              x: -2.5,
              y: 0,
              source_port_id: "source_port_0",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_1",
              pcb_component_id: "pcb_component_0",
              layers: ["top"],
              x: -1.5,
              y: 0,
              source_port_id: "source_port_1",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_2",
              pcb_component_id: "pcb_component_1",
              layers: ["top"],
              x: 1.5,
              y: 0,
              source_port_id: "source_port_2",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_3",
              pcb_component_id: "pcb_component_1",
              layers: ["top"],
              x: 2.5,
              y: 0,
              source_port_id: "source_port_3",
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_0",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["1", "left"],
              x: -2.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_1",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_1",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["2", "right"],
              x: -1.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_2",
              pcb_component_id: "pcb_component_1",
              pcb_port_id: "pcb_port_2",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["1", "left"],
              x: 1.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_3",
              pcb_component_id: "pcb_component_1",
              pcb_port_id: "pcb_port_3",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["2", "right"],
              x: 2.5,
              y: 0,
            },
            {
              type: "pcb_keepout",
              pcb_keepout_id: "pcb_keepout_0",
              layer: ["top"],
              shape: "rect",
              width: 1,
              height: 1,
              center: {
                x: 0,
                y: 0,
              },
            },
            {
              type: "pcb_trace",
              pcb_trace_id: "pcb_trace_for_source_trace_0",
              route: [
                {
                  route_type: "wire",
                  x: -2.5,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.9500000000000002,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.9500000000000002,
                  y: 0.45000000000000007,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -0.6499999999999999,
                  y: 0.45000000000000007,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -0.6499999999999999,
                  y: 0.65,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: 1.5,
                  y: 0.65,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: 1.5,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
              ],
            },
          ] as any
        }
      />
    </div>
  )
}

export const KeepoutCircleExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "source_port",
              source_port_id: "source_port_0",
              name: "pin1",
              pin_number: 1,
              port_hints: ["-", "left", "pin1", "1"],
              source_component_id: "source_component_0",
            },
            {
              type: "source_port",
              source_port_id: "source_port_1",
              name: "pin2",
              pin_number: 2,
              port_hints: ["+", "right", "pin2", "2"],
              source_component_id: "source_component_0",
            },
            {
              type: "source_component",
              source_component_id: "source_component_0",
              ftype: "simple_resistor",
              name: "R1",
              resistance: 100000,
            },
            {
              type: "source_port",
              source_port_id: "source_port_2",
              name: "pin1",
              pin_number: 1,
              port_hints: ["anode", "pos", "pin1", "1"],
              source_component_id: "source_component_1",
            },
            {
              type: "source_port",
              source_port_id: "source_port_3",
              name: "pin2",
              pin_number: 2,
              port_hints: ["cathode", "neg", "pin2", "2"],
              source_component_id: "source_component_1",
            },
            {
              type: "source_component",
              source_component_id: "source_component_1",
              ftype: "simple_diode",
              name: "LED1",
            },
            {
              type: "source_trace",
              source_trace_id: "source_trace_0",
              connected_source_port_ids: ["source_port_0", "source_port_2"],
              connected_source_net_ids: [],
            },
            {
              type: "schematic_component",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -2,
                y: 0,
              },
              rotation: 0,
              size: {
                width: 1,
                height: 0.55,
              },
              source_component_id: "source_component_0",
              symbol_name: "boxresistor_horz",
            },
            {
              type: "schematic_component",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 2,
                y: 0,
              },
              rotation: 0,
              size: {
                width: 1.0521572000000003,
                height: 0.4594567000000005,
              },
              source_component_id: "source_component_1",
              symbol_name: "led_horz",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_0",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -2.5,
                y: 0,
              },
              source_port_id: "source_port_0",
              facing_direction: "left",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_1",
              schematic_component_id: "schematic_component_0",
              center: {
                x: -1.5,
                y: 0,
              },
              source_port_id: "source_port_1",
              facing_direction: "right",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_2",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 1.4633128999999994,
                y: -0.0018268500000008514,
              },
              source_port_id: "source_port_2",
              facing_direction: "left",
            },
            {
              type: "schematic_port",
              schematic_port_id: "schematic_port_3",
              schematic_component_id: "schematic_component_1",
              center: {
                x: 2.5357314999999994,
                y: -0.0013733499999983023,
              },
              source_port_id: "source_port_3",
              facing_direction: "right",
            },
            {
              type: "schematic_trace",
              schematic_trace_id: "schematic_trace_0",
              source_trace_id: "source_trace_0",
              edges: [
                {
                  from: {
                    x: -2.6501,
                    y: 0,
                  },
                  to: {
                    x: -2.65,
                    y: 0,
                  },
                },
                {
                  from: {
                    x: -2.65,
                    y: 0,
                  },
                  to: {
                    x: -2.65,
                    y: 0.42500000000000004,
                  },
                },
                {
                  from: {
                    x: -2.65,
                    y: 0.42500000000000004,
                  },
                  to: {
                    x: 1.3132128999999995,
                    y: 0.42500000000000004,
                  },
                },
                {
                  from: {
                    x: 1.3132128999999995,
                    y: 0.42500000000000004,
                  },
                  to: {
                    x: 1.3132128999999995,
                    y: -0.0018268500000008236,
                  },
                },
              ],
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_component_0",
              center: {
                x: -2,
                y: 0,
              },
              width: 0,
              height: 0,
              layer: "top",
              rotation: 0,
              source_component_id: "source_component_0",
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_component_1",
              center: {
                x: 2,
                y: 0,
              },
              width: 0,
              height: 0,
              layer: "top",
              rotation: 0,
              source_component_id: "source_component_1",
            },
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_0",
              center: {
                x: 0,
                y: 0,
              },
              width: 10,
              height: 10,
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_0",
              pcb_component_id: "pcb_component_0",
              layers: ["top"],
              x: -2.5,
              y: 0,
              source_port_id: "source_port_0",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_1",
              pcb_component_id: "pcb_component_0",
              layers: ["top"],
              x: -1.5,
              y: 0,
              source_port_id: "source_port_1",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_2",
              pcb_component_id: "pcb_component_1",
              layers: ["top"],
              x: 1.5,
              y: 0,
              source_port_id: "source_port_2",
            },
            {
              type: "pcb_port",
              pcb_port_id: "pcb_port_3",
              pcb_component_id: "pcb_component_1",
              layers: ["top"],
              x: 2.5,
              y: 0,
              source_port_id: "source_port_3",
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_0",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["1", "left"],
              x: -2.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_1",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_1",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["2", "right"],
              x: -1.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_2",
              pcb_component_id: "pcb_component_1",
              pcb_port_id: "pcb_port_2",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["1", "left"],
              x: 1.5,
              y: 0,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_3",
              pcb_component_id: "pcb_component_1",
              pcb_port_id: "pcb_port_3",
              layer: "top",
              shape: "rect",
              width: 0.6000000000000001,
              height: 0.6000000000000001,
              port_hints: ["2", "right"],
              x: 2.5,
              y: 0,
            },
            {
              type: "pcb_keepout",
              pcb_keepout_id: "pcb_keepout_0",
              layer: ["top"],
              shape: "circle",
              radius: 1,
              center: {
                x: 0,
                y: 0,
              },
            },
            {
              type: "pcb_trace",
              pcb_trace_id: "pcb_trace_for_source_trace_0",
              route: [
                {
                  route_type: "wire",
                  x: -2.5,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.9500000000000002,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.9500000000000002,
                  y: 0.45000000000000007,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.15,
                  y: 0.45000000000000007,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: -1.15,
                  y: 1.15,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: 1.5,
                  y: 1.15,
                  width: 0.1,
                  layer: "top",
                },
                {
                  route_type: "wire",
                  x: 1.5,
                  y: 0,
                  width: 0.1,
                  layer: "top",
                },
              ],
            },
          ] as any
        }
      />
    </div>
  )
}

export default {
  KeepoutRectExample,
  KeepoutCircleExample,
}
