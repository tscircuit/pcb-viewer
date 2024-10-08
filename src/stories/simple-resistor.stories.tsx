import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SimpleResistorSMD = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board width="10mm" height="10mm">
          <resistor name="R1" footprint="0805" resistance="10k" />
        </board>
      </PCBViewer>
    </div>
  )
}

export const SimpleResistorThruHole = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board width="10mm" height="10mm">
          <resistor name="R1" footprint="axial" resistance="10k" />
        </board>
      </PCBViewer>
    </div>
  )
}

export const SimpleResistorsOffCenter = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board width="10mm" height="10mm">
          <resistor
            name="R1"
            footprint="0805"
            resistance="10k"
            pcbX={5}
            pcbY={5}
          />
        </board>
        {/* <resistor
          name="R2"
          footprint="0805"
          resistance="10k"
          pcbX={20}
          pcbY={20}
        /> */}
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
