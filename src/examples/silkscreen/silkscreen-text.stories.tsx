import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenText: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="bottom_left"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_left"
          fontSize={0.25}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="top_left"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_left"
          fontSize={0.25}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="bottom_right"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_right"
          fontSize={0.25}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="top_right"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_right"
          fontSize={0.25}
          pcbRotation={0}
          layer="top"
        />
        <silkscreentext
          text="center"
          pcbX={0}
          pcbY={1}
          anchorAlignment="center"
          fontSize={0.25}
          pcbRotation={0}
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

export default SilkscreenText
