import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../../PCBViewer"
import soup from "./nulltracehint-soup.json"

export const NullTraceHint: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} />
    </div>
  )
}

const meta: Meta<typeof NullTraceHint> = {
  title: "Repros",
  component: NullTraceHint,
}

export default meta
