import type React from "react"
import type { AnyCircuitElement, LayerRef, PcbCopperPour } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

const copperLayers: LayerRef[] = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
  "bottom",
]

const layerLabels: Record<LayerRef, string> = {
  top: "TOP",
  inner1: "INNER1",
  inner2: "INNER2",
  inner3: "INNER3",
  inner4: "INNER4",
  inner5: "INNER5",
  inner6: "INNER6",
  inner7: "INNER7",
  inner8: "INNER8",
  bottom: "BOTTOM",
}

const layerGeometry = copperLayers.flatMap(
  (layer, index): AnyCircuitElement[] => {
    const y = 13.5 - index * 3

    return [
      {
        type: "pcb_copper_text",
        pcb_copper_text_id: `pcb_copper_text_${layer}`,
        pcb_component_id: "pcb_component_layer_labels",
        font: "tscircuit2024",
        font_size: 0.9,
        text: layerLabels[layer],
        layer,
        anchor_position: { x: -36, y },
        anchor_alignment: "center_left",
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pcb_smtpad_${layer}`,
        x: -27,
        y,
        width: 3,
        height: 1.4,
        layer,
        shape: "rect",
      },
      {
        type: "pcb_trace",
        pcb_trace_id: `pcb_trace_${layer}`,
        route: [
          {
            route_type: "wire",
            x: -24,
            y,
            width: 0.45,
            layer,
          },
          {
            route_type: "wire",
            x: 20,
            y,
            width: 0.45,
            layer,
          },
        ],
      },
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: `pcb_copper_pour_${layer}`,
        source_net_id: `source_net_${layer}`,
        layer,
        shape: "rect",
        center: { x: 28, y },
        width: 10,
        height: 1.6,
      } as PcbCopperPour,
    ]
  },
)

export const tenLayerCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_10_layer_fixture",
    center: { x: 0, y: 0 },
    width: 80,
    height: 40,
    material: "fr4",
    num_layers: 10,
    thickness: 1.6,
  },
  ...layerGeometry,
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_through",
    x: -8,
    y: 17,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_blind",
    x: 0,
    y: 17,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["top", "inner4"],
    from_layer: "top",
    to_layer: "inner4",
  },
  {
    type: "pcb_via",
    pcb_via_id: "pcb_via_buried_inner7_inner8",
    x: 8,
    y: 17,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["inner7", "inner8"],
    from_layer: "inner7",
    to_layer: "inner8",
  },
]

export const TenLayerCircuit: React.FC = () => (
  <div style={{ minHeight: "100vh", backgroundColor: "black", padding: 20 }}>
    <div style={{ color: "white", marginBottom: 16 }}>
      <h3>10-Layer PCB Viewer</h3>
      <p>
        Each copper layer has its own label, pad, trace, and pour. Select every
        layer to verify its canvas and z-order.
      </p>
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Hotkeys: 1 = top, 2–9 = inner1–inner8, 0 = bottom.
      </p>
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        The vias above the rows are, from left to right: top-to-bottom,
        top-to-inner4, and the buried inner7-to-inner8 via.
      </p>
    </div>
    <PCBViewer circuitJson={tenLayerCircuitJson} />
  </div>
)

export default TenLayerCircuit
