import { useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer, usePcbViewerController } from "../../index"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    num_layers: 2,
    thickness: 1.6,
  },
  ...["top", "bottom"].flatMap((layer, i) => [
    {
      type: "source_component",
      source_component_id: `source_${i}`,
      name: `U${i + 1}`,
      ftype: "simple_chip",
    },
    {
      type: "pcb_component",
      pcb_component_id: `component_${i}`,
      source_component_id: `source_${i}`,
      center: { x: i ? 8 : -8, y: 5 },
      width: 4,
      height: 3,
      rotation: 0,
      layer,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad_${i}`,
      pcb_component_id: `component_${i}`,
      x: i ? 8 : -8,
      y: 5,
      width: 1,
      height: 1,
      shape: "rect",
      layer,
    },
  ]),
] as AnyCircuitElement[]

export default function PcbViewerControllerDemo() {
  const [mounted, setMounted] = useState(true)
  const { controller, focusPcbComponent } = usePcbViewerController()
  return (
    <div
      style={{ background: "#111", color: "#eee", fontFamily: "sans-serif" }}
    >
      <div style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>PCB viewer controller</h3>
        <p>
          Focus U1 on the top layer or U2 on the bottom layer. The viewer
          centers the component, selects its layer, and outlines it in blue. Pan
          away and click the same button again to refocus.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => focusPcbComponent("component_0")}>
            Focus U1 (top)
          </button>
          <button onClick={() => focusPcbComponent("component_1")}>
            Focus U2 (bottom)
          </button>
          <button onClick={() => setMounted(!mounted)}>
            {mounted ? "Unmount viewer" : "Mount viewer"}
          </button>
        </div>
        <p>
          To test queued requests: unmount the viewer, click a focus button,
          then mount the viewer again.
        </p>
        <p role="status">
          {controller.focusRequest
            ? "Focus request pending — mount the viewer to apply it."
            : "No pending focus request."}
        </p>
      </div>
      {mounted && (
        <PCBViewer
          circuitJson={circuitJson}
          renderer="canvas"
          height={500}
          controller={controller}
        />
      )}
    </div>
  )
}
