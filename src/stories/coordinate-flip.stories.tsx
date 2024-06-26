import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const CoordinateFlip: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          footprint="0402"
          pcbX="1mm"
          pcbY="1mm"
          resistance="1k"
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof CoordinateFlip> = {
  title: "CoordinateFlip",
  component: CoordinateFlip,
}

export default meta
