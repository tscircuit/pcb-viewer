import type { AnyCircuitElement } from "circuit-json"
import type { Matrix, RenderOptions } from "@tscircuit/circuit-json-webgpu"
export type WebGpuRequest =
  | { type: "init"; canvas: OffscreenCanvas }
  | { type: "scene"; elements: AnyCircuitElement[] }
  | {
      type: "view"
      width: number
      height: number
      transform: Matrix
      options: RenderOptions
    }
  | { type: "dispose" }
export type WebGpuResponse =
  | { type: "ready" }
  | {
      type: "rendered"
      geometryUploads: number
      frames: number
      compileMs: number
    }
  | { type: "error"; message: string }
