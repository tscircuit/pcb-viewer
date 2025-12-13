import React from "react"
import { PCBViewer } from "../../PCBViewer"
import { Circuit } from "@tscircuit/core"
import { MacroKeypad } from "../../assets/story-components/MacroKeypad"

export const KeyboardExample: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(<MacroKeypad />)

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default KeyboardExample
