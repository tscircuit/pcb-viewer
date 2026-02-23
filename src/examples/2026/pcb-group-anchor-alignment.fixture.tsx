import type React from "react"
import type { AnyCircuitElement, NinePointAnchor } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

const ANCHORS: NinePointAnchor[] = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
]

const GROUP_W = 6
const GROUP_H = 3
const SPACING_X = 12
const SPACING_Y = 10

const buildGroupElements = (
  anchor: NinePointAnchor,
  col: number,
  row: number,
  idx: number,
): AnyCircuitElement[] => {
  const cx = col * SPACING_X
  const cy = row * SPACING_Y
  const gid = `group_${idx}`
  const sgid = `sg_${idx}`
  const cid1 = `comp_${idx}_a`
  const cid2 = `comp_${idx}_b`
  const scid1 = `sc_${idx}_a`
  const scid2 = `sc_${idx}_b`

  return [
    {
      type: "source_component",
      source_component_id: scid1,
      name: `R${idx * 2 + 1}`,
      supplier_part_numbers: {},
    },
    {
      type: "source_component",
      source_component_id: scid2,
      name: `R${idx * 2 + 2}`,
      supplier_part_numbers: {},
    },
    {
      type: "pcb_component",
      pcb_component_id: cid1,
      source_component_id: scid1,
      center: { x: cx - 1.5, y: cy },
      width: 2,
      height: 1,
      layer: "top",
      rotation: 0,
      pcb_group_id: gid,
    },
    {
      type: "pcb_component",
      pcb_component_id: cid2,
      source_component_id: scid2,
      center: { x: cx + 1.5, y: cy },
      width: 2,
      height: 1,
      layer: "top",
      rotation: 0,
      pcb_group_id: gid,
    },
    {
      type: "source_group",
      source_group_id: sgid,
      name: anchor,
    },
    {
      type: "pcb_group",
      pcb_group_id: gid,
      source_group_id: sgid,
      name: anchor,
      center: { x: cx, y: cy },
      width: GROUP_W,
      height: GROUP_H,
      anchor_alignment: anchor,
      pcb_component_ids: [cid1, cid2],
    },
  ] as AnyCircuitElement[]
}

const circuitJson: AnyCircuitElement[] = ANCHORS.flatMap((anchor, idx) => {
  const col = idx % 3
  const row = 1 - Math.floor(idx / 3)
  return buildGroupElements(anchor, col, row, idx)
})

