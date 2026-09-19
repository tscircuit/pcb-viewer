import { PCBViewer } from "../PCBViewer"
import { scene } from "../../tests/x-ray-net/scene"

export default function XRayNetDemo() {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        font: "14px system-ui",
        color: "#ddd",
        background: "#181818",
        padding: 20,
      }}
    >
      <h2>X-Ray Net</h2>
      <p>
        Click a pad or trace and choose X-Ray Net. Choose X-Ray Net on another
        net to add it to the inspection. Press 1, 2, or 4 over the board to
        bring top, inner1, or bottom copper forward. The overlapping traces
        above the pads make the layer order easy to see.
      </p>
      <p>
        Click an inspected net to remove it. Clear all inspected nets by
        double-clicking the board or using right-click → Exit X-Ray Net. The
        right-click menu also lets you change hidden-layer opacity and compare
        Canvas with WebGPU.
      </p>
      <PCBViewer
        circuitJson={scene}
        height={600}
        initialState={{ is_showing_solder_mask: false }}
      />
    </div>
  )
}
