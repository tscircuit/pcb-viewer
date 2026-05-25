import type React from "react"
import { PcbBoxViewer } from "../../components/PcbBoxViewer"

const sampleCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_0",
    pcb_component_id: "comp_0",
    pcb_port_id: "port_0",
    shape: "rect",
    x: -5,
    y: 2,
    width: 1.8,
    height: 1.2,
    layer: "top",
    port_hints: ["1"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    pcb_component_id: "comp_0",
    pcb_port_id: "port_1",
    shape: "rect",
    x: -5,
    y: -2,
    width: 1.8,
    height: 1.2,
    layer: "top",
    port_hints: ["2"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_0",
    route: [
      { route_type: "wire", x: -5, y: 2, width: 0.25, layer: "top" },
      { route_type: "wire", x: 5, y: 2, width: 0.25, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_1",
    route: [
      { route_type: "wire", x: -5, y: -2, width: 0.25, layer: "top" },
      { route_type: "wire", x: 5, y: -2, width: 0.25, layer: "top" },
    ],
  },
] as any

export const PcbBoxViewerDemo: React.FC = () => (
  <div style={{ padding: 24, backgroundColor: "#111" }}>
    <h2 style={{ color: "#fff", fontFamily: "sans-serif", marginBottom: 16 }}>
      PCB Box Viewer — texture from circuit-json
    </h2>
    <PcbBoxViewer circuitJson={sampleCircuit} width={700} height={450} />
  </div>
)

export default PcbBoxViewerDemo
