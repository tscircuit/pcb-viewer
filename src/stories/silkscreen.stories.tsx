import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SilkscreenExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        {/* <resistor name="R1" footprint="0805" resistance="10k" /> */}
        <component
          name="R1"
          footprint={
            <footprint>
              <silkscreentext
                text="bottom_left"
                pcbX={0}
                pcbY={0}
                anchorAlignment="bottom_left"
                fontSize={0.25}
                pcbRotation={0}
                layer="top"
              />
              <silkscreentext
                text="top_left"
                pcbX={0}
                pcbY={0}
                anchorAlignment="top_left"
                fontSize={0.25}
                pcbRotation={0}
                layer="top"
              />
              <silkscreentext
                text="bottom_right"
                pcbX={0}
                pcbY={0}
                anchorAlignment="bottom_right"
                fontSize={0.25}
                pcbRotation={0}
                layer="top"
              />
              <silkscreentext
                text="top_right"
                pcbX={0}
                pcbY={0}
                anchorAlignment="top_right"
                fontSize={0.25}
                pcbRotation={0}
                layer="top"
              />
              <silkscreentext
                text="center"
                pcbX={0}
                pcbY={1}
                anchorAlignment="center"
                fontSize={0.25}
                pcbRotation={0}
                layer="bottom"
              />
            </footprint>
          }
        ></component>
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof SilkscreenExample> = {
  title: "Silkscreen",
  component: SilkscreenExample,
}

export default meta
