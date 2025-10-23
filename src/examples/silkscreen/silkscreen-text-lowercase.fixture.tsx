import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextLowercase: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="14mm" height="12mm">
      <footprint>
        <silkscreentext
          text="mixedCase"
          pcbX={-4}
          pcbY={3}
          anchorAlignment="center_left"
          fontSize={0.8}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="hello world"
          pcbX={-4}
          pcbY={-0.5}
          anchorAlignment="bottom_left"
          fontSize={0.8}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text={"descenders"}
          pcbX={4}
          pcbY={1}
          anchorAlignment="top_right"
          fontSize={0.8}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="bottom layer"
          pcbX={0}
          pcbY={-2}
          anchorAlignment="top_right"
          fontSize={0.8}
          pcbRotation={0}
          layer="bottom"
        />
      </footprint>
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black", padding: "8px" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default SilkscreenTextLowercase
