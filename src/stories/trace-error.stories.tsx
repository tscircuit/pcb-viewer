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
          pcbX={-2}
          pcbY={1}
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
        <trace path={[".R1 > .right", ".R2 > .left"]} />
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
          pcbX={-2}
          pcbY={1}
          footprint="0402"
        />
        <resistor name="R2" resistance="10k" pcbLayer="bottom" />
        <trace path={[".R1 > .right", ".R2 > .left"]} />
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
                pcbX={0}
                pcbY={-4}
                portHints={[`1`]}
                holeDiameter={0.8}
                outerDiameter={2}
                innerDiameter={1.2}
              />
              <platedhole
                pcbX={0}
                pcbY={4}
                portHints={[`2`]}
                holeDiameter={0.8}
                outerDiameter={2}
                innerDiameter={1.2}
              />
            </footprint>
          }
        >
          <port pcbX={0} pcbY={-0.7} name="plus" pinNumber={1} direction="up" />
          <port pcbX={0} pcbY={0.7} name="minus" pinNumber={2} direction="down" />
        </component>
        <resistor
          name="R1"
          pcbX={8}
          pcbY={0}
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
