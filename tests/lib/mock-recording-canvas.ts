import type { AnyCircuitElement, LayerRef } from "circuit-json"
import type { CanvasContext } from "circuit-to-canvas"

export interface RecordedShape {
  kind: "circle" | "rect"
  fill: string
  x: number
  y: number
  r?: number
  w?: number
  h?: number
}

export interface RecordingStats {
  drawCalls: number
  fillStyles: string[]
  strokeStyles: string[]
  shapes: RecordedShape[]
}

export class MockCanvasContext2D implements CanvasContext {
  canvas: MockCanvas
  private readonly stats: RecordingStats
  private _fillStyle: string | CanvasGradient | CanvasPattern = ""
  private _strokeStyle: string | CanvasGradient | CanvasPattern = ""
  private tx = 0
  private ty = 0
  private readonly stack: Array<{
    tx: number
    ty: number
    globalCompositeOperation: string
  }> = []
  private pendingShape: Omit<RecordedShape, "fill"> | null = null
  lineWidth = 1
  globalAlpha = 1
  globalCompositeOperation = "source-over"
  lineCap: "butt" | "round" | "square" = "butt"
  lineJoin: "bevel" | "round" | "miter" = "miter"
  font = "10px sans-serif"
  textAlign: "start" | "end" | "left" | "right" | "center" = "start"
  textBaseline:
    | "top"
    | "hanging"
    | "middle"
    | "alphabetic"
    | "ideographic"
    | "bottom" = "alphabetic"

  constructor(canvas: MockCanvas, stats: RecordingStats) {
    this.canvas = canvas
    this.stats = stats
  }

  get fillStyle() {
    return this._fillStyle
  }

  set fillStyle(nextStyle: string | CanvasGradient | CanvasPattern) {
    this._fillStyle = nextStyle
  }

  get strokeStyle() {
    return this._strokeStyle
  }

  set strokeStyle(nextStyle: string | CanvasGradient | CanvasPattern) {
    this._strokeStyle = nextStyle
  }

  save() {
    this.stack.push({
      tx: this.tx,
      ty: this.ty,
      globalCompositeOperation: this.globalCompositeOperation,
    })
  }
  restore() {
    const prev = this.stack.pop()
    if (prev) {
      this.tx = prev.tx
      this.ty = prev.ty
      this.globalCompositeOperation = prev.globalCompositeOperation
    }
  }
  beginPath() {
    this.pendingShape = null
  }
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc(...args: Parameters<CanvasContext["arc"]>) {
    const [x = 0, y = 0, r = 0] = args
    this.pendingShape = { kind: "circle", x: x + this.tx, y: y + this.ty, r }
  }
  arcTo(..._args: number[]) {}
  ellipse(..._args: number[]) {}
  rect(...args: number[]) {
    const [x = 0, y = 0, w = 0, h = 0] = args
    this.pendingShape = {
      kind: "rect",
      x: x + this.tx,
      y: y + this.ty,
      w,
      h,
    }
  }
  clip() {}
  setLineDash() {}
  translate(x = 0, y = 0) {
    this.tx += x
    this.ty += y
  }
  rotate() {}
  scale() {}
  measureText() {
    return { width: 0 }
  }
  fillText(..._args: unknown[]) {}

  fill() {
    this.stats.drawCalls += 1
    const fill = String(this._fillStyle)
    this.stats.fillStyles.push(fill)
    if (
      this.pendingShape &&
      fill &&
      this.globalCompositeOperation !== "destination-out"
    ) {
      this.stats.shapes.push({ ...this.pendingShape, fill })
    }
  }

  fillRect(...args: number[]) {
    this.rect(...args)
    this.fill()
  }

  stroke() {
    this.stats.drawCalls += 1
    this.stats.strokeStyles.push(String(this._strokeStyle))
  }
}

export class MockCanvas {
  width = 300
  height = 240
  private readonly ctx: MockCanvasContext2D

  constructor(widthOrStats: number | RecordingStats = 300, height = 240) {
    const stats: RecordingStats =
      typeof widthOrStats === "object"
        ? widthOrStats
        : {
            drawCalls: 0,
            fillStyles: [],
            strokeStyles: [],
            shapes: [],
          }
    if (typeof widthOrStats === "number") {
      this.width = widthOrStats
      this.height = height
    }
    this.ctx = new MockCanvasContext2D(this, stats)
  }

  getContext(_contextId: "2d"): CanvasContext | null {
    return this.ctx
  }
}

export const createRecordingCanvas = () => {
  const stats: RecordingStats = {
    drawCalls: 0,
    fillStyles: [],
    strokeStyles: [],
    shapes: [],
  }
  const canvas = new MockCanvas(stats)
  return { canvas, stats }
}

export const renderRecordedShapesToSvg = (shapes: RecordedShape[]) =>
  shapes
    .map((shape) =>
      shape.kind === "circle"
        ? `<circle cx="${shape.x.toFixed(1)}" cy="${shape.y.toFixed(1)}" r="${(shape.r ?? 0).toFixed(1)}" fill="${shape.fill}"/>`
        : `<rect x="${shape.x.toFixed(1)}" y="${shape.y.toFixed(1)}" width="${(shape.w ?? 0).toFixed(1)}" height="${(shape.h ?? 0).toFixed(1)}" fill="${shape.fill}"/>`,
    )
    .join("")

export const testBoard: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  num_layers: 4,
  thickness: 1.6,
  material: "fr4",
}

export const createTestPlatedHole = ({
  id,
  x,
  layers,
}: {
  id: string
  x: number
  layers: LayerRef[]
}): AnyCircuitElement => ({
  type: "pcb_plated_hole",
  pcb_plated_hole_id: id,
  shape: "circle",
  x,
  y: 0,
  hole_diameter: 0.8,
  outer_diameter: 1.6,
  layers,
})

export const createTestVia = ({
  id,
  x,
  y,
  layers,
}: {
  id: string
  x: number
  y: number
  layers?: LayerRef[]
}): AnyCircuitElement => {
  const via: AnyCircuitElement = {
    type: "pcb_via",
    pcb_via_id: id,
    x,
    y,
    outer_diameter: 1.0,
    hole_diameter: 0.4,
    layers: layers ?? [],
  }
  if (!layers) {
    Reflect.deleteProperty(via, "layers")
  }
  return via
}

export const createTestSmtPad = ({
  id,
  x,
  layer,
}: {
  id: string
  x: number
  layer: LayerRef
}): AnyCircuitElement => ({
  type: "pcb_smtpad",
  pcb_smtpad_id: id,
  shape: "rect",
  x,
  y: 0,
  width: 1.6,
  height: 1.6,
  layer,
})
