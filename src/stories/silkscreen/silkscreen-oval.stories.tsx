import { Meta } from "@storybook/react"
import React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenOval: React.FC = () => {
  return (
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
          type: "pcb_silkscreen_oval",
          layer: "top",
          pcb_component_id: "pcb_generic_component_0",
          pcb_silkscreen_oval_id: "pcb_silkscreen_oval_0",
          radiusX: 0.8,
          radiusY: 1.6,
          center: { x: 0, y: 0 },
        },
      ]}
    />
  )
}

const meta: Meta<typeof SilkscreenOval> = {
  title: "Silkscreen/Oval",
  component: SilkscreenOval,
}
export default meta
