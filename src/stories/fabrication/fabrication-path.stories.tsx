import type React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../PCBViewer"

export const FabricationPath: React.FC = () => {
  return (
    <PCBViewer>
      <component
        name="R1"
        footprint={
          <footprint>
            <fabricationnotepath
              strokeWidth={0.05}
              route={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
              ]}
            />
          </footprint>
        }
      />
    </PCBViewer>
  )
}

const meta: Meta<typeof FabricationPath> = {
  title: "FabricationNote",
  component: FabricationPath,
}

export default meta
