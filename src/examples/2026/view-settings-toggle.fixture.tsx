import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import { useState } from "react"
import { PCBViewer } from "../../PCBViewer"

export const ViewSettingsToggle = () => {
  const [showRatsNest, setShowRatsNest] = useState(true)
  const [showMultipleTracesLength, setShowMultipleTracesLength] = useState(true)
  const [showAutorouting, setShowAutorouting] = useState(true)
  const [showDrcErrors, setShowDrcErrors] = useState(true)
  const [showCopperPours, setShowCopperPours] = useState(true)
  const [showPcbGroups, setShowPcbGroups] = useState(true)
  const [showGroupAnchorOffsets, setShowGroupAnchorOffsets] = useState(false)
  const [showSolderMask, setShowSolderMask] = useState(false)

  const circuit = new Circuit()

  circuit.add(
    <board pcbX={0} pcbY={0} width="50mm" height="50mm">
      <resistor
        name="R1"
        resistance="10k"
        pcbX={-10}
        pcbY={-5}
        footprint="0805"
      />
      <resistor
        name="R2"
        resistance="10k"
        pcbX={-10}
        pcbY={0}
        footprint="0805"
      />
      <resistor
        name="R3"
        resistance="10k"
        pcbX={-10}
        pcbY={5}
        footprint="0805"
      />
      <resistor
        name="R4"
        resistance="10k"
        pcbX={10}
        pcbY={-5}
        footprint="0805"
      />
      <resistor
        name="R5"
        resistance="10k"
        pcbX={10}
        pcbY={0}
        footprint="0805"
      />
      <resistor
        name="R6"
        resistance="10k"
        pcbX={10}
        pcbY={5}
        footprint="0805"
      />
      <capacitor
        name="C1"
        capacitance="10uF"
        pcbX={0}
        pcbY={10}
        footprint="0805"
      />
      <capacitor
        name="C2"
        capacitance="10uF"
        pcbX={0}
        pcbY={-10}
        footprint="0805"
      />
      <trace from=".R1 > .pin2" to=".R4 > .pin1" />
      <trace from=".R2 > .pin2" to=".R5 > .pin1" />
      <trace from=".R3 > .pin2" to=".R6 > .pin1" />
      <trace from=".C1 > .pin1" to="net.GND" />
      <trace from=".C2 > .pin1" to="net.GND" />
    </board>,
  )

  circuit.add(
    <group name="GroupA">
      <resistor
        name="R7"
        resistance="1k"
        pcbX={-20}
        pcbY={15}
        footprint="0603"
      />
      <resistor
        name="R8"
        resistance="1k"
        pcbX={-15}
        pcbY={15}
        footprint="0603"
      />
    </group>,
  )

  const soup = circuit.getCircuitJson() as AnyCircuitElement[]

  const copperPours: AnyCircuitElement[] = [
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_1",
      layer: "top",
      shape: "rect",
      source_net_id: "net1",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_2",
      layer: "top",
      shape: "rect",
      source_net_id: "net2",
      center: { x: -15, y: -15 },
      width: 10,
      height: 10,
    } as PcbCopperPour,
  ]

  const soupWithCopperPours = [...soup, ...copperPours]

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={soupWithCopperPours as any}
        showRatsNest={showRatsNest}
        showMultipleTracesLength={showMultipleTracesLength}
        showAutorouting={showAutorouting}
        showDrcErrors={showDrcErrors}
        showCopperPours={showCopperPours}
        showPcbGroups={showPcbGroups}
        showGroupAnchorOffsets={showGroupAnchorOffsets}
        showSolderMask={showSolderMask}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showRatsNest}
            onChange={(e) => setShowRatsNest(e.target.checked)}
          />
          Show Rats Nest
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showMultipleTracesLength}
            onChange={(e) => setShowMultipleTracesLength(e.target.checked)}
          />
          Show Multiple Traces Length
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showAutorouting}
            onChange={(e) => setShowAutorouting(e.target.checked)}
          />
          Show Autorouting
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showDrcErrors}
            onChange={(e) => setShowDrcErrors(e.target.checked)}
          />
          Show DRC Errors
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showCopperPours}
            onChange={(e) => setShowCopperPours(e.target.checked)}
          />
          Show Copper Pours
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showPcbGroups}
            onChange={(e) => setShowPcbGroups(e.target.checked)}
          />
          Show PCB Groups
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showGroupAnchorOffsets}
            onChange={(e) => setShowGroupAnchorOffsets(e.target.checked)}
          />
          Show Group Anchor Offsets
        </label>
        <label style={{ color: "white", display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={showSolderMask}
            onChange={(e) => setShowSolderMask(e.target.checked)}
          />
          Show Solder Mask
        </label>
      </div>
    </div>
  )
}

export default ViewSettingsToggle
