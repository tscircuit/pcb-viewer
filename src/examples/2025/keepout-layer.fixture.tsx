import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const KeepoutMultiLayerExample = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 6,
      thickness: 1.6,
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_top",
      layer: ["top"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: -9, y: 0 },
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner1",
      layer: ["top"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: -3, y: 0 },
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner2",
      layer: ["top"],
      shape: "circle",
      radius: 1.5,
      center: { x: 3, y: 0 },
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner3",
      layer: ["top"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: 9, y: 0 },
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_bottom",
      layer: ["top"],
      shape: "circle",
      radius: 1.5,
      center: { x: -9, y: -6 },
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_multi",
      layer: ["top"],
      shape: "rect",
      width: 2,
      height: 2,
      center: { x: -3, y: -6 },
    },
  ] as any

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default KeepoutMultiLayerExample
