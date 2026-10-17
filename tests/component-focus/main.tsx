import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer, usePcbViewerController } from "../../src/index"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    num_layers: 2,
    thickness: 1.6,
  },
  ...["top", "bottom"].flatMap((layer, i) => [
    {
      type: "source_component",
      source_component_id: `source_${i}`,
      name: `U${i + 1}`,
      ftype: "simple_chip",
    },
    {
      type: "pcb_component",
      pcb_component_id: `component_${i}`,
      source_component_id: `source_${i}`,
      center: { x: i ? 8 : -8, y: 5 },
      width: 4,
      height: 3,
      rotation: 0,
      layer,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad_${i}`,
      pcb_component_id: `component_${i}`,
      x: i ? 8 : -8,
      y: 5,
      width: 1,
      height: 1,
      shape: "rect",
      layer,
    },
  ]),
] as AnyCircuitElement[]

function Harness() {
  const [renamed, setRenamed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { controller, focusPcbComponent } = usePcbViewerController()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          focusPcbComponent("component_0")
          setMounted(true)
        }}
      >
        Mount and focus U1
      </button>
      <button type="button" onClick={() => focusPcbComponent("component_1")}>
        Focus U2
      </button>
      <button type="button" onClick={() => setMounted(false)}>
        Unmount
      </button>
      <button type="button" onClick={() => setRenamed(true)}>
        Rename U1
      </button>
      <output data-pending={controller.focusRequest !== null} />
      {mounted && (
        <PCBViewer
          renderer="canvas"
          circuitJson={
            renamed
              ? circuitJson.map((element) =>
                  element.type === "source_component" && element.name === "U1"
                    ? { ...element, name: "IC1" }
                    : element,
                )
              : circuitJson
          }
          height={600}
          controller={controller}
        />
      )}
    </>
  )
}
createRoot(document.getElementById("root")!).render(<Harness />)
