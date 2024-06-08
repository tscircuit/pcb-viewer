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
