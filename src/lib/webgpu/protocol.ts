import type { AnyCircuitElement, LayerRef } from "circuit-json"
import type {
  LayerStroke,
  Matrix,
  Point,
  RenderOptions,
} from "@tscircuit/circuit-json-webgpu"
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
      options: RenderOptions & { xRayElementIds?: readonly string[] }
    }
  | { type: "layer-strokes"; strokes: LayerStroke[] }
  | { type: "pick-layer"; id: number; point: Point; candidates: LayerRef[] }
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
  | { type: "picked-layer"; id: number; layer?: LayerRef }
  | { type: "error"; message: string }
