import type { AnyCircuitElement } from "circuit-json"
import type { Matrix, RenderOptions } from "@tscircuit/circuit-json-webgpu"
export type PcbWebGpuRenderOptions = RenderOptions & {
  xRayElementIds?: readonly string[]
  phaseSkewUnknownTraceIds?: readonly string[]
}

export type WebGpuRequest =
  | { type: "init"; canvas: OffscreenCanvas }
  | {
      type: "scene"
      elements: AnyCircuitElement[]
      sceneGeneration: number
    }
  | {
      type: "view"
      width: number
      height: number
      transform: Matrix
      options: PcbWebGpuRenderOptions
    }
  | { type: "dispose" }
export type WebGpuResponse =
  | { type: "ready"; supportsXRayNet: boolean }
  | {
      type: "rendered"
      xRayActive: boolean
      geometryUploads: number
      frames: number
      compileMs: number
      sceneGeneration: number
    }
  | { type: "error"; message: string }
