import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SimpleResistorSMD = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor footprint="0805" resistance="10k" />
      </PCBViewer>
    </div>
  )
}

export const SimpleResistorThruHole = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        {/* <resistor footprint="dip" resistance="10k" /> */}
        {/* TODO use resistor with some kind of through hole footprint name */}
        <component>
          <platedhole x={0} y={0} hole_diameter="1mm" outer_diameter="2mm" />
          <platedhole x={6} y={0} hole_diameter="1mm" outer_diameter="2mm" />
        </component>
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof SimpleResistorSMD> = {
  title: "SimpleResistor",
  component: SimpleResistorSMD,
  tags: [],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof SimpleResistorSMD>
