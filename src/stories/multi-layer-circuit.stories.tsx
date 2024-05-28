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
          x={-2}
          y={0}
          pcbX={-2}
          pcbY={0}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          x={2}
          y={0}
          pcbX={2}
          pcbY={0}
          footprint="0402"
          pcb_layer="bottom"
        />
        <trace
          from=".R1 > .right"
          to=".R2 > .left"
          pcb_route_hints={[{ x: 0, y: 0, via: true }]}
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof MultiLayerCircuit> = {
  title: "MultiLayer",
  component: MultiLayerCircuit,
}

export default meta
