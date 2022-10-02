import { scaleOnly } from "./util/scale-only"
import { identity, Matrix, applyToPoint } from "transformation-matrix"
import { SetOptional } from "type-fest"

export interface Aperture {
  shape: "circle" | "square"
  size: number
  mode: "add" | "subtract"
  fontSize: number
  color: string | number
}

export const DEFAULT_LAYER_COLORS = {
  0: "black",
  1: "blue",
  2: "green",
  3: "cyan",
  4: "red",
  5: "magenta",
  6: "brown",
  7: "lightgrey",
  8: "darkgrey",
  9: "lightblue",
  10: "lightgreen",
  11: "lightcyan",
  12: "lightred",
  13: "lightmagenta",
  14: "yellow",
  15: "white",
}

export const FILL_TYPES = {
  0: "Empty",
  1: "Solid",
  2: "Line",
  3: "LtSlash",
  4: "Slash",
  5: "BkSlash",
  6: "LtBkSlash",
  7: "Hatch",
  8: "XHatch",
  9: "Interleave",
  10: "WideDot",
  11: "CloseDot",
  12: "Stipple1",
  13: "Stipple2",
  14: "Stipple3",
  15: "Stipple4",
}

export class Drawer {
  ctx: CanvasRenderingContext2D
  aperture: Aperture
  transform: Matrix
  lastPoint: { x: number; y: number }

  constructor(public canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.transform = identity()
  }

  clear() {
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  equip(aperature: Partial<Aperture>) {
    this.aperture = {
      fontSize: 0,
      shape: "circle",
      mode: "add",
      size: 0,
      color: 4,
      ...aperature,
    }
  }

  rect(x: number, y: number, w: number, h: number) {
    const w$ = scaleOnly(this.transform, w)
    const h$ = scaleOnly(this.transform, h)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    this.ctx.fillRect(x$, y$, w$, h$)
  }

  circle(x: number, y: number, r: number) {
    const r$ = scaleOnly(this.transform, r)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    this.ctx.beginPath()
    this.ctx.arc(x$, y$, r$, 0, 2 * Math.PI)
    this.ctx.fill()
  }

  text(text: string, x: number, y: number) {
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    this.ctx.fillText(text, x$, y$)
  }

  applyAperture() {
    const { ctx, transform } = this
    const { size, mode, color, fontSize } = this.aperture
    ctx.lineWidth = scaleOnly(transform, size)
    ctx.lineCap = "round"
    if (mode === "add") {
      const colorString =
        typeof color === "string" ? color : DEFAULT_LAYER_COLORS[color]
      ctx.fillStyle = colorString
      ctx.strokeStyle = colorString
    } else {
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    }
    ctx.font = `${scaleOnly(transform, fontSize)}px sans-serif`
  }

  moveTo(x: number, y: number) {
    this.lastPoint = { x, y }
  }
  lineTo(x: number, y: number) {
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    const { size, shape, mode } = this.aperture
    const size$ = scaleOnly(this.transform, size)
    let { lastPoint, ctx } = this
    const lastPoint$ = applyToPoint(this.transform, lastPoint)

    ctx.beginPath()
    this.applyAperture()

    if (shape === "square")
      ctx.fillRect(
        lastPoint$.x - size$ / 2,
        lastPoint$.y - size$ / 2,
        size$,
        size$
      )
    ctx.moveTo(lastPoint$.x, lastPoint$.y)
    ctx.lineTo(x$, y$)
    if (shape === "square")
      ctx.fillRect(x$ - size$ / 2, y$ - size$ / 2, size$, size$)

    ctx.stroke()
    this.lastPoint = { x, y }
  }
}
