import { PCBViewer } from "../../PCBViewer"

// Example showing polygon SMT pad usage
export const PolygonSmtpadExample = () => {
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
              shape: "polygon",
              points: [
                { x: 2.2, y: 2 },
                { x: 6, y: 2 },
                { x: 6, y: -2 },
                { x: 2.2, y: -2 },
                { x: 4, y: 0 },
              ],
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
              shape: "polygon",
              points: [
                { x: -4.5, y: 2 },
                { x: -2.2, y: 2 },
                { x: -0.4, y: 0 },
                { x: -2.2, y: -2 },
                { x: -4.5, y: -2 },
              ],
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
              shape: "polygon",
              points: [
                { x: -1.8, y: 2 },
                { x: 1.8, y: 2 },
                { x: 3.6, y: 0 },
                { x: 1.8, y: -2 },
                { x: -1.8, y: -2 },
                { x: 0, y: 0 },
              ],
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

export default PolygonSmtpadExample
