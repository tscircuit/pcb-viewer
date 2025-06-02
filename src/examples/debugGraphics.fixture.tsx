import React from "react"
import { PCBViewer } from "../PCBViewer"
import { Circuit } from "@tscircuit/core"
import type { GraphicsObject } from "graphics-debug"
import { useEffect, useState } from "react"

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

  const [time, setTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prevTime) => prevTime + 0.05)
    }, 10)
    return () => clearInterval(interval)
  }, [])

  // Calculate positions based on time
  const lineAngle = time
  const circleAngle = -time * 0.7 // Different speed and direction

  const lineEndX = 10 * Math.cos(lineAngle)
  const lineEndY = 10 * Math.sin(lineAngle)

  const circleX = 8 * Math.cos(circleAngle)
  const circleY = 8 * Math.sin(circleAngle)

  const debugGraphics: GraphicsObject = {
    lines: [
      {
        points: [
          { x: 0, y: 0 },
          { x: lineEndX, y: lineEndY },
        ],
        strokeColor: "green",
      },
    ],
    circles: [
      {
        center: { x: circleX, y: circleY },
        radius: 5,
        fill: "red",
      },
    ],
  }

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} debugGraphics={debugGraphics} />
    </div>
  )
}

export default DebugGraphics
