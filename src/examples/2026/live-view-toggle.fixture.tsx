import { useEffect, useMemo, useRef, useState } from "react"
import { PCBViewer } from "../../PCBViewer"
import { Circuit } from "@tscircuit/core"
import type { GraphicsObject } from "graphics-debug"

const btnBase: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "sans-serif",
  transition: "all 0.15s ease",
}

const ToggleBtn = ({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    style={{
      ...btnBase,
      backgroundColor: active ? "#2563eb" : "#1f1f1f",
      color: active ? "#fff" : "#aaa",
      border: `1px solid ${active ? "#3b82f6" : "#555"}`,
    }}
    onClick={onClick}
  >
    {label}: {String(active)}
  </button>
)

export default () => {
  const [showRatsNest, setShowRatsNest] = useState(false)
  const [showDrcErrors, setShowDrcErrors] = useState(true)
  const [showCopperPours, setShowCopperPours] = useState(false)
  const [showSolderMask, setShowSolderMask] = useState(false)
  const [showTraceLengths, setShowTraceLengths] = useState(false)
  const [showAutorouting, setShowAutorouting] = useState(false)
  const [showPcbGroups, setShowPcbGroups] = useState(true)
  const [showGroupAnchorOffsets, setShowGroupAnchorOffsets] = useState(true)
  const [circuitJson, setCircuitJson] = useState<any>(null)
  const [debugGraphics, setDebugGraphics] = useState<GraphicsObject | null>(
    null,
  )
  const lastEventTimeRef = useRef(Date.now())

  const circuit = useMemo(() => {
    const c = new Circuit()

    c.add(
      <board
        width="120mm"
        height="80mm"
        autorouter={{ local: true, groupMode: "subcircuit" }}
      >
        <copperpour layer="top" connectsTo="net.GND" clearance="0.25mm" />
        <copperpour layer="bottom" connectsTo="net.GND" clearance="0.25mm" />

        <pcbnotetext
          pcbX="-45mm"
          pcbY="36mm"
          layer="top"
          text="ALL FEATURES (PCB NOTES)"
          font="tscircuit2024"
          fontSize="3mm"
        />
        <pcbnotetext
          pcbX="-45mm"
          pcbY="32mm"
          layer="bottom"
          text="BOTTOM PCB NOTES"
          font="tscircuit2024"
          fontSize="2mm"
        />

        <silkscreentext
          pcbX="-15mm"
          pcbY="36mm"
          layer="top"
          text="silkscreen text"
          font="tscircuit2024"
          fontSize="2mm"
        />
        <silkscreenrect
          pcbX="-50mm"
          pcbY="22mm"
          layer="top"
          width="10mm"
          height="6mm"
          filled={false}
          stroke="dashed"
          strokeWidth="0.2mm"
          cornerRadius="0.6mm"
        />
        <silkscreencircle
          pcbX="-35mm"
          pcbY="22mm"
          layer="top"
          radius="3mm"
          isOutline
          strokeWidth="0.2mm"
        />
        <silkscreenline
          layer="top"
          x1="-55mm"
          y1="16mm"
          x2="-30mm"
          y2="16mm"
          strokeWidth="0.2mm"
        />
        <silkscreenpath
          layer="top"
          route={[
            { x: "-55mm", y: "10mm" },
            { x: "-42mm", y: "8mm" },
            { x: "-30mm", y: "10mm" },
          ]}
          strokeWidth="0.2mm"
        />

        <keepout
          pcbX="-45mm"
          pcbY="-12mm"
          shape="rect"
          width="14mm"
          height="10mm"
        />
        <keepout pcbX="-28mm" pcbY="-12mm" shape="circle" radius="6mm" />

        <cutout
          pcbX="45mm"
          pcbY="-12mm"
          shape="rect"
          width="16mm"
          height="10mm"
        />
        <cutout pcbX="30mm" pcbY="-12mm" shape="circle" radius="6mm" />
        <cutout
          shape="polygon"
          points={[
            { x: 52, y: -2 },
            { x: 40, y: -2 },
            { x: 46, y: 6 },
          ]}
        />

        <via
          pcbX="40mm"
          pcbY="22mm"
          holeDiameter="0.5mm"
          outerDiameter="1mm"
          fromLayer="top"
          toLayer="bottom"
          connectsTo="net.SIG"
          name="VIA_SIG"
        />
        <hole pcbX="52mm" pcbY="22mm" diameter="2.4mm" />
        <platedhole
          pcbX="52mm"
          pcbY="30mm"
          shape="circle"
          holeDiameter="1.2mm"
          outerDiameter="2.4mm"
          connectsTo="net.GND"
        />
        <group name="Grouped Section" pcbX="-5mm" pcbY="-20mm">
          <resistor
            name="RG1"
            pcbX="0mm"
            pcbY="0mm"
            pcbRelative
            footprint="0603"
            resistance="1k"
          />
          <resistor
            name="RG2"
            pcbX="3mm"
            pcbY="0mm"
            pcbRelative
            footprint="0603"
            resistance="2k"
          />
        </group>

        <resistor
          name="R1"
          pcbX="-10mm"
          pcbY="0mm"
          footprint="0805"
          resistance="10k"
        />
        <capacitor
          name="C1"
          pcbX="10mm"
          pcbY="0mm"
          footprint="0805"
          capacitance="1uF"
        />
        <led name="LED1" pcbX="30mm" pcbY="0mm" footprint="0603" />

        <trace from=".R1 .pin2" to=".C1 .pin1" />
        <trace from=".C1 .pin2" to=".LED1 .anode" />
        <trace from=".LED1 .cathode" to=".U1 .pin1" />
        <trace from=".U1 .pin2" to=".R1 .pin1" />
        <trace from=".RG1 .pin2" to=".RG2 .pin1" />
        <chip
          name="U1"
          pcbX="0mm"
          pcbY="20mm"
          footprint={
            <footprint>
              <silkscreenrect
                pcbX="0mm"
                pcbY="0mm"
                layer="top"
                width="14mm"
                height="10mm"
                filled={false}
                stroke="solid"
                strokeWidth="0.15mm"
                cornerRadius="1mm"
              />
              <silkscreentext
                pcbX="0mm"
                pcbY="6mm"
                layer="top"
                text="U1"
                font="tscircuit2024"
                fontSize="2mm"
              />

              <smtpad
                shape="rect"
                pcbX="-5mm"
                pcbY="0mm"
                width="2.2mm"
                height="1.2mm"
                layer="top"
                portHints={["1", "left"]}
                coveredWithSolderMask
                solderMaskMargin="0.2mm"
              />
              <smtpad
                shape="rect"
                pcbX="5mm"
                pcbY="0mm"
                width="2.2mm"
                height="1.2mm"
                layer="top"
                portHints={["2", "right"]}
              />
              <hole pcbX="0mm" pcbY="-4mm" diameter="1.4mm" />

              <fabricationnoterect
                pcbX="0mm"
                pcbY="0mm"
                layer="top"
                width="14mm"
                height="10mm"
                strokeWidth="0.1mm"
                isFilled={false}
                hasStroke
                color="rgba(0, 255, 255, 0.7)"
              />
              <fabricationnotepath
                layer="top"
                strokeWidth="0.1mm"
                route={[
                  { x: "-7mm", y: "-5mm" },
                  { x: "7mm", y: "5mm" },
                ]}
              />
              <fabricationnotetext
                pcbX="0mm"
                pcbY="-7mm"
                layer="top"
                text="FAB"
                font="tscircuit2024"
                fontSize="1.5mm"
              />

              <pcbnotetext
                pcbX="0mm"
                pcbY="-2.5mm"
                layer="top"
                text="NOTE"
                font="tscircuit2024"
                fontSize="1.5mm"
              />
            </footprint>
          }
        />

        <fabricationnotedimension
          layer="top"
          from={{ x: -55, y: 38 }}
          to={{ x: 55, y: 38 }}
          text="120mm board width"
          font="tscircuit2024"
          fontSize="1.2mm"
          arrowSize="1mm"
          color="rgba(255, 255, 0, 0.9)"
        />

        <pcbnoterect
          pcbX="0mm"
          pcbY="-32mm"
          layer="top"
          width="40mm"
          height="10mm"
          strokeWidth="0.2mm"
          isFilled={false}
          hasStroke
          color="rgba(255, 165, 0, 0.9)"
          cornerRadius="1mm"
        />
        <pcbnotetext
          pcbX="0mm"
          pcbY="-32mm"
          layer="top"
          text="PCB NOTE AREA"
          font="tscircuit2024"
          fontSize="2mm"
        />
        <pcbnoteline
          layer="top"
          x1="-20mm"
          y1="-36mm"
          x2="20mm"
          y2="-36mm"
          strokeWidth="0.2mm"
          isDashed
          color="rgba(255, 165, 0, 0.9)"
        />
        <pcbnotepath
          layer="top"
          strokeWidth="0.2mm"
          color="rgba(255, 165, 0, 0.9)"
          route={[
            { x: "-20mm", y: "-28mm" },
            { x: "0mm", y: "-24mm" },
            { x: "20mm", y: "-28mm" },
          ]}
        />
        <pcbnotedimension
          layer="top"
          from={{ x: -20, y: -38 }}
          to={{ x: 20, y: -38 }}
          text="40mm"
          font="tscircuit2024"
          fontSize="1.2mm"
          arrowSize="1mm"
          color="rgba(255, 165, 0, 0.9)"
        />
      </board>,
    )

    c.on("autorouting:progress", (event) => {
      if (Date.now() > lastEventTimeRef.current + 100) {
        lastEventTimeRef.current = Date.now()
        setDebugGraphics(event.debugGraphics)
      }
    })

    setCircuitJson(c.getCircuitJson())

    return c
  }, [])

  useEffect(() => {
    circuit.renderUntilSettled().then(() => {
      setCircuitJson(circuit.getCircuitJson())
    })
  }, [circuit])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "black",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          borderBottom: "1px solid #333",
        }}
      >
        <ToggleBtn
          active={showRatsNest}
          label="Rats Nest"
          onClick={() => setShowRatsNest((v) => !v)}
        />
        <ToggleBtn
          active={showDrcErrors}
          label="DRC Errors"
          onClick={() => setShowDrcErrors((v) => !v)}
        />
        <ToggleBtn
          active={showCopperPours}
          label="Copper Pours"
          onClick={() => setShowCopperPours((v) => !v)}
        />
        <ToggleBtn
          active={showSolderMask}
          label="Solder Mask"
          onClick={() => setShowSolderMask((v) => !v)}
        />
        <ToggleBtn
          active={showTraceLengths}
          label="Trace Lengths"
          onClick={() => setShowTraceLengths((v) => !v)}
        />
        <ToggleBtn
          active={showAutorouting}
          label="Autorouting"
          onClick={() => setShowAutorouting((v) => !v)}
        />
        <ToggleBtn
          active={showPcbGroups}
          label="PCB Groups"
          onClick={() => setShowPcbGroups((v) => !v)}
        />
        <ToggleBtn
          active={showGroupAnchorOffsets}
          label="Anchor Offsets"
          onClick={() => setShowGroupAnchorOffsets((v) => !v)}
        />
      </div>
      <div style={{ flex: 1 }}>
        <PCBViewer
          circuitJson={circuitJson as any}
          debugGraphics={debugGraphics}
          height={600}
          viewOverrides={{
            showRatsNest,
            showDrcErrors,
            showCopperPours,
            showSolderMask,
            showTraceLengths,
            showAutorouting,
            showPcbGroups,
            showGroupAnchorOffsets,
          }}
        />
      </div>
    </div>
  )
}
