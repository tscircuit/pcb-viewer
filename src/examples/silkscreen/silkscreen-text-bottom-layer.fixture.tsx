import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextBottomLayer: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <footprint>
        <silkscreentext
          text="center"
          pcbX={0}
          pcbY={0}
          anchorAlignment="center"
          fontSize={1}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="center"
          pcbX={0}
          pcbY={0}
          anchorAlignment="center"
          fontSize={1}
          pcbRotation={0}
          layer="bottom"
        />
        <silkscreentext
          text="rotated"
          pcbX={2}
          pcbY={0}
          anchorAlignment="center"
          fontSize={1}
          pcbRotation={90}
          layer="top"
        />
        <silkscreentext
          text="rotated"
          pcbX={2}
          pcbY={0}
          anchorAlignment="center"
          fontSize={1}
          pcbRotation={90}
          layer="bottom"
        />
      </footprint>
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default SilkscreenTextBottomLayer
