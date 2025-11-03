import type React from "react"
import { PCBViewer } from "../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const ReproKicadPrefab: React.FC = () => {
  const circuitJson: any[] = [
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      center: {
        x: -2.260000000000005,
        y: -2,
      },
      layer: "top",
      rotation: 0,
      width: 0,
      height: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      center: {
        x: 2.75,
        y: 1.5,
      },
      layer: "bottom",
      rotation: -180,
      width: 0,
      height: 0,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_0",
      pcb_component_id: "pcb_component_0",
      x: -2.7700000000000102,
      y: -2,
      layer: "top",
      shape: "rect",
      width: 0.54,
      height: 0.64,
      port_hints: ["1"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_component_id: "pcb_component_0",
      x: -1.75,
      y: -2,
      layer: "top",
      shape: "rect",
      width: 0.54,
      height: 0.64,
      port_hints: ["2"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_2",
      pcb_component_id: "pcb_component_1",
      x: 3.260000000000005,
      y: 1.5,
      layer: "bottom",
      shape: "rect",
      width: 0.54,
      height: 0.64,
      port_hints: ["1"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_3",
      pcb_component_id: "pcb_component_1",
      x: 2.239999999999995,
      y: 1.5,
      layer: "bottom",
      shape: "rect",
      width: 0.54,
      height: 0.64,
      port_hints: ["2"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_0",
      x: -1.75,
      y: 1.5,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "top"],
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      outline: [
        {
          x: 5.25,
          y: 4.5,
        },
        {
          x: 5.25,
          y: -4.5,
        },
        {
          x: -5.25,
          y: -4.5,
        },
        {
          x: -5.25,
          y: 4.5,
        },
        {
          x: 5.25,
          y: 4.5,
        },
        {
          x: -5.25,
          y: -4.5,
        },
        {
          x: -5.25,
          y: 4.5,
        },
      ],
      width: 10.5,
      height: 9,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
      pcb_component_id: "pcb_component_0",
      font: "tscircuit2024",
      font_size: 1.5,
      text: "R1",
      anchor_position: {
        x: -2.260000000000005,
        y: -0.8299999999999983,
      },
      layer: "top",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_1",
      pcb_component_id: "pcb_component_1",
      font: "tscircuit2024",
      font_size: 1.5,
      text: "R2",
      anchor_position: {
        x: 2.75,
        y: 2.6700000000000017,
      },
      layer: "bottom",
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -2.4136409999999984,
          y: -1.6200000000000045,
        },
        {
          x: -2.106359000000012,
          y: -1.6200000000000045,
        },
      ],
      stroke_width: 0.12,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_1",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -2.4136409999999984,
          y: -2.3799999999999955,
        },
        {
          x: -2.106359000000012,
          y: -2.3799999999999955,
        },
      ],
      stroke_width: 0.12,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_2",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -3.190000000000012,
          y: -1.5300000000000011,
        },
        {
          x: -1.3299999999999983,
          y: -1.5300000000000011,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_3",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -3.190000000000012,
          y: -2.469999999999999,
        },
        {
          x: -3.190000000000012,
          y: -1.5300000000000011,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_4",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -1.3299999999999983,
          y: -1.5300000000000011,
        },
        {
          x: -1.3299999999999983,
          y: -2.469999999999999,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_5",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -1.3299999999999983,
          y: -2.469999999999999,
        },
        {
          x: -3.190000000000012,
          y: -2.469999999999999,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_6",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -2.785000000000011,
          y: -1.730000000000004,
        },
        {
          x: -1.7349999999999994,
          y: -1.730000000000004,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_7",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -2.785000000000011,
          y: -2.269999999999996,
        },
        {
          x: -2.785000000000011,
          y: -1.730000000000004,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_8",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -1.7349999999999994,
          y: -1.730000000000004,
        },
        {
          x: -1.7349999999999994,
          y: -2.269999999999996,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_9",
      pcb_component_id: "pcb_component_0",
      layer: "top",
      route: [
        {
          x: -1.7349999999999994,
          y: -2.269999999999996,
        },
        {
          x: -2.785000000000011,
          y: -2.269999999999996,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_10",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 2.9036409999999933,
          y: 1.8799999999999955,
        },
        {
          x: 2.5963590000000067,
          y: 1.8799999999999955,
        },
      ],
      stroke_width: 0.12,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_11",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 2.9036409999999933,
          y: 1.1200000000000045,
        },
        {
          x: 2.5963590000000067,
          y: 1.1200000000000045,
        },
      ],
      stroke_width: 0.12,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_12",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 1.8199999999999932,
          y: 1.9699999999999989,
        },
        {
          x: 1.8199999999999932,
          y: 1.0300000000000011,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_13",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 1.8199999999999932,
          y: 1.0300000000000011,
        },
        {
          x: 3.680000000000007,
          y: 1.0300000000000011,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_14",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 3.680000000000007,
          y: 1.9699999999999989,
        },
        {
          x: 1.8199999999999932,
          y: 1.9699999999999989,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_15",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 3.680000000000007,
          y: 1.0300000000000011,
        },
        {
          x: 3.680000000000007,
          y: 1.9699999999999989,
        },
      ],
      stroke_width: 0.05,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_16",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 2.2249999999999943,
          y: 1.769999999999996,
        },
        {
          x: 2.2249999999999943,
          y: 1.230000000000004,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_17",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 2.2249999999999943,
          y: 1.230000000000004,
        },
        {
          x: 3.2750000000000057,
          y: 1.230000000000004,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_18",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 3.2750000000000057,
          y: 1.769999999999996,
        },
        {
          x: 2.2249999999999943,
          y: 1.769999999999996,
        },
      ],
      stroke_width: 0.1,
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "pcb_silkscreen_path_19",
      pcb_component_id: "pcb_component_1",
      layer: "bottom",
      route: [
        {
          x: 3.2750000000000057,
          y: 1.230000000000004,
        },
        {
          x: 3.2750000000000057,
          y: 1.769999999999996,
        },
      ],
      stroke_width: 0.1,
    },
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default ReproKicadPrefab
