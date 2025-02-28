import { PCBViewer } from "PCBViewer"
import { Circuit } from "@tscircuit/core"
import type { GraphicsObject } from "graphics-debug"
import type { Meta } from "@storybook/react"

export const DebugGraphics: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
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
    />,
  )

  const soup = circuit.getCircuitJson()

  const debugGraphics: GraphicsObject = {
    lines: [
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        strokeColor: "green",
      },
    ],
    circles: [
      {
        center: { x: 0, y: 0 },
        radius: 5,
        fill: "red",
      },
    ],
  }

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} debugGraphics={debugGraphics} />
    </div>
  )
}

const meta: Meta<typeof DebugGraphics> = {
  title: "Debug Graphics",
  component: DebugGraphics,
}

export default meta
