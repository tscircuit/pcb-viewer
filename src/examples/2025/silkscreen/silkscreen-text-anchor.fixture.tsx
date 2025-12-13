import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../../PCBViewer"

const boardProps = { width: "12mm", height: "12mm", thickness: 1.2 }
const textProps = { pcbX: 0, pcbY: 0, fontSize: 1 }

export const TopLeftBottomRight: React.FC = () => {
  const circuit = new Circuit()
  circuit.add(
    <board {...boardProps}>
      <silkscreentext
        {...textProps}
        text="top_left"
        anchorAlignment="top_left"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="bottom_right"
        anchorAlignment="bottom_right"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="center"
        anchorAlignment="center"
        layer="bottom"
      />
    </board>,
  )
  return <PCBViewer circuitJson={circuit.getCircuitJson() as any} />
}

export const TopRightBottomLeft: React.FC = () => {
  const circuit = new Circuit()
  circuit.add(
    <board {...boardProps}>
      <silkscreentext
        {...textProps}
        text="top_right"
        anchorAlignment="top_right"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="bottom_left"
        anchorAlignment="bottom_left"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="center"
        anchorAlignment="center"
        layer="bottom"
      />
    </board>,
  )
  return <PCBViewer circuitJson={circuit.getCircuitJson() as any} />
}

export const CenterRightCenterLeft: React.FC = () => {
  const circuit = new Circuit()
  circuit.add(
    <board {...boardProps}>
      <silkscreentext
        {...textProps}
        text="center_right"
        anchorAlignment="center_right"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="center_left"
        anchorAlignment="center_left"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="center"
        anchorAlignment="center"
        layer="bottom"
      />
    </board>,
  )
  return <PCBViewer circuitJson={circuit.getCircuitJson() as any} />
}

export const BottomCenterTopCenter: React.FC = () => {
  const circuit = new Circuit()
  circuit.add(
    <board {...boardProps}>
      <silkscreentext
        {...textProps}
        text="bottom_center"
        anchorAlignment="bottom_center"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="top_center"
        anchorAlignment="top_center"
        layer="top"
      />
      <silkscreentext
        {...textProps}
        text="center"
        anchorAlignment="center"
        layer="bottom"
      />
    </board>,
  )
  return <PCBViewer circuitJson={circuit.getCircuitJson() as any} />
}

export default {
  TopLeftBottomRight,
  TopRightBottomLeft,
  CenterRightCenterLeft,
  BottomCenterTopCenter,
}
