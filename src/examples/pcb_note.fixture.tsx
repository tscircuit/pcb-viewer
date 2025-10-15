import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const PcbNoteExample: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      {/* PcbNoteLine - Simple line */}
      <pcbnoteline x1={-10} y1={10} x2={-5} y2={10} color="#00FF00" />

      {/* PcbNoteRect - Filled rectangle */}
      <pcbnoterect pcbX={10} pcbY={5} width={3} height={2} />

      {/* PcbNotePath - Polyline */}
      <pcbnotepath
        route={[
          { x: -3, y: 10 },
          { x: 0, y: 8 },
          { x: 3, y: 10 },
          { x: 5, y: 7 },
        ]}
      />
      {/* PcbNoteDimension - Dimension */}
      <pcbnotedimension
        from={{ x: -10, y: 1 }}
        to={{ x: -5, y: 0 }}
        text="5mm"
        fontSize={0.5}
        arrowSize={0.5}
      />

      {/* PcbNoteText - Text */}
      <pcbnotetext
        text="Hello"
        fontSize={0.5}
        pcbX={10}
        pcbY={5}
        anchorAlignment="center"
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const pcb_note_line = circuitJson.find((e) => e.type === "pcb_note_line")
  console.log(pcb_note_line)

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default {
  PcbNoteExample,
}
