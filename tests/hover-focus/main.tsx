import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "hover-board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    num_layers: 2,
    thickness: 1.6,
  },
] as AnyCircuitElement[]

function Harness() {
  const [mode, setMode] = useState("default")
  const [rendered, setRendered] = useState(false)
  const [focused, setFocused] = useState("None")
  return (
    <div
      style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}
      onFocusCapture={(event) =>
        setFocused(
          event.target.matches("[data-pcb-viewer]")
            ? "Viewer"
            : event.target.tagName === "INPUT"
              ? "Input"
              : "Mode",
        )
      }
      onBlurCapture={() => setFocused("None")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 8,
          minHeight: 32,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Hover focus{" "}
          <select
            aria-label="Hover focus"
            value={mode}
            onChange={(event) => {
              if (event.target.value !== mode) {
                setRendered(false)
                setMode(event.target.value)
              }
            }}
          >
            <option value="default">Default</option>
            <option value="disabled">Disabled</option>
            <option value="enabled">Enabled</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Keyboard input <input aria-label="Keyboard input" />
        </label>
        <output style={{ minWidth: 110 }} data-rendered={rendered}>
          Focused: {focused}
        </output>
      </div>
      <PCBViewer
        key={mode}
        renderer="canvas"
        circuitJson={circuitJson}
        height={500}
        onRenderComplete={() => setRendered(true)}
        {...(mode === "default" ? {} : { focusOnHover: mode === "enabled" })}
      />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Harness />)
