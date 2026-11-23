import type { AnyCircuitElement } from "circuit-json"
import type {
  LayerStroke,
  Matrix,
  RenderOptions,
} from "@tscircuit/circuit-json-webgpu"
export type WebGpuRequest =
  | { type: "init"; canvas: OffscreenCanvas }
  | {
      type: "scene"
      elements: AnyCircuitElement[]
      sceneGeneration: number
      /** The strokes for these elements, drawn from the same frame. */
      layerStrokes?: LayerStroke[]
    }
  | {
      type: "view"
      width: number
      height: number
      transform: Matrix
      options: RenderOptions & { xRayElementIds?: readonly string[] }
    }
  /** New strokes for the latest scene, such as after a colour change. */
  | { type: "layer_strokes"; layerStrokes?: LayerStroke[] }
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
