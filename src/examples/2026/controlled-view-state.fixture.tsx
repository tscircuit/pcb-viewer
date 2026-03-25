import { useMemo, useState } from "react"
import { PCBViewer, type PCBViewerViewState } from "../../PCBViewer"
import { getAllFeaturesCircuitJson } from "../all-features.fixture"

const initialViewState: PCBViewerViewState = {
  selectedLayer: "top",
  isShowingRatsNest: false,
  isShowingMultipleTracesLength: false,
  isShowingAutorouting: true,
  isShowingDrcErrors: true,
  isShowingCopperPours: true,
  isShowingPcbGroups: true,
  isShowingGroupAnchorOffsets: false,
  isShowingSolderMask: false,
  isShowingFabricationNotes: false,
  pcbGroupViewMode: "all",
}

export const ControlledViewStateFixture = () => {
  const [viewState, setViewState] =
    useState<PCBViewerViewState>(initialViewState)
  const circuitJson = useMemo(() => getAllFeaturesCircuitJson(), [])

  const booleanToggles: Array<{
    key: keyof Omit<PCBViewerViewState, "selectedLayer" | "pcbGroupViewMode">
    label: string
  }> = [
    { key: "isShowingRatsNest", label: "Rats Nest" },
    {
      key: "isShowingMultipleTracesLength",
      label: "Multiple Trace Length",
    },
    { key: "isShowingAutorouting", label: "Autorouting" },
    { key: "isShowingDrcErrors", label: "DRC Errors" },
    { key: "isShowingCopperPours", label: "Copper Pours" },
    { key: "isShowingPcbGroups", label: "PCB Groups" },
    {
      key: "isShowingGroupAnchorOffsets",
      label: "Group Anchor Offsets",
    },
    { key: "isShowingSolderMask", label: "Solder Mask" },
    {
      key: "isShowingFabricationNotes",
      label: "Fabrication Notes",
    },
  ]

  const toggleBooleanState = (
    key: keyof Omit<PCBViewerViewState, "selectedLayer" | "pcbGroupViewMode">,
  ) => {
    setViewState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div style={{ backgroundColor: "black" }}>
      <div
        style={{
          padding: 12,
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          color: "white",
          fontFamily: "sans-serif",
          fontSize: 12,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Layer</span>
          <select
            value={viewState.selectedLayer}
            onChange={(event) =>
              setViewState((prev) => ({
                ...prev,
                selectedLayer: event.target
                  .value as PCBViewerViewState["selectedLayer"],
              }))
            }
          >
            <option value="top">top</option>
            <option value="bottom">bottom</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>PCB Group View Mode</span>
          <select
            value={viewState.pcbGroupViewMode}
            onChange={(event) =>
              setViewState((prev) => ({
                ...prev,
                pcbGroupViewMode: event.target
                  .value as PCBViewerViewState["pcbGroupViewMode"],
              }))
            }
          >
            <option value="all">all</option>
            <option value="named_only">named_only</option>
          </select>
        </label>

        {booleanToggles.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleBooleanState(key)}
          >
            {label}: {viewState[key] ? "on" : "off"}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: "0 12px 12px 12px",
          color: "white",
          fontFamily: "sans-serif",
          fontSize: 12,
        }}
      >
        Use toolbar controls and watch this state stay in sync.
      </div>

      <PCBViewer
        height={700}
        circuitJson={circuitJson}
        viewState={viewState}
        onViewStateChange={setViewState}
      />

      <pre
        style={{
          margin: 0,
          padding: 12,
          color: "#9be7ff",
          fontSize: 11,
          overflow: "auto",
          maxHeight: 240,
        }}
      >
        {JSON.stringify(viewState, null, 2)}
      </pre>
    </div>
  )
}

export default ControlledViewStateFixture
