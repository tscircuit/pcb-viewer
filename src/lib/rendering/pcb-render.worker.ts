import { renderLayer } from "./render-layer"
import type { RenderScene, WorkerRequest, WorkerResponse } from "./types"

const scope = self as unknown as {
  onmessage: (event: MessageEvent<WorkerRequest>) => void
  postMessage: (response: WorkerResponse, transfer?: Transferable[]) => void
}
let scene: RenderScene
let revision = 0
scope.onmessage = ({ data }) => {
  try {
    if (data.type === "scene") {
      scene = data.scene
      revision = data.revision
      return
    }
    if (data.revision !== revision) throw new Error("Outdated render scene")
    const canvas = new OffscreenCanvas(data.request.width, data.request.height)
    renderLayer(scene, data.request, canvas)
    const image = canvas.transferToImageBitmap()
    scope.postMessage({ type: "image", id: data.id, revision, image }, [image])
  } catch (error) {
    scope.postMessage({
      type: "error",
      id: data.type === "render" ? data.id : undefined,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
// Detect partial implementations before accepting any render jobs.
try {
  const canvas = new OffscreenCanvas(1, 1)
  if (!canvas.getContext("2d"))
    throw new Error("OffscreenCanvas 2D is unavailable")
  canvas.transferToImageBitmap().close()
  scope.postMessage({ type: "ready" })
} catch (error) {
  scope.postMessage({ type: "error", message: String(error) })
}