export const PcbGroupAnchorAlignment: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        initialState={{
          is_showing_pcb_groups: true,
          is_showing_group_anchor_offsets: true,
        }}
        circuitJson={[
          {
            "type": "source_project_metadata",
            "source_project_metadata_id": "source_project_metadata_0",
            "software_used_string": "@tscircuit/core@0.0.1048"
          },
          {
            "type": "source_group",
            "source_group_id": "source_group_0",
            "name": "mtkar",
            "was_automatically_named": false,
            "parent_source_group_id": "source_group_1"
          },
          {
            "type": "source_group",
            "source_group_id": "source_group_1",
            "name": "test",
            "is_subcircuit": true,
            "was_automatically_named": false,
            "subcircuit_id": "subcircuit_source_group_1"
          },
          {
            "type": "source_port",
            "source_port_id": "source_port_0",
            "name": "pin1",
            "pin_number": 1,
            "port_hints": [
              "pin1",
              "anode",
              "pos",
              "left",
              "1"
            ],
            "source_component_id": "source_component_0",
            "subcircuit_id": "subcircuit_source_group_1"
          },
          {
            "type": "source_port",
            "source_port_id": "source_port_1",
            "name": "pin2",
            "pin_number": 2,
            "port_hints": [
              "pin2",
              "cathode",
              "neg",
              "right",
              "2"
            ],
            "source_component_id": "source_component_0",
            "subcircuit_id": "subcircuit_source_group_1"
          },
          {
            "type": "source_component",
            "source_component_id": "source_component_0",
            "ftype": "simple_resistor",
            "name": "R1",
            "supplier_part_numbers": {
              "jlcpcb": [
                "C11702",
                "C25543",
                "C2906864"
              ]
            },
            "resistance": 1000,
            "display_resistance": "1kΩ",
            "are_pins_interchangeable": true,
            "source_group_id": "source_group_0"
          },
          {
            "type": "source_board",
            "source_board_id": "source_board_0",
            "source_group_id": "source_group_1",
            "title": "test"
          },
          {
            "type": "source_pin_missing_trace_warning",
            "source_pin_missing_trace_warning_id": "source_pin_missing_trace_warning_0",
            "message": "Port pin1 on R1 is missing a trace",
            "source_component_id": "source_component_0",
            "source_port_id": "source_port_0",
            "subcircuit_id": "subcircuit_source_group_1",
            "warning_type": "source_pin_missing_trace_warning"
          },
          {
            "type": "source_pin_missing_trace_warning",
            "source_pin_missing_trace_warning_id": "source_pin_missing_trace_warning_1",
            "message": "Port pin2 on R1 is missing a trace",
            "source_component_id": "source_component_0",
            "source_port_id": "source_port_1",
            "subcircuit_id": "subcircuit_source_group_1",
            "warning_type": "source_pin_missing_trace_warning"
          },
          {
            "type": "schematic_component",
            "schematic_component_id": "schematic_component_0",
            "center": {
              "x": 0,
              "y": 0
            },
            "size": {
              "width": 1.1,
              "height": 0.388910699999999
            },
            "source_component_id": "source_component_0",
            "is_box_with_pins": true,
            "symbol_name": "boxresistor_right",
            "symbol_display_value": "1kΩ",
            "schematic_group_id": "schematic_group_0"
          },
          {
            "type": "schematic_group",
            "schematic_group_id": "schematic_group_0",
            "subcircuit_id": null,
            "name": "mtkar",
            "center": {
              "x": 0,
              "y": 0
            },
            "width": 0,
            "height": 0,
            "schematic_component_ids": [],
            "source_group_id": "source_group_0"
          },
          {
            "type": "schematic_group",
            "schematic_group_id": "schematic_group_1",
            "is_subcircuit": true,
            "subcircuit_id": "subcircuit_source_group_1",
            "name": "test",
            "center": {
              "x": 0,
              "y": 0
            },
            "width": 0,
            "height": 0,
            "schematic_component_ids": [],
            "source_group_id": "source_group_1"
          },
          {
            "type": "schematic_port",
            "schematic_port_id": "schematic_port_0",
            "schematic_component_id": "schematic_component_0",
            "center": {
              "x": -0.55,
              "y": 0
            },
            "source_port_id": "source_port_0",
            "facing_direction": "left",
            "distance_from_component_edge": 0.4,
            "pin_number": 1,
            "display_pin_label": "anode",
            "is_connected": false
          },
          {
            "type": "schematic_port",
            "schematic_port_id": "schematic_port_1",
            "schematic_component_id": "schematic_component_0",
            "center": {
              "x": 0.55,
              "y": 0
            },
            "source_port_id": "source_port_1",
            "facing_direction": "right",
            "distance_from_component_edge": 0.4,
            "pin_number": 2,
            "display_pin_label": "cathode",
            "is_connected": false
          },
          {
            "type": "pcb_component",
            "pcb_component_id": "pcb_component_0",
            "center": {
              "x": 0,
              "y": 0
            },
            "width": 1.56,
            "height": 0.64,
            "layer": "top",
            "rotation": 0,
            "source_component_id": "source_component_0",
            "subcircuit_id": "subcircuit_source_group_1",
            "do_not_place": false,
            "obstructs_within_bounds": true,
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_group",
            "pcb_group_id": "pcb_group_0",
            "subcircuit_id": "subcircuit_source_group_1",
            "name": "mtkar",
            "anchor_position": {
              "x": 0,
              "y": 0
            },
            "center": {
              "x": 0,
              "y": 0
            },
            "width": 1.56,
            "height": 0.6399999999999997,
            "pcb_component_ids": [],
            "source_group_id": "source_group_0",
            "anchor_alignment": "bottom_left",
            "position_mode": "relative_to_group_anchor",
            "positioned_relative_to_pcb_board_id": "pcb_board_0",
            "display_offset_y": 0
          },
          {
            "type": "pcb_board",
            "pcb_board_id": "pcb_board_0",
            "source_board_id": "source_board_0",
            "center": {
              "x": 5,
              "y": 5
            },
            "thickness": 1.4,
            "num_layers": 2,
            "width": 10,
            "height": 10,
            "material": "fr4"
          },
          {
            "type": "pcb_smtpad",
            "pcb_smtpad_id": "pcb_smtpad_0",
            "pcb_component_id": "pcb_component_0",
            "pcb_port_id": "pcb_port_0",
            "layer": "top",
            "shape": "rect",
            "width": 0.54,
            "height": 0.64,
            "port_hints": [
              "1",
              "left"
            ],
            "is_covered_with_solder_mask": false,
            "x": -0.51,
            "y": 0,
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_solder_paste",
            "pcb_solder_paste_id": "pcb_solder_paste_0",
            "layer": "top",
            "shape": "rect",
            "width": 0.378,
            "height": 0.44799999999999995,
            "x": -0.51,
            "y": 0,
            "pcb_component_id": "pcb_component_0",
            "pcb_smtpad_id": "pcb_smtpad_0",
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_smtpad",
            "pcb_smtpad_id": "pcb_smtpad_1",
            "pcb_component_id": "pcb_component_0",
            "pcb_port_id": "pcb_port_1",
            "layer": "top",
            "shape": "rect",
            "width": 0.54,
            "height": 0.64,
            "port_hints": [
              "2",
              "right"
            ],
            "is_covered_with_solder_mask": false,
            "x": 0.51,
            "y": 0,
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_solder_paste",
            "pcb_solder_paste_id": "pcb_solder_paste_1",
            "layer": "top",
            "shape": "rect",
            "width": 0.378,
            "height": 0.44799999999999995,
            "x": 0.51,
            "y": 0,
            "pcb_component_id": "pcb_component_0",
            "pcb_smtpad_id": "pcb_smtpad_1",
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_silkscreen_path",
            "pcb_silkscreen_path_id": "pcb_silkscreen_path_0",
            "pcb_component_id": "pcb_component_0",
            "layer": "top",
            "route": [
              {
                "x": 0.51,
                "y": 0.72
              },
              {
                "x": -0.98,
                "y": 0.72
              },
              {
                "x": -0.98,
                "y": -0.72
              },
              {
                "x": 0.51,
                "y": -0.72
              }
            ],
            "stroke_width": 0.1,
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_silkscreen_text",
            "pcb_silkscreen_text_id": "pcb_silkscreen_text_0",
            "anchor_alignment": "center",
            "anchor_position": {
              "x": 0,
              "y": 1.22
            },
            "font": "tscircuit2024",
            "font_size": 0.4,
            "layer": "top",
            "text": "R1",
            "ccw_rotation": 0,
            "pcb_component_id": "pcb_component_0",
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0"
          },
          {
            "type": "pcb_port",
            "pcb_port_id": "pcb_port_0",
            "pcb_component_id": "pcb_component_0",
            "layers": [
              "top"
            ],
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0",
            "x": -0.51,
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
            "subcircuit_id": "subcircuit_source_group_1",
            "pcb_group_id": "pcb_group_0",
            "x": 0.51,
            "y": 0,
            "source_port_id": "source_port_1"
          },
          {
            "type": "cad_component",
            "cad_component_id": "cad_component_0",
            "position": {
              "x": 0,
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
          } 
         ] as any}
      />
    </div>
  )
}

export default PcbGroupAnchorAlignment
