import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import { compose, scale, translate } from "transformation-matrix"
import { CanvasElementsRenderer } from "../../../../components/CanvasElementsRenderer"
import { ContextProviders } from "../../../../components/ContextProviders"
import circuitJson from "./nema17.circuit.json"

// imrishabh18/nema17-motor-controller-wago v1.0.1, downloaded 2026-11-14.
// Release: 66edbd23-6eec-4cd5-9c6f-59377b0b2342
// https://api.tscircuit.com/package_files/download?package_release_id=66edbd23-6eec-4cd5-9c6f-59377b0b2342&file_path=dist%2Findex%2Fcircuit.json
const elements = circuitJson.filter(
  (element) =>
    element.type.startsWith("pcb_") || element.type.startsWith("source_"),
) as AnyCircuitElement[]

// Fixed view box in mm: x [-10.8, -1.2], y [12, 19.6]. Both engines
// show exactly the same USB-C pins and the false bridge at y=15.2943068.
const width = 960
const height = 760
const transform = compose(scale(100, -100), translate(10.8, -19.6))
const noop = () => {}

export default function Nema17CanvasShorts() {
  const [renderer, setRenderer] = useState<"canvas" | "webgpu">("canvas")

  return (
    <div style={{ background: "#111", color: "white", width }}>
      <div style={{ padding: 12 }}>
        <a href="https://tscircuit.com/imrishabh18/nema17-motor-controller-wago#pcb">
          NEMA17 Wago v1.0.1 — USB-C apparent shorts
        </a>
        <p>
          Compare the horizontal copper line immediately above the USB-C pads.
          Canvas incorrectly bridges the pins; WebGPU leaves the traces
          separate. The route crosses inner layers through plated pads.
        </p>
        <label>
          Renderer:{" "}
          <select
            value={renderer}
            onChange={(event) =>
              setRenderer(event.target.value as "canvas" | "webgpu")
            }
          >
            <option value="canvas">Canvas</option>
            <option value="webgpu">WebGPU</option>
          </select>
        </label>
      </div>
      <ContextProviders disablePcbGroups>
        <CanvasElementsRenderer
          elements={elements}
          renderer={renderer}
          transform={transform}
          width={width}
          height={height}
          allowEditing={false}
          cancelPanDrag={noop}
          onCreateEditEvent={noop}
          onModifyEditEvent={noop}
        />
      </ContextProviders>
    </div>
  )
}
