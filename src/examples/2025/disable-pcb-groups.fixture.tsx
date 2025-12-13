import { PCBViewer } from "../../PCBViewer"
import { circuitJson } from "./pcb-group.fixture"

export const DisablePcbGroupsComparison = () => {
  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
        <div>
          <h3 style={{ color: "white", margin: "0 0 10px 0" }}>
            PCB Groups Enabled (Default)
          </h3>
          <div style={{ border: "1px solid #333" }}>
            <PCBViewer circuitJson={circuitJson as any} height={300} />
          </div>
        </div>
        <div>
          <h3 style={{ color: "white", margin: "0 0 10px 0" }}>
            PCB Groups Disabled (disablePcbGroups=true)
          </h3>
          <div style={{ border: "1px solid #333" }}>
            <PCBViewer
              circuitJson={circuitJson as any}
              height={300}
              disablePcbGroups={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const DisablePcbGroupsWithLocalStorage = () => {
  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ color: "white", marginBottom: "20px" }}>
        <p>
          This example shows that disablePcbGroups=true overrides localStorage
          settings.
        </p>
        <p>
          Even if you have PCB groups enabled in localStorage, they will be
          disabled.
        </p>
      </div>
      <div style={{ border: "1px solid #333" }}>
        <PCBViewer
          circuitJson={circuitJson as any}
          height={400}
          disablePcbGroups={true}
          initialState={{ is_showing_pcb_groups: true }} // This will be overridden
        />
      </div>
    </div>
  )
}

export default {
  DisablePcbGroupsComparison,
  DisablePcbGroupsWithLocalStorage,
}
