import type React from "react"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"

const InnerLayerCopperPours: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_inner_pours",
      center: { x: 0, y: 0 },
      width: 108,
      height: 40,
      material: "fr4",
      num_layers: 8,
      thickness: 1.6,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_top",
      layer: "top",
      shape: "rect",
      source_net_id: "net_top",
      center: { x: -42, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner1",
      layer: "inner1",
      shape: "rect",
      source_net_id: "net_inner1",
      center: { x: -30, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner2",
      layer: "inner2",
      shape: "rect",
      source_net_id: "net_inner2",
      center: { x: -18, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner3",
      layer: "inner3",
      shape: "rect",
      source_net_id: "net_inner3",
      center: { x: -6, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner4",
      layer: "inner4",
      shape: "rect",
      source_net_id: "net_inner4",
      center: { x: 6, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner5",
      layer: "inner5",
      shape: "rect",
      source_net_id: "net_inner5",
      center: { x: 18, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner6",
      layer: "inner6",
      shape: "rect",
      source_net_id: "net_inner6",
      center: { x: 30, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_bottom",
      layer: "bottom",
      shape: "rect",
      source_net_id: "net_bottom",
      center: { x: 42, y: 0 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
  ]

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>Inner Layer Copper Pours</h3>
        <p>
          This repro places one rectangular copper pour on each layer of an
          8-layer board.
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Expected layer dropdown: [top, inner1, inner2, inner3, inner4, inner5,
          inner6, bottom]
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Layout: TOP | INNER1 | INNER2 | INNER3 | INNER4 | INNER5 | INNER6 |
          BOTTOM
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default InnerLayerCopperPours
