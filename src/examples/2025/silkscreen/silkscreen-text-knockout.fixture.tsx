import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../../PCBViewer"

export const SilkscreenTextKnockout: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="15mm">
      <footprint>
        {/* Regular silkscreen text for comparison */}
        <silkscreentext
          text="REGULAR"
          pcbX={-5}
          pcbY={3}
          anchorAlignment="center"
          fontSize={0.8}
          layer="top"
        />
        
        {/* Knockout silkscreen text with default padding */}
        <silkscreentext
          text="KNOCKOUT"
          pcbX={-5}
          pcbY={0}
          anchorAlignment="center"
          fontSize={0.8}
          layer="top"
          isKnockout={true}
        />
        
        {/* Knockout text with custom padding */}
        <silkscreentext
          text="PADDED"
          pcbX={-5}
          pcbY={-3}
          anchorAlignment="center"
          fontSize={0.8}
          layer="top"
          isKnockout={true}
          knockoutPadding="0.5mm"
        />
        
        {/* Knockout text on bottom layer */}
        <silkscreentext
          text="BOTTOM"
          pcbX={5}
          pcbY={0}
          anchorAlignment="center"
          fontSize={0.8}
          layer="bottom"
          isKnockout={true}
        />
        
        {/* Rotated knockout text */}
        <silkscreentext
          text="ROTATED"
          pcbX={5}
          pcbY={3}
          anchorAlignment="center"
          fontSize={0.8}
          layer="top"
          isKnockout={true}
          pcbRotation={45}
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

export default SilkscreenTextKnockout
