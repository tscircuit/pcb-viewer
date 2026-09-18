import { useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"
import circuitJson from "./repros/am3352-dev-board/circuit.json"

export const WebGpuAm3352 = () => {
  const [renderer, setRenderer] = useState<"webgpu" | "canvas">("webgpu")
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <label style={{ padding: 8 }}>
        AM3352 renderer:{" "}
        <select
          value={renderer}
          onChange={(event) =>
            setRenderer(event.target.value as "webgpu" | "canvas")
          }
        >
          <option value="webgpu">WebGPU (automatic Canvas fallback)</option>
          <option value="canvas">Canvas</option>
        </select>
      </label>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PCBViewer
          circuitJson={circuitJson as AnyCircuitElement[]}
          renderer={renderer}
        />
      </div>
    </div>
  )
}
