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
  lastView: null as { transform: Record<string, number> } | null,
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
  postMessage(
    message: any,
    transfer?: Transferable[] | StructuredSerializeOptions,
  ) {
    if (message.type === "view") stats.lastView = message
    if (Array.isArray(transfer)) super.postMessage(message, transfer)
    else super.postMessage(message, transfer)
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
                type: "pcb_note_dimension",
                pcb_note_dimension_id: "unsupported-dimension",
                text: "2",
                layer: "top",
                from: { x: 8, y: 0 },
                to: { x: 10, y: 0 },
                arrow_size: 0.3,
                font_size: 2,
                font: "tscircuit2024",
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

declare global {
  interface Window {
    gpuViewerTest: {
      stats: typeof stats
      mount: typeof mount
      metadataBenchmark: typeof metadataBenchmark
      unmount(): void
    }
  }
}
