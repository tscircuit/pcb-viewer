import type { AnyElement } from "@tscircuit/builder"

export type AlignString =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export type LayerRef = string

export interface PCBDrawingObject {
  layer: LayerRef
  unit?: string
  _element?: AnyElement
  _parent_pcb_component?: AnyElement
  _parent_source_component?: AnyElement
  _source_port?: AnyElement
}

export interface Line extends PCBDrawingObject {
  pcb_drawing_type: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  squareCap?: boolean
  width: number
  zoomIndependent?: boolean
}
export interface Text extends PCBDrawingObject {
  pcb_drawing_type: "text"
  text: string
  x: number
  y: number
  size: number
  align?: AlignString
}
export interface Rect extends PCBDrawingObject {
  pcb_drawing_type: "rect"
  x: number
  y: number
  w: number
  h: number
  roundness?: number
  align?: AlignString
}
export interface Circle extends PCBDrawingObject {
  pcb_drawing_type: "circle"
  x: number
  y: number
  r: number
}

export type Primitive = Line | Text | Rect | Circle

export type GridConfig = {
  spacing: number
  view_window: {
    left: number
    right: number
    top: number
    bottom: number
  }
}
