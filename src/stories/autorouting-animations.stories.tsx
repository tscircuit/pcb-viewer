import { PCBViewer } from "PCBViewer"
import { Circuit } from "@tscircuit/core"
import type { GraphicsObject } from "graphics-debug"
import type { Meta } from "@storybook/react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"

export const AutoroutingAnimations: React.FC = () => {
  const [circuitJson, setCircuitJson] = useState(0)
  const [debugGraphics, setDebugGraphics] = useState<GraphicsObject | null>(
    null,
  )
  const lastEventTimeRef = useRef(Date.now())

  const circuit = useMemo(() => {
    const circuit = new Circuit()

    circuit.add(
      <board
        width="10mm"
        height="100mm"
        autorouter={{
          local: true,
          groupMode: "subcircuit",
        }}
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <Fragment key={`fragment-${i}`}>
            <capacitor
              capacitance="1000pF"
              footprint="0402"
              name={`C${i}`}
              schX={-3}
              pcbX={-3}
              pcbY={(i / 30 - 0.5) * 60}
            />
            <resistor
              resistance="1k"
              footprint="0402"
              name={`R${i}`}
              schX={3}
              pcbX={3}
              pcbY={(i / 30 - 0.5) * 60}
            />
            <trace from={`.R${i} > .pin1`} to={`.C${i} > .pin1`} />
          </Fragment>
        ))}
      </board>,
    )

    circuit.on("autorouting:progress", (event) => {
      if (Date.now() > lastEventTimeRef.current + 100) {
        lastEventTimeRef.current = Date.now()
        setDebugGraphics(event.debugGraphics)
      }
    })

    setCircuitJson(circuit.getCircuitJson() as any)

    return circuit
  }, [])

  // Use useEffect for side effects after render
  useEffect(() => {
    circuit.renderUntilSettled().then(() => {
      setCircuitJson(circuit.getCircuitJson() as any)
    })
  }, [circuit])

  return (
    <PCBViewer circuitJson={circuitJson as any} debugGraphics={debugGraphics} />
  )
}

const meta: Meta<typeof AutoroutingAnimations> = {
  title: "Autorouting Animations",
  component: AutoroutingAnimations,
}

export default meta
