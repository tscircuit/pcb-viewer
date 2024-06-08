import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const FabricationNoteText: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <fabricationnotetext
              pcbX={0}
              pcbY={0}
              text="Fabrication Note"
              layer="top"
            />
            {/* <silkscreenline
              pcbX={0}
              pcbY={0}
              x1={0}
              y1={0}
              x2={1}
              y2={1}
              strokeWidth={"0.1mm"}
            /> */}
          </footprint>
        }
      />
    </PCBViewer>
  )
}

const meta: Meta<typeof FabricationNoteText> = {
  title: "FabricationNote",
  component: FabricationNoteText,
}

export default meta
