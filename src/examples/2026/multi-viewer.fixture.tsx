import { PCBViewer } from "../../PCBViewer"
import { Circuit } from "@tscircuit/core"

const circuitA = new Circuit()
circuitA.add(
  <board width="30mm" height="20mm">
    <resistor
      name="R1"
      pcbX="-5mm"
      pcbY="0mm"
      footprint="0805"
      resistance="10k"
    />
    <capacitor
      name="C1"
      pcbX="5mm"
      pcbY="0mm"
      footprint="0805"
      capacitance="1uF"
    />
    <trace from=".R1 .pin2" to=".C1 .pin1" />
  </board>,
)
const jsonA = circuitA.getCircuitJson()

const circuitB = new Circuit()
circuitB.add(
  <board width="30mm" height="20mm">
    <led name="LED1" pcbX="-5mm" pcbY="0mm" footprint="0603" />
    <resistor
      name="R2"
      pcbX="5mm"
      pcbY="0mm"
      footprint="0402"
      resistance="220"
    />
    <trace from=".LED1 .anode" to=".R2 .pin1" />
  </board>,
)
const jsonB = circuitB.getCircuitJson()

export default () => (
  <div
    style={{
      display: "flex",
      gap: 16,
      padding: 16,
      height: "100%",
      backgroundColor: "#111",
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          color: "#aaa",
          fontFamily: "sans-serif",
          fontSize: 13,
          padding: "4px 8px",
        }}
      >
        Viewer A — R1 + C1
      </div>
      <PCBViewer circuitJson={jsonA as any} height={400} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          color: "#aaa",
          fontFamily: "sans-serif",
          fontSize: 13,
          padding: "4px 8px",
        }}
      >
        Viewer B — LED1 + R2
      </div>
      <PCBViewer circuitJson={jsonB as any} height={400} />
    </div>
  </div>
)
