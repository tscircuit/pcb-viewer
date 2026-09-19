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
      options: RenderOptions & { xRayElementIds?: readonly string[] }
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
    }
  | { type: "error"; message: string }
