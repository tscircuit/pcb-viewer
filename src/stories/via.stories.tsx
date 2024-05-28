import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const ViaExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <via
          x={0}
          y={0}
          pcbX="0mm"
          pcbY="0mm"
          hole_diameter="1mm"
          outer_diameter="2mm"
          from_layer="top"
          to_layer="bottom"
          name="V1"
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof ViaExample> = {
  title: "Via",
  component: ViaExample,
}

export default meta
