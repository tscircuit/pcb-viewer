import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenLine: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreenline
              pcbX={0}
              pcbY={0}
              x1={0}
              y1={0}
              x2={1}
              y2={1}
              strokeWidth={"0.1mm"}
            />
          </footprint>
        }
      ></component>
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenLine> = {
  title: "Silkscreen",
  component: SilkscreenLine,
}

export default meta
