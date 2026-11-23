import type { WebGpuRequest } from "../../../src/lib/webgpu/protocol"

/** What one worker frame drew, as the controlled drawer reports it. */
type DrawnFrame = { elementCount: number; layerStrokeCount: number }

/** Messages from the worker, including the controlled drawer's reports. */
type ControlledWorkerResponse =
  | { type: "ready" }
  | { type: "error"; message: string }
  | ({ type: "test_frame_drawn" } & DrawnFrame)
  | { type: "test_frame_flushed" }

const stats = {
  ready: false,
  drawnFrames: [] as DrawnFrame[],
  flushedFrames: 0,
  errors: [] as string[],
}
let worker: Worker

/** Starts the real WebGPU worker on the page's canvas. */
function start(): void {
  worker = new Worker(
    new URL("../../../src/lib/webgpu/pcb-webgpu.worker.ts", import.meta.url),
    { type: "module" },
  )
  worker.onmessage = (event: MessageEvent<ControlledWorkerResponse>) => {
    const response = event.data
    if (response.type === "ready") stats.ready = true
    if (response.type === "error") stats.errors.push(response.message)
    if (response.type === "test_frame_flushed") stats.flushedFrames++
    if (response.type === "test_frame_drawn") {
      stats.drawnFrames.push({
        elementCount: response.elementCount,
        layerStrokeCount: response.layerStrokeCount,
      })
    }
  }
  const canvas = document.querySelector("canvas")!.transferControlToOffscreen()
  worker.postMessage({ type: "init", canvas } satisfies WebGpuRequest, [canvas])
}

/** Sends one request to the worker. */
function send(request: WebGpuRequest): void {
  worker.postMessage(request)
}

/** Runs the worker's pending animation frame and waits until it has. */
async function flushFrame(): Promise<void> {
  const flushedFrames = stats.flushedFrames
  worker.postMessage({ type: "test_render_frame" })
  while (stats.flushedFrames === flushedFrames) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

window.phaseSkewWorkerTest = { stats, start, send, flushFrame }

declare global {
  interface Window {
    phaseSkewWorkerTest: {
      stats: typeof stats
      start: typeof start
      send: typeof send
      flushFrame: typeof flushFrame
    }
  }
}
