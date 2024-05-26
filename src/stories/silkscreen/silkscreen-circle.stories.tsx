import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenCircle: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreencircle pcbX={0} pcbY={0} radius={0.5} />
          </footprint>
        }
      ></component>
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenCircle> = {
  title: "Silkscreen",
  component: SilkscreenCircle,
}

export default meta
