import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { Fragment, useEffect, useMemo, useState } from "react"
import { PCBViewer } from "../../PCBViewer"

// Hirose FH12-24S-0.5SH 24-position, 0.5 mm-pitch FFC connector land pattern.
const ffc24Footprint = (
  <footprint>
    {Array.from({ length: 24 }, (_, index) => (
      <Fragment key={`ffc-pin-${index + 1}`}>
        <smtpad
          shape="rect"
          width="0.3mm"
          height="1.3mm"
          pcbX={-5.75 + index * 0.5}
          pcbY={1.85}
          portHints={[`pin${index + 1}`]}
        />
      </Fragment>
    ))}
    <smtpad
      shape="rect"
      width="1.8mm"
      height="2.2mm"
      pcbX={-7.65}
      pcbY={-1.4}
      portHints={["pin25"]}
    />
    <smtpad
      shape="rect"
      width="1.8mm"
      height="2.2mm"
      pcbX={7.65}
      pcbY={-1.4}
      portHints={["pin26"]}
    />
    <silkscreenrect width="17.2mm" height="6.2mm" pcbY={-0.7} />
    <silkscreentext text="FH12-24S" pcbY={-1.2} fontSize="0.7mm" />
    <courtyardrect width="18mm" height="7mm" pcbY={-0.7} />
  </footprint>
)

// Hirose DM3AT-SF-PEJM5 microSD connector land pattern, including card detect
// and shield/mounting pads.
const microSdFootprint = (
  <footprint>
    {Array.from({ length: 9 }, (_, index) => (
      <Fragment key={`micro-sd-pin-${index + 1}`}>
        <smtpad
          shape="rect"
          width="0.7mm"
          height="1.2mm"
          pcbX={2.775 - index * 1.1}
          pcbY={7.725}
          portHints={[`pin${index + 1}`]}
        />
      </Fragment>
    ))}
    <smtpad
      shape="rect"
      width="1mm"
      height="0.8mm"
      pcbX={-6.825}
      pcbY={-2.775}
      portHints={["pin10"]}
    />
    <smtpad
      shape="rect"
      width="1mm"
      height="1.2mm"
      pcbX={-6.825}
      pcbY={3.425}
      portHints={["pin11"]}
    />
    <smtpad
      shape="rect"
      width="1mm"
      height="2.8mm"
      pcbX={-6.825}
      pcbY={-6.925}
      portHints={["pin12"]}
    />
    <smtpad
      shape="rect"
      width="1mm"
      height="1.2mm"
      pcbX={4.325}
      pcbY={7.725}
      portHints={["pin13"]}
    />
    <smtpad
      shape="rect"
      width="1.3mm"
      height="1.9mm"
      pcbX={6.675}
      pcbY={-7.375}
      portHints={["pin14"]}
    />
    <silkscreenrect width="15.2mm" height="16.4mm" />
    <silkscreentext text="DM3AT-SF" fontSize="1mm" />
    <courtyardrect width="16mm" height="17.2mm" />
  </footprint>
)

export const createConnectorOrientationWarningCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="50mm" height="50mm" routingDisabled>
      <connector
        name="J_CAM"
        manufacturerPartNumber="Hirose FH12-24S-0.5SH"
        pinCount={26}
        footprint={ffc24Footprint}
        pcbX={0}
        pcbY={20}
      />
      <connector
        name="J_SD"
        manufacturerPartNumber="Hirose DM3AT-SF-PEJM5"
        pinCount={14}
        footprint={microSdFootprint}
        pcbX={0}
        pcbY={-15}
        pcbRotation={180}
      />
    </board>,
  )

  return circuit
}

const ConnectorOrientationWarnings = () => {
  const circuit = useMemo(createConnectorOrientationWarningCircuit, [])
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(
    null,
  )

  useEffect(() => {
    let isMounted = true

    circuit.renderUntilSettled().then(() => {
      if (isMounted) setCircuitJson(circuit.getCircuitJson())
    })

    return () => {
      isMounted = false
    }
  }, [circuit])

  return (
    <div style={{ backgroundColor: "black" }}>
      {circuitJson && <PCBViewer circuitJson={circuitJson} />}
    </div>
  )
}

export default ConnectorOrientationWarnings
