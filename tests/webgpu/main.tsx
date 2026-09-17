import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import { PCBViewer } from "../../dist/index.js"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertElementToPrimitives,
  createPrimitiveMetadataIndex,
} from "../../src/lib/convert-element-to-primitive"
const root = createRoot(document.getElementById("root")!)
const stats = {
  created: 0,
  terminated: 0,
  ready: 0,
  frames: 0,
  geometryUploads: 0,
  compileMs: 0,
  errors: [] as string[],
}
const OriginalWorker = window.Worker
window.Worker = class extends OriginalWorker {
  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args)
    stats.created++
    this.addEventListener("message", ({ data }) => {
      if (data.type === "ready") stats.ready++
      if (data.type === "error") stats.errors.push(data.message)
      if (data.type === "rendered") {
        stats.frames++
        stats.geometryUploads = data.geometryUploads
        stats.compileMs = data.compileMs
      }
    })
  }
  terminate() {
    stats.terminated++
    super.terminate()
  }
}
let elements: AnyCircuitElement[]
async function mount(
  large = false,
  renderer: "webgpu" | "canvas" = "webgpu",
  strict = false,
  unsupported = false,
) {
  elements = large
    ? await (
        await fetch("/src/examples/2026/repros/am3352-dev-board/circuit.json")
      ).json()
    : ([
        {
          type: "pcb_board",
          pcb_board_id: "board",
          center: { x: 0, y: 0 },
          width: 40,
          height: 30,
          num_layers: 2,
          thickness: 1.6,
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad",
          shape: "rect",
          layer: "top",
          x: 0,
          y: 0,
          width: 5,
          height: 4,
        },
        ...(unsupported
          ? [
              {
                type: "pcb_copper_text",
                pcb_copper_text_id: "knockout",
                text: "KO",
                layer: "top",
                anchor_position: { x: 8, y: 0 },
                font_size: 2,
                anchor_alignment: "center",
                is_knockout: true,
              },
            ]
          : []),
      ] as AnyCircuitElement[])
  const view = (
    <PCBViewer
      circuitJson={elements}
      renderer={renderer}
      allowEditing={false}
      height={600}
    />
  )
  root.render(strict ? <StrictMode>{view}</StrictMode> : view)
}
function metadataBenchmark() {
  const start = performance.now(),
    index = createPrimitiveMetadataIndex(elements)
  const primitives = elements.flatMap((e) =>
    convertElementToPrimitives(e, elements, index),
  )
  return { ms: performance.now() - start, primitives: primitives.length }
}
Object.assign(window, {
  gpuViewerTest: {
    stats,
    mount,
    metadataBenchmark,
    unmount: () => root.unmount(),
  },
})
