import { Circuit } from "@tscircuit/core"
import { useMemo, useState } from "react"
import { PCBViewer } from "../../PCBViewer"
import type { ViewSchematicComponentEvent } from "../../lib/get-pad-component"

export default function PadContextMenu() {
  const [schematicEnabled, setSchematicEnabled] = useState(true)
  const [selected, setSelected] = useState<ViewSchematicComponentEvent | null>(
    null,
  )
  const circuitJson = useMemo(() => {
    const circuit = new Circuit()
    circuit.add(
      <board width="24mm" height="16mm" routingDisabled>
        <chip
          name="U1"
          footprint="soic8"
          manufacturerPartNumber="NE555DR"
          pcbX={-5}
        />
        <chip
          name="U2"
          footprint="dip8"
          manufacturerPartNumber="NE555P"
          pcbX={5}
        />
      </board>,
    )
    return circuit.getCircuitJson()
  }, [])

  return (
    <div
      style={{ background: "#111", color: "#eee", fontFamily: "sans-serif" }}
    >
      <div style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>Pad context menu</h3>
        <p>
          Click or right-click a pad on U1 (left, SMT) or U2 (right,
          through-hole). The manufacturer part number appears in a disabled box
          at the bottom. Choose “↗️ U1 on Schematic” to see the callback below.
        </p>
        <label>
          <input
            type="checkbox"
            checked={schematicEnabled}
            onChange={(event) => setSchematicEnabled(event.target.checked)}
          />{" "}
          Schematic tab enabled (show navigation action)
        </label>
        <p role="status">
          {selected
            ? `Callback received: ${selected.refdes} — ${selected.source_component_id} (${selected.pcb_component_id})`
            : "No schematic navigation requested yet."}
        </p>
      </div>
      <PCBViewer
        circuitJson={circuitJson}
        renderer="canvas"
        height={500}
        onViewSchematicComponent={schematicEnabled ? setSelected : undefined}
      />
    </div>
  )
}
