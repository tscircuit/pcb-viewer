import type { AnyElement } from "@tscircuit/builder"

export type AlignString =
  | "top_left"
  | "top_center"
  | "top_right"
  | "center_left"
  | "center"
  | "center_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right"

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

export interface Oval extends PCBDrawingObject {
  pcb_drawing_type: "oval"
  x: number
  y: number
  rX: number
  rY: number
}

export interface Pill extends PCBDrawingObject {
  pcb_drawing_type: "pill"
  x: number
  y: number
  rX: number
  rY: number
}

export type Primitive = Line | Text | Rect | Circle | Oval | Pill

export type GridConfig = {
  spacing: number
  view_window: {
    left: number
    right: number
    top: number
    bottom: number
  }
}
