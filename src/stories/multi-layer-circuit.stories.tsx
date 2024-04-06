import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const MultiLayerCircuit: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          resistance="10k"
          x={0}
          y={0}
          pcb_x={-1}
          pcb_y={0}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          x={0}
          y={0}
          pcb_x={1}
          pcb_y={1}
          footprint="0402"
        />
        <trace from=".R1 > .left" to=".R2 > .right" />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof MultiLayerCircuit> = {
  title: "MultiLayer",
  component: MultiLayerCircuit,
}

export default meta
