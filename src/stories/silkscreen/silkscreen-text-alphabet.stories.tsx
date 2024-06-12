import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"
import { svgAlphabet } from "assets/alphabet"

export const SilkscreenTextAlphabet: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreentext
              text={Object.keys(svgAlphabet).join("")}
              pcbX={0}
              pcbY={0}
              anchorAlignment="bottom_left"
              fontSize={0.25}
              pcbRotation={0}
              layer="top"
            />
          </footprint>
        }
      />
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenTextAlphabet> = {
  title: "Silkscreen",
  component: SilkscreenTextAlphabet,
}

export default meta
