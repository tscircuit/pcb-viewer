import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const BasicRectangleBoard: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board pcbX={0} pcbY={0} width="50mm" height="50mm" />
      </PCBViewer>
    </div>
  )
}

export const TriangleBoard: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board
          pcbX={0}
          pcbY={0}
          width="50mm"
          height="50mm"
          outline={[
            { x: -25, y: 0 },
            { x: 25, y: 0 },
            { x: 0, y: 25 },
          ]}
        />
      </PCBViewer>
    </div>
  )
}

export const OctagonBoard: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board
          pcbX={0}
          pcbY={0}
          width="50mm"
          height="50mm"
          outline={[
            { x: 8.28, y: 20 },
            { x: 20, y: 8.28 },
            { x: 20, y: -8.28 },
            { x: 8.28, y: -20 },
            { x: -8.28, y: -20 },
            { x: -20, y: -8.28 },
            { x: -20, y: 8.28 },
            { x: -8.28, y: 20 },
          ]}
        />
      </PCBViewer>
    </div>
  )
}

export const AtariBoard: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <board
          pcbX={0}
          pcbY={0}
          width="50mm"
          height="50mm"
          outline={[
            { x: -22.5, y: 24.5 },
            { x: 22.5, y: 24.5 },
            { x: 22.5, y: 16.5 },
            { x: 20.5, y: 16.5 },
            { x: 20.5, y: 12.5 },
            { x: 22.5, y: 12.5 },
            { x: 22.5, y: 2.5 },
            { x: 18, y: -1.5 },
            { x: 18, y: -18 },
            { x: -18, y: -18 },
            { x: -18, y: -1.5 },
            { x: -22.5, y: 2.5 },
            { x: -22.5, y: 12.5 },
            { x: -20.5, y: 12.5 },
            { x: -20.5, y: 16.5 },
            { x: -22.5, y: 16.5 },
            { x: -22.5, y: 24.5 },
          ]}
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof BasicRectangleBoard> = {
  title: "Board",
  component: BasicRectangleBoard,
}

export default meta
