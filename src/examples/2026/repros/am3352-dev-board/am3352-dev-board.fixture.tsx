import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./circuit.json"

export default () => (
  <div style={{ background: "black", color: "white", padding: 20 }}>
    <h3>AM3352 Dev Board — Hidden Layer Visibility</h3>
    <p>
      Right-click the board, then choose Visibility → Hidden Layer Visibility.
      Compare Hide and the opacity percentages while switching layers with keys
      1–8.
    </p>
    <PCBViewer circuitJson={circuitJson as any} />
  </div>
)
