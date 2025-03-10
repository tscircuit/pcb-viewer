import type { Meta } from "@storybook/react"
import type React from "react"
import { PCBViewer } from "../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const ModifiedTraceThickness: React.FC = () => {
  const circuitJson = [
    {
      "type": "source_project_metadata",
      "source_project_metadata_id": "source_project_metadata_0",
      "software_used_string": "@tscircuit/core@0.0.348"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_0",
      "name": "pin1",
      "pin_number": 1,
      "port_hints": [
        "anode",
        "pos",
        "left",
        "pin1",
        "1"
      ],
      "source_component_id": "source_component_0",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_1",
      "name": "pin2",
      "pin_number": 2,
      "port_hints": [
        "cathode",
        "neg",
        "right",
        "pin2",
        "2"
      ],
      "source_component_id": "source_component_0",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "source_component",
      "source_component_id": "source_component_0",
      "ftype": "simple_resistor",
      "name": "R1",
      "resistance": 1000,
      "display_resistance": "1kΩ"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_2",
      "name": "pin1",
      "pin_number": 1,
      "port_hints": [
        "anode",
        "pos",
        "left",
        "pin1",
        "1"
      ],
      "source_component_id": "source_component_1",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "source_port",
      "source_port_id": "source_port_3",
      "name": "pin2",
      "pin_number": 2,
      "port_hints": [
        "cathode",
        "neg",
        "right",
        "pin2",
        "2"
      ],
      "source_component_id": "source_component_1",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "source_component",
      "source_component_id": "source_component_1",
      "ftype": "simple_resistor",
      "name": "R2",
      "resistance": 1000,
      "display_resistance": "1kΩ"
    },
    {
      "type": "source_group",
      "source_group_id": "source_group_0",
      "is_subcircuit": true,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "source_trace",
      "source_trace_id": "source_trace_0",
      "connected_source_port_ids": [
        "source_port_0",
        "source_port_2"
      ],
      "connected_source_net_ids": [],
      "subcircuit_id": "subcircuit_source_group_0",
      "display_name": ".R1 > .pin1 to .R2 > .pin1",
      "subcircuit_connectivity_map_key": "unnamedsubcircuit32_connectivity_net0",
    },
    {
      "type": "source_trace",
      "source_trace_id": "source_trace_1",
      "connected_source_port_ids": [
        "source_port_1",
        "source_port_3"
      ],
      "connected_source_net_ids": [],
      "subcircuit_id": "subcircuit_source_group_0",
      "display_name": ".R1 > .pin2 to .R2 > .pin2",
      "subcircuit_connectivity_map_key": "unnamedsubcircuit32_connectivity_net1",
      "min_trace_thickness": 0.3
    },
    {
      "type": "schematic_component",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": 0,
        "y": 0
      },
      "size": {
        "width": 1.0583332999999997,
        "height": 0.388910699999999
      },
      "source_component_id": "source_component_0",
      "symbol_name": "boxresistor_right",
      "symbol_display_value": "1kΩ"
    },
    {
      "type": "schematic_component",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": 0,
        "y": 0
      },
      "size": {
        "width": 1.0583332999999997,
        "height": 0.388910699999999
      },
      "source_component_id": "source_component_1",
      "symbol_name": "boxresistor_right",
      "symbol_display_value": "1kΩ"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_0",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": -0.5337907000000003,
        "y": 0.045805199999999324
      },
      "source_port_id": "source_port_0",
      "facing_direction": "left",
      "distance_from_component_edge": 0.4,
      "pin_number": 1,
      "display_pin_label": "left"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_1",
      "schematic_component_id": "schematic_component_0",
      "center": {
        "x": 0.5337907000000003,
        "y": 0.04525870000000065
      },
      "source_port_id": "source_port_1",
      "facing_direction": "right",
      "distance_from_component_edge": 0.4,
      "pin_number": 2,
      "display_pin_label": "right"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_2",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": -0.5337907000000003,
        "y": 0.045805199999999324
      },
      "source_port_id": "source_port_2",
      "facing_direction": "left",
      "distance_from_component_edge": 0.4,
      "pin_number": 1,
      "display_pin_label": "left"
    },
    {
      "type": "schematic_port",
      "schematic_port_id": "schematic_port_3",
      "schematic_component_id": "schematic_component_1",
      "center": {
        "x": 0.5337907000000003,
        "y": 0.04525870000000065
      },
      "source_port_id": "source_port_3",
      "facing_direction": "right",
      "distance_from_component_edge": 0.4,
      "pin_number": 2,
      "display_pin_label": "right"
    },
    {
      "type": "schematic_trace",
      "schematic_trace_id": "schematic_trace_0",
      "source_trace_id": "source_trace_0",
      "edges": [
        {
          "from": {
            "route_type": "wire",
            "x": -0.5337907000000003,
            "y": 0.045805199999999324,
            "width": 0.1,
            "layer": "top"
          },
          "to": {
            "route_type": "wire",
            "x": -0.5337907000000003,
            "y": 0.045805199999999324,
            "width": 0.1,
            "layer": "top"
          }
        }
      ],
      "junctions": []
    },
    {
      "type": "schematic_trace",
      "schematic_trace_id": "schematic_trace_1",
      "source_trace_id": "source_trace_1",
      "edges": [
        {
          "from": {
            "route_type": "wire",
            "x": 0.5337907000000003,
            "y": 0.04525870000000065,
            "width": 0.1,
            "layer": "top"
          },
          "to": {
            "route_type": "wire",
            "x": 0.5337907000000003,
            "y": 0.04525870000000065,
            "width": 0.1,
            "layer": "top"
          }
        }
      ],
      "junctions": []
    },
    {
      "type": "pcb_component",
      "pcb_component_id": "pcb_component_0",
      "center": {
        "x": -4,
        "y": 0
      },
      "width": 1.5999999999999996,
      "height": 0.6000000000000001,
      "layer": "top",
      "rotation": 0,
      "source_component_id": "source_component_0",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_component",
      "pcb_component_id": "pcb_component_1",
      "center": {
        "x": 4,
        "y": 0
      },
      "width": 1.5999999999999996,
      "height": 0.6000000000000001,
      "layer": "top",
      "rotation": 0,
      "source_component_id": "source_component_1",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_board",
      "pcb_board_id": "pcb_board_0",
      "center": {
        "x": 0,
        "y": 0
      },
      "thickness": 1.4,
      "num_layers": 4,
      "width": 10,
      "height": 10
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_0",
      "pcb_component_id": "pcb_component_0",
      "pcb_port_id": "pcb_port_0",
      "layer": "top",
      "shape": "rect",
      "width": 0.6000000000000001,
      "height": 0.6000000000000001,
      "port_hints": [
        "1",
        "left"
      ],
      "x": -4.5,
      "y": 0,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_solder_paste",
      "pcb_solder_paste_id": "pcb_solder_paste_0",
      "layer": "top",
      "shape": "rect",
      "width": 0.42000000000000004,
      "height": 0.42000000000000004,
      "x": -4.5,
      "y": 0,
      "pcb_component_id": "pcb_component_0",
      "pcb_smtpad_id": "pcb_smtpad_0",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_1",
      "pcb_component_id": "pcb_component_0",
      "pcb_port_id": "pcb_port_1",
      "layer": "top",
      "shape": "rect",
      "width": 0.6000000000000001,
      "height": 0.6000000000000001,
      "port_hints": [
        "2",
        "right"
      ],
      "x": -3.5,
      "y": 0,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_solder_paste",
      "pcb_solder_paste_id": "pcb_solder_paste_1",
      "layer": "top",
      "shape": "rect",
      "width": 0.42000000000000004,
      "height": 0.42000000000000004,
      "x": -3.5,
      "y": 0,
      "pcb_component_id": "pcb_component_0",
      "pcb_smtpad_id": "pcb_smtpad_1",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_silkscreen_path",
      "pcb_silkscreen_path_id": "pcb_silkscreen_path_0",
      "pcb_component_id": "pcb_component_0",
      "layer": "top",
      "route": [
        {
          "x": -3.5,
          "y": 0.7000000000000001
        },
        {
          "x": -5,
          "y": 0.7000000000000001
        },
        {
          "x": -5,
          "y": -0.7000000000000001
        },
        {
          "x": -3.5,
          "y": -0.7000000000000001
        }
      ],
      "stroke_width": 0.1,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_silkscreen_text",
      "pcb_silkscreen_text_id": "pcb_silkscreen_text_0",
      "anchor_alignment": "center",
      "anchor_position": {
        "x": -4,
        "y": 1.2000000000000002
      },
      "font": "tscircuit2024",
      "font_size": 0.4,
      "layer": "top",
      "text": "R1",
      "ccw_rotation": 0,
      "pcb_component_id": "pcb_component_0",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_2",
      "pcb_component_id": "pcb_component_1",
      "pcb_port_id": "pcb_port_2",
      "layer": "top",
      "shape": "rect",
      "width": 0.6000000000000001,
      "height": 0.6000000000000001,
      "port_hints": [
        "1",
        "left"
      ],
      "x": 3.5,
      "y": 0,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_solder_paste",
      "pcb_solder_paste_id": "pcb_solder_paste_2",
      "layer": "top",
      "shape": "rect",
      "width": 0.42000000000000004,
      "height": 0.42000000000000004,
      "x": 3.5,
      "y": 0,
      "pcb_component_id": "pcb_component_1",
      "pcb_smtpad_id": "pcb_smtpad_2",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_smtpad",
      "pcb_smtpad_id": "pcb_smtpad_3",
      "pcb_component_id": "pcb_component_1",
      "pcb_port_id": "pcb_port_3",
      "layer": "top",
      "shape": "rect",
      "width": 0.6000000000000001,
      "height": 0.6000000000000001,
      "port_hints": [
        "2",
        "right"
      ],
      "x": 4.5,
      "y": 0,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_solder_paste",
      "pcb_solder_paste_id": "pcb_solder_paste_3",
      "layer": "top",
      "shape": "rect",
      "width": 0.42000000000000004,
      "height": 0.42000000000000004,
      "x": 4.5,
      "y": 0,
      "pcb_component_id": "pcb_component_1",
      "pcb_smtpad_id": "pcb_smtpad_3",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_silkscreen_path",
      "pcb_silkscreen_path_id": "pcb_silkscreen_path_1",
      "pcb_component_id": "pcb_component_1",
      "layer": "top",
      "route": [
        {
          "x": 4.5,
          "y": 0.7000000000000001
        },
        {
          "x": 3,
          "y": 0.7000000000000001
        },
        {
          "x": 3,
          "y": -0.7000000000000001
        },
        {
          "x": 4.5,
          "y": -0.7000000000000001
        }
      ],
      "stroke_width": 0.1,
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_silkscreen_text",
      "pcb_silkscreen_text_id": "pcb_silkscreen_text_1",
      "anchor_alignment": "center",
      "anchor_position": {
        "x": 4,
        "y": 1.2000000000000002
      },
      "font": "tscircuit2024",
      "font_size": 0.4,
      "layer": "top",
      "text": "R2",
      "ccw_rotation": 0,
      "pcb_component_id": "pcb_component_1",
      "subcircuit_id": "subcircuit_source_group_0"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_0",
      "pcb_component_id": "pcb_component_0",
      "layers": [
        "top"
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "x": -4.5,
      "y": 0,
      "source_port_id": "source_port_0"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_1",
      "pcb_component_id": "pcb_component_0",
      "layers": [
        "top"
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "x": -3.5,
      "y": 0,
      "source_port_id": "source_port_1"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_2",
      "pcb_component_id": "pcb_component_1",
      "layers": [
        "top"
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "x": 3.5,
      "y": 0,
      "source_port_id": "source_port_2"
    },
    {
      "type": "pcb_port",
      "pcb_port_id": "pcb_port_3",
      "pcb_component_id": "pcb_component_1",
      "layers": [
        "top"
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "x": 4.5,
      "y": 0,
      "source_port_id": "source_port_3"
    },
    {
      "type": "cad_component",
      "cad_component_id": "cad_component_0",
      "position": {
        "x": -4,
        "y": 0,
        "z": 0.7
      },
      "rotation": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "pcb_component_id": "pcb_component_0",
      "source_component_id": "source_component_0",
      "footprinter_string": "0402"
    },
    {
      "type": "cad_component",
      "cad_component_id": "cad_component_1",
      "position": {
        "x": 4,
        "y": 0,
        "z": 0.7
      },
      "rotation": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "pcb_component_id": "pcb_component_1",
      "source_component_id": "source_component_1",
      "footprinter_string": "0402"
    },
    {
      "type": "pcb_trace",
      "pcb_trace_id": "source_trace_1_0",
      "connection_name": "source_trace_1",
      "route": [
        {
          "route_type": "wire",
          "x": -3.5,
          "y": 0,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -3.125,
          "y": 0.15625,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -2.5,
          "y": 0.3125,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -2.5,
          "y": 0.3125,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -1.25,
          "y": 1.25,
          "layer": "top"
        },
        {
          "route_type": "via",
          "x": -1.25,
          "y": 1.25,
          "from_layer": "top",
          "to_layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": -1.25,
          "y": 1.25,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 0,
          "y": 1.25,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 0,
          "y": 1.25,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 0.4,
          "y": 0.85,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 0.8,
          "y": 0.85,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.2000000000000002,
          "y": 1.25,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.6,
          "y": 1.65,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.6,
          "y": 2.05,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.6,
          "y": 2.4499999999999997,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.6666666666666665,
          "y": 2.5,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.6666666666666665,
          "y": 2.5,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 2.5500000000000003,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 2.95,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 3.35,
          "layer": "bottom"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 3.75,
          "layer": "bottom"
        },
        {
          "route_type": "via",
          "x": 1.7000000000000002,
          "y": 3.75,
          "from_layer": "bottom",
          "to_layer": "top"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 3.75,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.1,
          "y": 3.75,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.5,
          "y": 3.75,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.5,
          "y": 3.75,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.375,
          "y": 2.5,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.375,
          "y": 2.5,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.6875,
          "y": 1.25,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.6875,
          "y": 1.25,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.53125,
          "y": 0.625,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.53125,
          "y": 0.625,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.53125,
          "y": 0.3125,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 4.5,
          "y": 0,
          "layer": "top"
        }
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "source_trace_id": "source_trace_1"
    },
    {
      "type": "pcb_trace",
      "pcb_trace_id": "source_trace_0_0",
      "connection_name": "source_trace_0",
      "route": [
        {
          "route_type": "wire",
          "x": -4.5,
          "y": 0,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.21875,
          "y": 0.3125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.21875,
          "y": 0.625,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.21875,
          "y": 0.625,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.0625,
          "y": 1.25,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.0625,
          "y": 1.25,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.375,
          "y": 2.5,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -4.375,
          "y": 2.5,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -2.5,
          "y": 3.75,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": -2.5,
          "y": 3.75,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0,
          "y": 3.75,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0,
          "y": 3.75,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.4,
          "y": 3.35,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.4,
          "y": 2.95,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.8,
          "y": 2.5500000000000003,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.8333333333333333,
          "y": 2.5,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.8333333333333333,
          "y": 2.5,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 0.9000000000000002,
          "y": 2.3125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 1.3000000000000003,
          "y": 1.9125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 1.7000000000000002,
          "y": 1.5125000000000002,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.1,
          "y": 1.1125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.1,
          "y": 0.7125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.5,
          "y": 0.3125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 2.5,
          "y": 0.3125,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 3.125,
          "y": 0.15625,
          "width": 0.15,
          "layer": "top"
        },
        {
          "route_type": "wire",
          "x": 3.5,
          "y": 0,
          "width": 0.15,
          "layer": "top"
        }
      ],
      "subcircuit_id": "subcircuit_source_group_0",
      "source_trace_id": "source_trace_0"
    },
    {
      "type": "pcb_via",
      "pcb_via_id": "pcb_via_0",
      "pcb_trace_id": "source_trace_1_0",
      "x": -1.25,
      "y": 1.25,
      "hole_diameter": 0.3,
      "outer_diameter": 0.6,
      "layers": [
        "top",
        "bottom"
      ],
      "from_layer": "top",
      "to_layer": "bottom"
    },
    {
      "type": "pcb_via",
      "pcb_via_id": "pcb_via_1",
      "pcb_trace_id": "source_trace_1_0",
      "x": 1.7000000000000002,
      "y": 3.75,
      "hole_diameter": 0.3,
      "outer_diameter": 0.6,
      "layers": [
        "bottom",
        "top"
      ],
      "from_layer": "bottom",
      "to_layer": "top"
    }
  ]

  return (
    <div>
      <PCBViewer circuitJson={circuitJson as AnyCircuitElement[]} />
    </div>
  )
}

const meta: Meta<typeof ModifiedTraceThickness> = {
  title: "ModifiedTraceThickness",
  component: ModifiedTraceThickness,
}

export default meta
