import { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import { jaeShellPad } from "../../../../tests/fixtures/jae-usb-c/shell-pad"

export default function RotatedPolygonPlatedHole() {
  const [rotation, setRotation] = useState(90)
  return (
    <div style={{ width: 700 }}>
      <label>
        JAE DX07S024JJ2 shell pad rotation:{" "}
        <select
          value={rotation}
          onChange={(event) => setRotation(Number(event.target.value))}
        >
          {[0, 30, 90, 180, -90].map((angle) => (
            <option key={angle} value={angle}>
              {angle}°
            </option>
          ))}
        </select>
      </label>
      <PCBViewer
        key={rotation}
        renderer="canvas"
        height={600}
        circuitJson={[
          {
            type: "pcb_board",
            pcb_board_id: "jae_board",
            center: { x: 10, y: 5 },
            width: 6,
            height: 6,
            num_layers: 2,
            material: "fr4",
            thickness: 1.6,
          },
          { ...jaeShellPad, ccw_rotation: rotation },
        ]}
      />
    </div>
  )
}
