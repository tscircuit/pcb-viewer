import { Circuit } from "@tscircuit/core"
import { Fragment } from "react"

export function getTuningBumpCircuit() {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  const bump = [
    { x: 2, y: 0 },
    { x: 4.2, y: 2.2 },
    { x: 5, y: 2.2 },
    { x: 7.2, y: 0 },
  ]
  circuit.add(
    <board width={28} height={9} routeRemaining={false}>
      {(["P", "N"] as const).map((name) => (
        <Fragment key={name}>
          {(["SRC", "LOAD"] as const).map((end) => (
            <testpoint
              key={end}
              name={`${name}_${end}`}
              footprintVariant="pad"
              padDiameter={0.65}
              doNotPlace
              pcbX={end === "SRC" ? -12 : 12}
              pcbY={name === "P" ? 0.6 : -0.6}
            />
          ))}
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness={0.24}
            pcbPath={name === "P" ? bump : []}
          />
        </Fragment>
      ))}
      <differentialpair
        name="PAIR"
        positiveConnection="P"
        negativeConnection="N"
        pcbTraceGap={0.96}
      />
    </board>,
  )
  return circuit.getCircuitJson()
}
