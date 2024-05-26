import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenPath: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreenpath
              pcbX={0}
              pcbY={0}
              route={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
              ]}
            />
          </footprint>
        }
      ></component>
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenPath> = {
  title: "Silkscreen",
  component: SilkscreenPath,
}

export default meta
