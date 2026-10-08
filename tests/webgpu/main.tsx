import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import { PCBViewer } from "../../src/index"
import type { AnyCircuitElement } from "circuit-json"
import { scene as xRayScene } from "../x-ray-net/scene"
import {
  convertElementToPrimitives,
  createPrimitiveMetadataIndex,
} from "../../src/lib/convert-element-to-primitive"
import type { WebGpuResponse } from "../../src/lib/webgpu/protocol"
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
  lastView: null as {
    transform: Record<string, number>
    options: { copperPourOpacity?: number; showCopperPours?: boolean }
  } | null,
}
const searchParams = new URLSearchParams(location.search)
const scenario = searchParams.get("scenario")
const circuitJsonUrl = searchParams.get("circuitJsonUrl")
const OriginalWorker = window.Worker
let activeWorker: Worker | undefined
let holdRenderedResponses = false
let replayingRenderedResponse = false
const heldRenderedResponses: Extract<WebGpuResponse, { type: "rendered" }>[] =
  []
function dispatchRenderedResponse(
  workerResponse: Extract<WebGpuResponse, { type: "rendered" }>,
) {
  if (!activeWorker) return
  replayingRenderedResponse = true
  activeWorker.dispatchEvent(
    new MessageEvent("message", { data: workerResponse }),
  )
  replayingRenderedResponse = false
}
window.Worker = class extends OriginalWorker {
  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args)
    activeWorker = this
    stats.created++
    this.addEventListener("message", (event) => {
      const workerResponse = event.data
      if (
        workerResponse.type === "rendered" &&
        holdRenderedResponses &&
        !replayingRenderedResponse
      ) {
        event.stopImmediatePropagation()
        heldRenderedResponses.push(workerResponse)
        stats.heldSceneGenerations.push(workerResponse.sceneGeneration)
        return
      }
      if (workerResponse.type === "ready") {
        stats.ready++
        if (scenario === "xray-unsupported")
          workerResponse.supportsXRayNet = false
      }
      if (workerResponse.type === "error")
        stats.errors.push(workerResponse.message)
      if (workerResponse.type === "rendered") {
        stats.frames++
        stats.geometryUploads = workerResponse.geometryUploads
        stats.compileMs = workerResponse.compileMs
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
    if (scenario === "controlled-xray") {
      if (message.type === "init") {
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent("message", {
              data: { type: "ready", supportsXRayNet: true },
            }),
          ),
        )
      } else if (message.type === "view") {
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "rendered",
                xRayActive: Boolean(message.options.xRayElementIds?.length),
                geometryUploads: 1,
                frames: stats.frames + 1,
                compileMs: 0,
                sceneGeneration: stats.latestSubmittedSceneGeneration,
              } satisfies WebGpuResponse,
            }),
          ),
        )
      }
      return
    }
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
  renderer: "webgpu" | "canvas" | null = "webgpu",
  strict = false,
  unsupported = false,
) {
  const shouldLoadCircuitJson = large || circuitJsonUrl !== null
  elements = shouldLoadCircuitJson
    ? await (
        await fetch(
          circuitJsonUrl ??
            "/src/examples/2026/repros/am3352-dev-board/circuit.json",
        )
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
        {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: "pour",
          shape: "rect",
          layer: "top",
          center: { x: 10, y: 0 },
          width: 6,
          height: 6,
        },
        ...(unsupported
          ? [
              {
                type: "pcb_smtpad",
                pcb_smtpad_id: "unsupported-pad",
                shape: "future_shape",
                layer: "top",
                x: 8,
                y: 0,
              },
            ]
          : []),
      ] as AnyCircuitElement[])
  if (scenario === "xray-unsupported" || scenario === "controlled-xray")
    elements = xRayScene
  const view = (
    <PCBViewer
      circuitJson={elements}
      renderer={renderer ?? undefined}
      allowEditing={false}
      height={600}
      onRenderComplete={() => stats.renderCompletions++}
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
      dispatchRenderedResponse(response)
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
if (scenario || circuitJsonUrl !== null)
  void mount(
    false,
    scenario === "canvas" ? "canvas" : "webgpu",
    false,
    scenario === "unsupported",
  )
