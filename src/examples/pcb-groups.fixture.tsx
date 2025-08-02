import { PCBViewer } from "../PCBViewer"

const circuitJson = [
  {
    type: "source_component",
    source_component_id: "source_comp_1",
    name: "R1",
  },
  {
    type: "source_component",
    source_component_id: "source_comp_2",
    name: "R2",
  },
  {
    type: "source_component",
    source_component_id: "source_comp_3",
    name: "U1",
  },
  {
    type: "source_component",
    source_component_id: "source_comp_4",
    name: "U2",
  },
  {
    type: "pcb_component",
    source_component_id: "source_comp_1",
    pcb_component_id: "pcb_comp_1",
    layer: "top",
  },
  {
    type: "pcb_component",
    source_component_id: "source_comp_2",
    pcb_component_id: "pcb_comp_2",
    layer: "top",
  },
  {
    type: "pcb_component",
    source_component_id: "source_comp_3",
    pcb_component_id: "pcb_comp_3",
    layer: "top",
  },
  {
    type: "pcb_component",
    source_component_id: "source_comp_4",
    pcb_component_id: "pcb_comp_4",
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_component_id: "pcb_comp_1",
    port_hints: ["1"],
    shape: "rect",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_component_id: "pcb_comp_2",
    port_hints: ["1"],
    shape: "rect",
    x: 5,
    y: 5,
    width: 1,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_component_id: "pcb_comp_3",
    port_hints: ["1"],
    shape: "rect",
    x: 10,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_component_id: "pcb_comp_4",
    port_hints: ["1"],
    shape: "rect",
    x: 15,
    y: 5,
    width: 1,
    height: 1,
    layer: "top",
  },
  {
    type: "pcb_group",
    pcb_group_id: "group1",
    name: "Group 1",
    pcb_component_ids: ["pcb_comp_1", "pcb_comp_2"],
  },
  {
    type: "pcb_group",
    pcb_group_id: "group2",
    name: "Group 2",
    pcb_component_ids: ["pcb_comp_3", "pcb_comp_4"],
  },
]

export const PcbGroups = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default {
  PcbGroups,
}
