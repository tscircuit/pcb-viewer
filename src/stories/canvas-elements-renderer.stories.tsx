import type { Meta, StoryObj } from "@storybook/react"
import { CanvasElementsRenderer } from "../components/CanvasElementsRenderer"
import { useState } from "react"
import { useMeasure } from "react-use"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { compose, scale, translate } from "transformation-matrix"

const defaultTransform = compose(translate(400, 300), scale(40, 40))

const exampleSoup = [
  {
    type: "source_component",
    source_component_id: "simple_resistor_0",
    name: "R1",
    ftype: "simple_resistor",
    resistance: "10 ohm",
    source: {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      ftype: "simple_resistor",
      resistance: "10 ohm",
    },
  },
  {
    type: "source_port",
    name: "left",
    source_port_id: "source_port_0",
    source_component_id: "simple_resistor_0",
    source: {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      ftype: "simple_resistor",
      resistance: "10 ohm",
    },
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    x: -0.9,
    y: 0,
    source: {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  },
  {
    type: "source_port",
    name: "right",
    source_port_id: "source_port_1",
    source_component_id: "simple_resistor_0",
    source: {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      ftype: "simple_resistor",
      resistance: "10 ohm",
    },
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: 0.9,
    y: 0,
    source: {
      type: "source_port",
      name: "right",
      source_port_id: "source_port_1",
      source_component_id: "simple_resistor_0",
    },
  },
  {
    type: "pcb_component",
    source_component_id: "simple_resistor_0",
    pcb_component_id: "pcb_component_simple_resistor_0",
    source: {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      ftype: "simple_resistor",
      resistance: "10 ohm",
    },
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: -0.9,
    y: 0,
    width: 0.8,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["left", "1"],
    pcb_port_id: "pcb_port_0",
    source: null,
  },
  {
    type: "pcb_smtpad",
    shape: "rect",
    x: 0.9,
    y: 0,
    width: 0.8,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["right", "2"],
    pcb_port_id: "pcb_port_1",
    source: null,
  },
]

const CanvasElementsTest = () => {
  const [ref, refDimensions] = useMeasure()
  const [transform, setTransform] = useState(defaultTransform)
  const { ref: transformRef } = useMouseMatrixTransform({
    transform,
    onSetTransform: setTransform,
  })
  return (
    <div ref={transformRef as any}>
      <div ref={ref as any}>
        <CanvasElementsRenderer
          key={refDimensions.width}
          elements={exampleSoup as any}
          transform={transform}
          height={600}
          width={refDimensions.width}
          grid={{
            spacing: 1,
            view_window: {
              left: 0,
              right: refDimensions.width || 500,
              top: 600,
              bottom: 0,
            },
          }}
        />
      </div>
    </div>
  )
}

const meta: Meta<typeof CanvasElementsTest> = {
  title: "CanvasElementsTest",
  component: CanvasElementsTest,
  tags: [],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof CanvasElementsTest>

export const Primary: Story = {
  args: {},
}
