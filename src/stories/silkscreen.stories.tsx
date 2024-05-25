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
              {/* <silkscreentext
                text="hello world"
                pcbX={0}
                pcbY={0}
                pcbRotation={0}
                layer="top"
              /> */}
              <smtpad
                pcbX={0}
                pcbY={0}
                shape="rect"
                layer="top"
                width={1}
                height={1}
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
