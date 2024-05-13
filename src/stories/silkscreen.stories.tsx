import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SilkscreenExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor name="R1" footprint="0805" resistance="10k" />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof SilkscreenExample> = {
  title: "Silkscreen",
  component: SilkscreenExample,
}

export default meta
