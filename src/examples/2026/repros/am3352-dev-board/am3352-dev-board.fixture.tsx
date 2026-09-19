import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./circuit.json"

export default () => (
  <div style={{ background: "black", color: "white", padding: 20 }}>
    <h3>AM3352 Dev Board — DDR Bus X-Ray</h3>
    <p>
      Source:{" "}
      <a href="https://tscircuit.com/seveibar/am3352-dev-board-4layer-dogbone">
        seveibar/am3352-dev-board-4layer-dogbone
      </a>{" "}
      v0.1.1. Click a DDR trace and choose X-Ray DDR_BYTE0 or X-Ray DDR_BYTE1 to
      inspect its bus.
    </p>
    <p>
      Right-click the board, then choose Visibility → Hidden Layer Visibility.
      Compare Hide and the opacity percentages while switching layers with keys
      1–8.
    </p>
    <PCBViewer circuitJson={circuitJson as any} />
  </div>
)
