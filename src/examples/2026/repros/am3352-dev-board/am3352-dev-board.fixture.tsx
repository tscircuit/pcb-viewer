// Snapshot: seveibar/am3352-dev-board-4layer-dogbone v0.1.1, downloaded 2026-09-19.
// Release 1dde7554-9eed-449f-a580-8b886cdedd9e (latest completed build; v0.1.2 was pending).
// https://api.tscircuit.com/package_files/download?package_release_id=1dde7554-9eed-449f-a580-8b886cdedd9e&file_path=dist%2Findex%2Fcircuit.json
import { PCBViewer } from "../../../../PCBViewer"
import { createReturnCurrentSimulationClient } from "../../../../lib/return-current/client"
import circuitJson from "./circuit.json"

declare const __RETURN_CURRENT_API_URL__: string

const client = createReturnCurrentSimulationClient({
  baseUrl:
    typeof __RETURN_CURRENT_API_URL__ === "string"
      ? __RETURN_CURRENT_API_URL__
      : "/api",
})

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
    <p>
      Right-click a trace and choose Simulate → Return Current Simulation. The
      dialog resolves each DDR connection across its routed sections and vias.
      Use the existing inner1 ground pour beneath the signal pads and adjust the
      local-region margin; compare larger margins to check boundary effects. The
      offered JLCPCB 1.2 mm four-layer stackup is an editable assumption, not
      fabrication data for this board.
    </p>
    <PCBViewer
      circuitJson={circuitJson as any}
      returnCurrentSimulationDialog={{ client }}
    />
  </div>
)
