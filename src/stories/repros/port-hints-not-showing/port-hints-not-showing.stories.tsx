import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../../PCBViewer"
import soup from "./soup.json"

export const PortHintsNotShowing: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

const meta: Meta<typeof PortHintsNotShowing> = {
  title: "Repros",
  component: PortHintsNotShowing,
}

export default meta
