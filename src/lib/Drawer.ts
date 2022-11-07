import { scaleOnly } from "./util/scale-only"
import {
  identity,
  Matrix,
  applyToPoint,
  translate,
  compose,
  inverse,
} from "transformation-matrix"
import colors from "./colors"
import { convertTextToLines } from "./convert-text-to-lines"

export interface Aperture {
  shape: "circle" | "square"
  size: number
  mode: "add" | "subtract"
  fontSize: number
  color: string
}

export const LAYER_NAME_TO_COLOR = {
  // Standard colors, you shouldn't use these except for testing
  red: "red",
  black: "black",
  green: "green",
  // TODO more builtin html colors

  // Common eagle names
  top: colors.board.copper.f,
  keepout: colors.board.background,
  tkeepout: colors.board.b_crtyd,
  tplace: colors.board.b_silks,

  ...colors.board,
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
    // positive is up (cartesian)
    this.transform.d *= -1
    this.transform = compose(this.transform, translate(0, -500))
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
      color: "red",
      ...aperature,
    }
  }

  rect(x: number, y: number, w: number, h: number) {
    const [x1$, y1$] = applyToPoint(this.transform, [x, y])
    const [x2$, y2$] = applyToPoint(this.transform, [x + w, y + h])
    this.applyAperture()
    this.ctx.fillRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
  }

  circle(x: number, y: number, r: number) {
    const r$ = scaleOnly(this.transform, r)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    this.ctx.beginPath()
    this.ctx.arc(x$, y$, r$ * 2, 0, 2 * Math.PI)
    this.ctx.fill()
    this.ctx.closePath()
  }

  /* NOTE: This is not gerber compatible */
  debugText(text: string, x: number, y: number) {
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()

    this.ctx.font = `10px sans-serif`
    this.ctx.fillText(text, x$, y$)
  }

  applyAperture() {
    const { ctx, transform, aperture } = this
    const { size, mode, color, fontSize } = aperture
    ctx.lineWidth = scaleOnly(transform, size)
    ctx.lineCap = "round"
    if (mode === "add") {
      let colorString =
        color[0] === "#" || color.startsWith("rgb")
          ? color
          : LAYER_NAME_TO_COLOR[color.toLowerCase()]
          ? LAYER_NAME_TO_COLOR[color.toLowerCase()]
          : null
      if (colorString === null) {
        console.warn(`Color mapping for "${color}" not found`)
        colorString = "white"
      }
      ctx.fillStyle = colorString
      ctx.strokeStyle = colorString
    } else {
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    }
    ctx.font = `${scaleOnly(inverse(transform), fontSize)}px sans-serif`
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

    this.applyAperture()

    if (shape === "square")
      ctx.fillRect(
        lastPoint$.x - size$ / 2,
        lastPoint$.y - size$ / 2,
        size$,
        size$
      )
    ctx.beginPath()
    ctx.moveTo(lastPoint$.x, lastPoint$.y)
    ctx.lineTo(x$, y$)

    ctx.stroke()
    ctx.closePath()

    if (shape === "square")
      ctx.fillRect(x$ - size$ / 2, y$ - size$ / 2, size$, size$)

    this.lastPoint = { x, y }
  }
}
