import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const BoardExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board pcbCenterX={0} pcbCenterY={0} width="50mm" height="50mm" />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof BoardExample> = {
  title: "Board",
  component: BoardExample,
}

export default meta
