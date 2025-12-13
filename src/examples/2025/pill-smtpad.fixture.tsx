import { PCBViewer } from "../../PCBViewer"

// Example showing pill SMT usage
export const PillSmtpadExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_0",
              center: {
                x: 0,
                y: 0,
              },
              thickness: 1.4,
              num_layers: 2,
              width: 16,
              height: 8,
              outline: undefined,
              material: "fr4",
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_0",
              layer: "top",
              shape: "rotated_pill",
              radius: 0.5,
              height: 2,
              width: 1,
              ccw_rotation: 45,
              x: 0,
              y: 0,
              port_hints: ["pin1"],
              subcircuit_id: "subcircuit_source_group_0",
              pcb_group_id: undefined,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_1",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_1",
              layer: "top",
              shape: "pill",
              radius: 1.5,
              height: 4,
              width: 2,
              x: 2,
              y: 0,
              port_hints: ["pin2"],
              subcircuit_id: "subcircuit_source_group_0",
              pcb_group_id: undefined,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_2",
              pcb_component_id: "pcb_component_0",
              pcb_port_id: "pcb_port_2",
              layer: "top",
              shape: "pill",
              radius: 0.5,
              height: 2,
              width: 4,
              x: -3,
              y: 0,
              port_hints: ["pin3"],
              subcircuit_id: "subcircuit_source_group_0",
              pcb_group_id: undefined,
            },
          ] as any
        }
      />
    </div>
  )
}

export default PillSmtpadExample
