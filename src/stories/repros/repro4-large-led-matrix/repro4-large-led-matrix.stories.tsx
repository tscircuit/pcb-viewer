import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./large-led-matrix.circuit.json"

export const Repro4LargeLedMatrix: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

const meta: Meta<typeof Repro4LargeLedMatrix> = {
  title: "Repros",
  component: Repro4LargeLedMatrix,
}

export default meta
