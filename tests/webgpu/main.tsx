import type { AnyCircuitElement } from "circuit-json"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import {
  convertElementToPrimitives,
  createPrimitiveMetadataIndex,
} from "../../src/lib/convert-element-to-primitive"
import type { WebGpuResponse } from "../../src/lib/webgpu/protocol"
import { scene as xRayScene } from "../x-ray-net/scene"
const root = createRoot(document.getElementById("root")!)
const stats = {
  created: 0,
  terminated: 0,
  ready: 0,
  frames: 0,
  geometryUploads: 0,
  compileMs: 0,
  renderCompletions: 0,
  latestSubmittedSceneGeneration: 0,
  heldSceneGenerations: [] as number[],
  errors: [] as string[],
  lastView: null as { transform: Record<string, number> } | null,
}
const scenario = new URLSearchParams(location.search).get("scenario")
const OriginalWorker = window.Worker
let activeWorker: Worker | undefined
let holdRenderedResponses = false
let replayingRenderedResponse = false
const heldRenderedResponses: Extract<WebGpuResponse, { type: "rendered" }>[] =
  []
window.Worker = class extends OriginalWorker {
  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args)
    activeWorker = this
    stats.created++
    this.addEventListener("message", (event) => {
      const { data } = event
      if (
        data.type === "rendered" &&
        holdRenderedResponses &&
        !replayingRenderedResponse
      ) {
        event.stopImmediatePropagation()
        heldRenderedResponses.push(data)
        stats.heldSceneGenerations.push(data.sceneGeneration)
        return
      }
      if (data.type === "ready") {
        stats.ready++
        if (scenario === "xray-unsupported") data.supportsXRayNet = false
      }
      if (data.type === "error") stats.errors.push(data.message)
      if (data.type === "rendered") {
        stats.frames++
        stats.geometryUploads = data.geometryUploads
        stats.compileMs = data.compileMs
        if (scenario === "device-lost" && stats.frames === 1)
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: { type: "error", message: "Test GPU device lost" },
              }),
            ),
          )
      }
    })
  }
  postMessage(
    message: any,
    transfer?: Transferable[] | StructuredSerializeOptions,
  ) {
    if (message.type === "scene")
      stats.latestSubmittedSceneGeneration = message.sceneGeneration
    if (message.type === "init") {
      if (scenario === "timeout") return
      if (scenario === "worker-error" || scenario === "message-error") {
        queueMicrotask(() =>
          this.dispatchEvent(
            scenario === "worker-error"
              ? new ErrorEvent("error", { message: "Test worker failed" })
              : new MessageEvent("messageerror"),
          ),
        )
        return
      }
    }
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
type MountOptions = {
  circuitJsonUrl?: string
  large?: boolean
  renderer?: "webgpu" | "canvas"
  strict?: boolean
  unsupported?: boolean
}

async function mount(options: MountOptions = {}) {
  const {
    circuitJsonUrl,
    large = false,
    renderer = "webgpu",
    strict = false,
    unsupported = false,
  } = options
  elements = circuitJsonUrl
    ? await (await fetch(circuitJsonUrl)).json()
    : large
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
                  type: "pcb_future_geometry",
                  pcb_future_geometry_id: "unsupported-geometry",
                },
              ]
            : []),
        ] as AnyCircuitElement[])
  if (scenario === "xray-unsupported") elements = xRayScene
  const view = (
    <PCBViewer
      circuitJson={elements}
      renderer={renderer}
      allowEditing={false}
      height={600}
      onRenderComplete={() => stats.renderCompletions++}
    />
  )
  root.render(strict ? <StrictMode>{view}</StrictMode> : view)
}
function metadataBenchmark() {
  const start = performance.now()
  const index = createPrimitiveMetadataIndex(elements)
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
    holdRenderedResponses: () => {
      holdRenderedResponses = true
    },
    releaseRenderedResponse: (sceneGeneration: number) => {
      const responseIndex = heldRenderedResponses.findIndex(
        (response) => response.sceneGeneration === sceneGeneration,
      )
      if (responseIndex === -1 || !activeWorker) return
      const [response] = heldRenderedResponses.splice(responseIndex, 1)
      const statsIndex = stats.heldSceneGenerations.indexOf(sceneGeneration)
      if (statsIndex !== -1) stats.heldSceneGenerations.splice(statsIndex, 1)
      replayingRenderedResponse = true
      activeWorker.dispatchEvent(
        new MessageEvent("message", { data: response }),
      )
      replayingRenderedResponse = false
    },
    unmount: () => root.unmount(),
  },
})

declare global {
  interface Window {
    gpuViewerTest: {
      stats: typeof stats
      mount: typeof mount
      metadataBenchmark: typeof metadataBenchmark
      holdRenderedResponses(): void
      releaseRenderedResponse(sceneGeneration: number): void
      unmount(): void
    }
  }
}

// Query scenarios also allow interactive verification of failure handling.
if (scenario === "unavailable")
  Object.defineProperty(navigator, "gpu", {
    configurable: true,
    value: undefined,
  })
if (scenario) {
  void mount({
    renderer: scenario === "canvas" ? "canvas" : "webgpu",
    unsupported: scenario === "unsupported",
  })
}
