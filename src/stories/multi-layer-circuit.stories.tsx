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
          pcb_x={-2}
          pcb_y={0}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          x={2}
          y={0}
          pcb_x={2}
          pcb_y={0}
          footprint="0402"
          pcb_layer="bottom"
        />
        <via
          name={"V1"}
          x={"0mm"}
          y={"0mm"}
          pcb_x={"0mm"}
          pcb_y={"0mm"}
          hole_diameter="0.2mm"
          outer_diameter="0.6mm"
          from_layer="top"
          to_layer="bottom"
        />
        <trace from=".R1 > .right" to=".V1 > port.top" />
        <trace from=".R2 > .left" to=".V1 > port.bottom" />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof MultiLayerCircuit> = {
  title: "MultiLayer",
  component: MultiLayerCircuit,
}

export default meta
