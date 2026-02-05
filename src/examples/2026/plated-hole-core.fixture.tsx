import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"
import { useEffect, useState } from "react"

export const PlatedHoleCore: React.FC = () => {
  const circuit = new Circuit()

  const [circuitJson, setCircuitJson] = useState<any>(null)

  circuit.add(
    <board width="20mm" height="20mm">
      <chip
        name="U1"
        footprint={
          <footprint>
            <platedhole
              shape="circle"
              outerDiameter={2.5}
              holeDiameter={1.5}
              pcbX={-2}
              pcbY={-2}
              portHints={["pin1"]}
            />
            <platedhole
              shape="pill"
              outerHeight={2.5}
              outerWidth={1.5}
              holeHeight={1.5}
              holeWidth={0.5}
              pcbX={2}
              pcbY={-2}
              portHints={["pin2"]}
            />
          </footprint>
        }
        connections={{
          pin1: "net.GND",
          pin2: "net.GND",
        }}
      />
      <chip
        name="U2"
        footprint={
          <footprint>
            <platedhole
              shape="oval"
              outerHeight={2.5}
              outerWidth={1.5}
              holeHeight={1.5}
              holeWidth={0.5}
              pcbX={-2}
              pcbY={2}
              portHints={["pin1"]}
            />
            <platedhole
              shape="circular_hole_with_rect_pad"
              rectPadHeight={2.5}
              rectPadWidth={2.5}
              holeDiameter={1.5}
              pcbX={2}
              pcbY={2}
              portHints={["pin2"]}
            />
          </footprint>
        }
        connections={{
          pin1: "net.GND",
          pin2: "net.GND",
        }}
      />
    </board>,
  )
  // Use useEffect for side effects after render
  useEffect(() => {
    circuit.renderUntilSettled().then(() => {
      setCircuitJson(circuit.getCircuitJson() as any)
    })
  }, [])

  return (
    <div style={{ height: "200vh", padding: "100px 0" }}>
      <div style={{ backgroundColor: "black", margin: "300px 0" }}>
        <PCBViewer circuitJson={circuitJson as any} focusOnHover={true} />
      </div>
    </div>
  )
}

export default PlatedHoleCore
