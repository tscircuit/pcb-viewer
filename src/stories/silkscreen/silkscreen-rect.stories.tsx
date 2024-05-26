import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenRect: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreenrect
              pcbX={0}
              pcbY={0}
              width={"0.5mm"}
              height={"0.5mm"}
            />
          </footprint>
        }
      ></component>
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenRect> = {
  title: "Silkscreen",
  component: SilkscreenRect,
}

export default meta
