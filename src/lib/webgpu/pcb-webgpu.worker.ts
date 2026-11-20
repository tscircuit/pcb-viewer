import { CircuitToWebGpuDrawer } from "@tscircuit/circuit-json-webgpu"
import type { WebGpuRequest, WebGpuResponse } from "./protocol"
const scope = self as unknown as {
  onmessage: (event: MessageEvent<WebGpuRequest>) => void
  postMessage: (message: WebGpuResponse) => void
  requestAnimationFrame?: (callback: () => void) => number
}
const supportsXRayNet =
  "supportsXRayNet" in CircuitToWebGpuDrawer &&
  CircuitToWebGpuDrawer.supportsXRayNet === true
let drawer: CircuitToWebGpuDrawer | undefined
let canvas: OffscreenCanvas
let latestView: Extract<WebGpuRequest, { type: "view" }> | undefined
let pendingScene: Extract<WebGpuRequest, { type: "scene" }> | undefined
let layerStrokes: Extract<WebGpuRequest, { type: "layer-strokes" }>["strokes"]
let pendingPick: Extract<WebGpuRequest, { type: "pick-layer" }> | undefined
let picking = false
let sceneGeneration = 0
let scheduled = false,
  failed = false
const fail = (error: unknown) => {
  if (failed) return
  failed = true
  pendingScene = undefined
  drawer?.dispose()
  scope.postMessage({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  })
}
function renderFrame() {
  scheduled = false
  if (failed || !drawer || !latestView) return
  try {
    // Compile at the frame boundary so newer scenes replace queued geometry.
    if (pendingScene) {
      const scene = pendingScene
      pendingScene = undefined
      drawer.setCircuitJson(scene.elements)
      if (drawer.diagnostics.length)
        throw new Error(
          `Unsupported WebGPU geometry: ${drawer.diagnostics.map((d) => `${d.type}: ${d.message}`).join("; ")}`,
        )
      sceneGeneration = scene.sceneGeneration
    }
    const view = latestView
    const renderedSceneGeneration = sceneGeneration
    if (canvas.width !== view.width) canvas.width = view.width
    if (canvas.height !== view.height) canvas.height = view.height
    drawer.render({ ...view.options, transform: view.transform, layerStrokes })
    scope.postMessage({
      type: "rendered",
      xRayActive:
        supportsXRayNet && Boolean(view.options.xRayElementIds?.length),
      geometryUploads: drawer.stats.geometryUploads,
      frames: drawer.stats.frames,
      compileMs: drawer.stats.compileMs,
      sceneGeneration: renderedSceneGeneration,
    })
    void pickLayer()
  } catch (error) {
    fail(error)
  }
}
async function pickLayer() {
  if (failed || scheduled || picking || !pendingPick || !drawer) return
  const { id, point, candidates } = pendingPick
  pendingPick = undefined
  picking = true
  try {
    const picked = await drawer.pickLayerAt({ point, candidates })
    if (!failed)
      scope.postMessage({
        type: "picked-layer",
        id,
        layer: candidates.find((layer) => layer === picked),
      })
  } catch (error) {
    fail(error)
  } finally {
    picking = false
    void pickLayer()
  }
}
function schedule() {
  if (scheduled || failed || !drawer || !latestView) return
  scheduled = true
  if (scope.requestAnimationFrame) scope.requestAnimationFrame(renderFrame)
  else setTimeout(renderFrame, 16)
}
scope.onmessage = async (event) => {
  const workerRequest = event.data
  try {
    if (workerRequest.type === "init") {
      canvas = workerRequest.canvas
      drawer = await CircuitToWebGpuDrawer.create(canvas, {
        onDeviceLost: fail,
        renderViasInHighDetail: false,
      })
      if (failed) {
        drawer.dispose()
        return
      }
      scope.postMessage({
        type: "ready",
        supportsXRayNet,
      })
    } else if (workerRequest.type === "scene") {
      pendingScene = workerRequest
      schedule()
    } else if (workerRequest.type === "view") {
      latestView = workerRequest
      schedule()
    } else if (workerRequest.type === "layer-strokes") {
      layerStrokes = workerRequest.strokes
      schedule()
    } else if (workerRequest.type === "pick-layer") {
      pendingPick = workerRequest
      void pickLayer()
    } else {
      failed = true
      pendingScene = undefined
      drawer?.dispose()
    }
  } catch (error) {
    fail(error)
  }
}
