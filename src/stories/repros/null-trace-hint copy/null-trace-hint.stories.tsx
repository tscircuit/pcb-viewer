import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../../PCBViewer"
import soup from "./nulltracehint-soup.json"

export const Macrokeypad: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

const meta: Meta<typeof Macrokeypad> = {
  title: "Repros",
  component: Macrokeypad,
}

export default meta
