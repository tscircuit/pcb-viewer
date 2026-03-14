import { Circuit } from "@tscircuit/core"

const circuit = new Circuit()
circuit.add(
  <board pcbX={0} pcbY={0} width="40mm" height="30mm">
    <chip
      name="U1"
      footprint="pinrow6_rows1_p2.54mm_id1mm_od1.5mm_male"
      pcbX={0}
      pcbY={0}
    />
  </board>,
)
const soup = circuit.getCircuitJson()
console.log(
  JSON.stringify(
    soup.filter(
      (e: any) => e.type === "pcb_smtpad" || e.type === "pcb_plated_hole",
    ),
    null,
    2,
  ),
)
