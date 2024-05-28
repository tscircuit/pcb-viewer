import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const ViaExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <via
          pcbX="0mm"
          pcbY="0mm"
          holeDiameter="1mm"
          outerDiameter="2mm"
          fromLayer="top"
          toLayer="bottom"
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
