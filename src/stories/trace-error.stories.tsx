import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"
import { PcbTraceError } from "circuit-json"

export const TraceErrorCircuit1: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          resistance="10k"
          pcbX={-2}
          pcbY={1}
          footprint="0402"
        />
        <resistor
          name="R2"
          resistance="10k"
          pcbX={2}
          pcbY={0}
          footprint="0402"
          layer="bottom"
        />
        <trace path={[".R1 > .right", ".R2 > .left"]} />
      </PCBViewer>
    </div>
  )
}

export const TraceErrorCircuit2: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          resistance="10k"
          pcbX={-2}
          pcbY={1}
          footprint="0402"
        />
        <resistor name="R2" resistance="10k" layer="bottom" />
        <trace path={[".R1 > .right", ".R2 > .left"]} />
      </PCBViewer>
    </div>
  )
}

export const TraceErrorCircuit3 = () => (
  <div style={{ backgroundColor: "black" }}>
    <PCBViewer>
      <group>
        <component
          name="B1"
          footprint={
            <footprint>
              <platedhole
                pcbX={0}
                pcbY={-4}
                portHints={[`1`]}
                holeDiameter={0.8}
                outerDiameter={2}
                shape="circle"
              />
              <platedhole
                pcbX={0}
                pcbY={4}
                portHints={[`2`]}
                holeDiameter={0.8}
                outerDiameter={2}
                shape="circle"
              />
            </footprint>
          }
        >
          <port pcbX={0} pcbY={-0.7} name="plus" pinNumber={1} direction="up" />
          <port
            pcbX={0}
            pcbY={0.7}
            name="minus"
            pinNumber={2}
            direction="down"
          />
        </component>
        <resistor
          name="R1"
          pcbX={8}
          pcbY={0}
          resistance={"10k"}
          footprint={"0805"}
        />
        <trace to=".B1 > .plus" from=".R1 > .left" />
      </group>
    </PCBViewer>
  </div>
)

// Trace error with custom location, manually create soup for this one
export const TraceErrorCircuit4 = () => (
  <div style={{ backgroundColor: "black" }}>
    <PCBViewer
      soup={[
        {
          type: "source_component",
          source_component_id: "generic_0",
          name: "R1",
          supplier_part_numbers: {},
        },
        {
          type: "schematic_component",
          schematic_component_id: "schematic_generic_component_0",
          source_component_id: "generic_0",
          center: { x: 0, y: 0 },
          rotation: 0,
          size: { width: 0, height: 0 },
        },
        {
          type: "pcb_component",
          source_component_id: "generic_0",
          pcb_component_id: "pcb_generic_component_0",
          layer: "top",
          center: { x: 0, y: 0 },
          rotation: 0,
          width: 0,
          height: 0,
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_component_id: "pcb_generic_component_0",
          pcb_smtpad_id: "pcb_smtpad_0",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_component_id: "pcb_generic_component_0",
          pcb_smtpad_id: "pcb_smtpad_1",
          shape: "rect",
          x: 4,
          y: 4,
          width: 1,
          height: 1,
        },
        {
          type: "pcb_port",
          pcb_port_id: "pcb_port_0",
          source_port_id: "source_port_0",
          x: 0,
          y: 0,
        },
        {
          type: "pcb_port",
          pcb_port_id: "pcb_port_1",
          source_port_id: "source_port_1",
          x: 4,
          y: 4,
        },
        {
          type: "pcb_trace",
          route: [
            { x: 0, y: 0, start_pcb_port_id: "pcb_port_0" },
            { x: 4, y: 4, end_pcb_port_id: "pcb_port_1" },
          ],
        },
        {
          type: "pcb_trace_error",
          message: "Trace error",
          center: { x: 3, y: 1 },
          pcb_port_ids: ["pcb_port_0", "pcb_port_1"],
          error_type: "pcb_trace_error",
          pcb_component_ids: ["pcb_generic_component_0"],
          pcb_trace_error_id: "pcb_error_0", // Changed from pcb_error_id to pcb_trace_error_id
          pcb_trace_id: "pcb_trace_0",
          source_trace_id: "source_trace_0",
        } as PcbTraceError,
      ]}
    />
  </div>
)

const meta: Meta<typeof TraceErrorCircuit1> = {
  title: "TraceError",
  component: TraceErrorCircuit1,
}

export default meta
