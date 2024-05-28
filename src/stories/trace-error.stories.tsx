import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const TraceErrorCircuit1: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          resistance="10k"
          x={-2}
          y={0}
          pcbX={-2}
          pcbY={1}
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
        <trace from=".R1 > .right" to=".R2 > .left" />
      </PCBViewer>
    </div>
  )
}

export const TraceErrorCircuit2: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          resistance="10k"
          x={-2}
          y={0}
          pcbX={-2}
          pcbY={1}
          footprint="0402"
        />
        <resistor name="R2" resistance="10k" x={2} y={0} pcb_layer="bottom" />
        <trace from=".R1 > .right" to=".R2 > .left" />
      </PCBViewer>
    </div>
  )
}

export const TraceErrorCircuit3 = () => (
  <div style={{ backgroundColor: "black" }}>
    <PCBViewer>
      <group>
        <component
          name="B1"
          footprint={
            <footprint>
              <platedhole
                x={0}
                y={-4}
                port_hints={[`1`]}
                hole_diameter={0.8}
                outer_diameter={2}
                inner_diameter={1.2}
              />
              <platedhole
                x={0}
                y={4}
                port_hints={[`2`]}
                hole_diameter={0.8}
                outer_diameter={2}
                inner_diameter={1.2}
              />
            </footprint>
          }
        >
          <port x={0} y={-0.7} name="plus" pin_number={1} direction="up" />
          <port x={0} y={0.7} name="minus" pin_number={2} direction="down" />
        </component>
        <resistor
          name="R1"
          x={2}
          y={0}
          pcb_x={8}
          pcb_y={0}
          resistance={"10k"}
          footprint={"0805"}
        />
        <trace to=".B1 > .plus" from=".R1 > .left" />
      </group>
    </PCBViewer>
  </div>
)

const meta: Meta<typeof TraceErrorCircuit1> = {
  title: "TraceError",
  component: TraceErrorCircuit1,
}

export default meta
