import type { AnyCircuitElement } from "circuit-json"
import { translate } from "transformation-matrix"
import type {
  WebGpuRequest,
  WebGpuResponse,
} from "../../src/lib/webgpu/protocol"

type RenderedFrame = Extract<WebGpuResponse, { type: "rendered" }>
type ControlledWorkerResponse =
  | WebGpuResponse
  | { type: "test_scene_compiled"; elementCount: number }
  | { type: "test_frame_flushed" }

const stats = {
  ready: false,
  elementCount: 0,
  compiledElementCounts: [] as number[],
  renderedFrames: [] as RenderedFrame[],
  flushedFrames: 0,
  errors: [] as string[],
}
let worker: Worker
let elements: AnyCircuitElement[]

async function start() {
  const response = await fetch(
    "/fixtures/tmds62levm-full-board.circuit.json.gz",
  )
  const compressed = await response.arrayBuffer()
  const bytes = new Uint8Array(compressed)
  elements =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(
          new Blob([compressed])
            .stream()
            .pipeThrough(new DecompressionStream("gzip")),
        ).json()
      : JSON.parse(new TextDecoder().decode(bytes))
  stats.elementCount = elements.length
  worker = new Worker(
    new URL("../../src/lib/webgpu/pcb-webgpu.worker.ts", import.meta.url),
    { type: "module" },
  )
  worker.onmessage = (event: MessageEvent<ControlledWorkerResponse>) => {
    const response = event.data
    if (response.type === "ready") stats.ready = true
    if (response.type === "test_scene_compiled")
      stats.compiledElementCounts.push(response.elementCount)
    if (response.type === "test_frame_flushed") stats.flushedFrames++
    if (response.type === "rendered") stats.renderedFrames.push(response)
    if (response.type === "error") stats.errors.push(response.message)
  }
  const canvas = document.querySelector("canvas")!.transferControlToOffscreen()
  worker.postMessage({ type: "init", canvas } satisfies WebGpuRequest, [canvas])
}

function submitScene(sceneGeneration: number, empty = false) {
  worker.postMessage({
    type: "scene",
    elements: empty ? [] : elements,
    sceneGeneration,
  } satisfies WebGpuRequest)
}

function submitView() {
  worker.postMessage({
    type: "view",
    width: 800,
    height: 600,
    transform: translate(0, 0),
    options: { selectedLayer: "top" },
  } satisfies WebGpuRequest)
}

function flushFrame() {
  worker.postMessage({ type: "test_render_frame" })
}

function dispose() {
  worker.postMessage({ type: "dispose" } satisfies WebGpuRequest)
}

window.workerSceneTest = {
  stats,
  start,
  submitScene,
  submitView,
  flushFrame,
  dispose,
}

declare global {
  interface Window {
    workerSceneTest: {
      stats: typeof stats
      start: typeof start
      submitScene: typeof submitScene
      submitView: typeof submitView
      flushFrame: typeof flushFrame
      dispose: typeof dispose
    }
  }
}
