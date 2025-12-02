import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

const boardProps = { width: "18mm", height: "14mm", thickness: 1.2 }
const multilineLabel = "Multi-line\nsilkscreen\ntext"

export const SilkscreenMultilineText: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board {...boardProps}>
      <silkscreentext
        text={multilineLabel}
        pcbX={-4}
        pcbY={3}
        anchorAlignment="top_left"
        fontSize={0.8}
        layer="top"
      />
      <silkscreentext
        text={multilineLabel}
        pcbX={4}
        pcbY={-3}
        anchorAlignment="bottom_right"
        fontSize={0.8}
        layer="top"
      />
      <silkscreentext
        text={"Bottom layer\nmirror\ncheck"}
        pcbX={0}
        pcbY={0}
        anchorAlignment="center"
        fontSize={0.8}
        pcbRotation={-45}
        layer="bottom"
      />
    </board>,
  )

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuit.getCircuitJson() as any} />
    </div>
  )
}

export default SilkscreenMultilineText
