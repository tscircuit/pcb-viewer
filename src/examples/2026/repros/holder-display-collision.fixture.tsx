import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { Fragment, useEffect, useState } from "react"
import { PCBViewer } from "../../../PCBViewer"

const displayPinLabels = {
  pin1: ["1"],
  pin2: ["2"],
  pin3: ["3"],
  pin4: ["4"],
  pin5: ["5"],
  pin6: ["6"],
  pin7: ["7"],
  pin8: ["8"],
  pin9: ["9"],
  pin10: ["10"],
} as const

const unusedDisplayPins = [
  "pin1",
  "pin2",
  "pin4",
  "pin5",
  "pin6",
  "pin7",
  "pin9",
]

const displayFootprint = (
  <footprint>
    {[-5.08, -2.54, 0, 2.54, 5.08].map((x, index) => (
      <Fragment key={`lower-${x}`}>
        <platedhole
          portHints={[`pin${index + 1}`]}
          shape="circle"
          pcbX={x}
          pcbY={-3.8735}
          outerDiameter="1.524mm"
          holeDiameter="0.762mm"
        />
      </Fragment>
    ))}
    {[5.08, 2.54, 0, -2.54, -5.08].map((x, index) => (
      <Fragment key={`upper-${x}`}>
        <platedhole
          portHints={[`pin${index + 6}`]}
          shape="circle"
          pcbX={x}
          pcbY={3.7465}
          outerDiameter="1.524mm"
          holeDiameter="0.762mm"
        />
      </Fragment>
    ))}
    <courtyardoutline
      outline={[
        { x: -6.854, y: -5.3427 },
        { x: 6.854, y: -5.3427 },
        { x: 6.854, y: 5.2665 },
        { x: -6.854, y: 5.2665 },
        { x: -6.854, y: -5.3427 },
      ]}
    />
  </footprint>
)

const holderFootprint = (
  <footprint>
    <smtpad
      portHints={["pin1"]}
      pcbX={-8.599932}
      pcbY={0}
      width="4.5mm"
      height="2.3mm"
      shape="rect"
    />
    <smtpad
      portHints={["pin2"]}
      pcbX={8.599932}
      pcbY={0}
      width="4.5mm"
      height="2.3mm"
      shape="rect"
    />
    <courtyardoutline
      outline={[
        { x: -11.104944, y: -7.7176 },
        { x: 11.086656, y: -7.7176 },
        { x: 11.086656, y: 7.6922 },
        { x: -11.104944, y: 7.6922 },
        { x: -11.104944, y: -7.7176 },
      ]}
    />
  </footprint>
)

const Display = ({
  name,
  pcbX,
  segmentNet,
}: {
  name: string
  pcbX: number
  segmentNet: string
}) => (
  <chip
    name={name}
    pinLabels={displayPinLabels}
    pinAttributes={{
      pin3: { requiresGround: true },
      pin8: { requiresGround: true },
      pin10: { requiresPower: true },
    }}
    footprint={displayFootprint}
    pcbX={pcbX}
    pcbY={0}
    pcbRotation="270deg"
    noSchematicRepresentation
    noConnect={unusedDisplayPins}
    connections={{
      pin3: "net.GND",
      pin8: "net.GND",
      pin10: segmentNet,
    }}
  />
)

const HolderDisplayCollisionBoard = ({
  holderMoved,
}: {
  holderMoved: boolean
}) => (
  <board width="40mm" height="30mm" layers={2} thickness="1.6mm">
    <schematicsheet
      name="test"
      displayName="Connected collision reproduction"
      sheetIndex={0}
    />

    <Display name="DS_LEFT" pcbX={-5.5} segmentNet="net.LEFT_SEG_A" />
    <Display name="DS_RIGHT" pcbX={9.5} segmentNet="net.RIGHT_SEG_A" />

    <resistor
      name="R_LEFT"
      resistance="1kohm"
      footprint="0603"
      pcbX={-13}
      pcbY={10}
      schX={-3}
      schY={0}
      schSheetName="test"
      connections={{ pin1: "net.VBAT", pin2: "net.LEFT_SEG_A" }}
    />

    <resistor
      name="R_RIGHT"
      resistance="1kohm"
      footprint="0603"
      pcbX={13}
      pcbY={10}
      schX={3}
      schY={0}
      schSheetName="test"
      connections={{ pin1: "net.VBAT", pin2: "net.RIGHT_SEG_A" }}
    />

    <chip
      name="BT_HOLDER"
      pinLabels={{ pin1: ["1"], pin2: ["2"] }}
      pinAttributes={{
        pin1: { requiresPower: true },
        pin2: { requiresGround: true },
      }}
      footprint={holderFootprint}
      pcbX={holderMoved ? -1 : 0}
      pcbY={holderMoved ? -0.35 : 0}
      pcbRotation="90deg"
      layer="bottom"
      noSchematicRepresentation
      connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
    />
  </board>
)

const createCircuit = (holderMoved: boolean) => {
  const circuit = new Circuit()
  circuit.add(<HolderDisplayCollisionBoard holderMoved={holderMoved} />)
  return circuit
}

export const HolderDisplayCollision = () => {
  const [holderMoved, setHolderMoved] = useState(false)
  const [viewerKey, setViewerKey] = useState(0)
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>(() =>
    createCircuit(false).getCircuitJson(),
  )
  const [isRendering, setIsRendering] = useState(true)

  useEffect(() => {
    const circuit = createCircuit(holderMoved)
    let isMounted = true

    setCircuitJson(circuit.getCircuitJson())
    setIsRendering(true)

    circuit.renderUntilSettled().then(() => {
      if (!isMounted) return
      setCircuitJson(circuit.getCircuitJson())
      setIsRendering(false)
    })

    return () => {
      isMounted = false
    }
  }, [holderMoved])

  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          fontFamily: "sans-serif",
        }}
      >
        <button
          type="button"
          disabled={isRendering}
          onClick={() => setHolderMoved((moved) => !moved)}
        >
          {holderMoved ? "Restore holder position" : "Move holder and reroute"}
        </button>
        <button
          type="button"
          disabled={isRendering}
          onClick={() => setViewerKey((key) => key + 1)}
        >
          Remount viewer to show expected traces
        </button>
        <span>
          Real TSX board · {isRendering ? "routing…" : "routing complete"} ·{" "}
          {circuitJson.filter((elm) => elm.type === "pcb_trace").length} traces
          · holder ({holderMoved ? "-1, -0.35" : "0, 0"})
        </span>
      </div>
      <PCBViewer key={viewerKey} circuitJson={circuitJson} height={760} />
    </div>
  )
}

export default HolderDisplayCollision
