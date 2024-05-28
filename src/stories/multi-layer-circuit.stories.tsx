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
          pcbX={-2}
          pcbY={0}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          pcbX={2}
          pcbY={0}
          footprint="0402"
          pcbLayer="bottom"
        />
        <trace
          path={[".R1 > .right", ".R2 > .left"]}
          pcbRouteHints={[{ x: 0, y: 0, via: true }]}
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
