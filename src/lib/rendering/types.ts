import type { AnyCircuitElement } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { Primitive } from "../types"

export type PcbRenderOptions = {
  /** Number of background workers. Default 4; 0 forces the main-thread fallback. */
  workerCount?: number
  /** Delay after the last camera movement before requesting new images. Default 120 ms. */
  settleDelayMs?: number
  /** LRU image budget, in bytes. Default 128 MiB; the latest frame per layer is retained even above this budget. */
  maxCacheBytes?: number
  /** Optional factory for hosts with custom worker URLs or CSP requirements. */
  workerFactory?: () => Worker | Promise<Worker>
}

export type RenderScene = {
  elements: AnyCircuitElement[]
  primitives: Primitive[]
  options: {
    selectedLayer: string
    hiddenLayerOpacity: number
    isShowingCopperPours: boolean
    isShowingSolderMask: boolean
    isShowingSilkscreen: boolean
    isShowingFabricationNotes: boolean
    isShowingPcbNotes: boolean
    isShowingCourtyards: boolean
  }
}

export type ViewBox = { x: number; y: number; width: number; height: number }

/** A single layer and world region at a requested raster resolution. */
export type LayerRenderRequest = {
  layer: string
  viewBox: ViewBox
  /** World-to-image matrix, including device pixel ratio. */
  transform: Matrix
  width: number
  height: number
  key: string
}

export type WorkerRequest =
  | { type: "scene"; revision: number; scene: RenderScene }
  | {
      type: "render"
      id: number
      revision: number
      request: LayerRenderRequest
    }
export type WorkerResponse =
  | { type: "ready" }
  | { type: "image"; id: number; revision: number; image: ImageBitmap }
  | { type: "error"; id?: number; message: string }

export type RenderImage = ImageBitmap | HTMLCanvasElement
export function closeImage(image: RenderImage) {
  if ("close" in image) image.close()
  else {
    image.width = 0
    image.height = 0
  }
}
