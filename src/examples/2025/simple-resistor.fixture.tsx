import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const SimpleResistorSMD: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="R1" footprint="0805" resistance="10k" />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export const SimpleResistorThruHole: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <platedhole
        shape="circle"
        pcbX={0}
        pcbY={0}
        holeDiameter="1mm"
        outerDiameter="2mm"
      />
      <platedhole
        shape="circle"
        pcbX={6}
        pcbY={0}
        holeDiameter="1mm"
        outerDiameter="2mm"
      />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export const SimpleResistorsOffCenter: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      <resistor name="R1" footprint="0805" resistance="10k" pcbX={5} pcbY={5} />
      {/* Uncomment this if you want to add the second resistor
      <resistor
        name="R2"
        footprint="0805"
        resistance="10k"
        pcbX={20}
        pcbY={20}
      /> */}
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default {
  SimpleResistorSMD,
  SimpleResistorThruHole,
  SimpleResistorsOffCenter,
}
