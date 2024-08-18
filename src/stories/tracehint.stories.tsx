import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const TraceHintExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor name="R1" footprint="0805" resistance="10k" />
        <tracehint
          for=".R1 > .right"
          offsets={[
            {
              x: 1,
              y: 1,
              trace_width: 10,
            },
            {
              x: 1,
              y: 3,
              trace_width: 50,
            },
            {
              x: 4,
              y: 6,
              trace_width: 3,
            }
          ]}
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof TraceHintExample> = {
  title: "TraceHint",
  component: TraceHintExample,
}

export default meta
