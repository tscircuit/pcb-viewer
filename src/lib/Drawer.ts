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
  opacity: number
  mode: "add" | "subtract"
  fontSize: number
  color: string
  layer: string
}

export const LAYER_NAME_TO_COLOR = {
  // Standard colors, you shouldn't use these except for testing
  red: "red",
  black: "black",
  green: "green",
  board: "white",
  other: "#eee",
  // TODO more builtin html colors

  // Common eagle names
  top: colors.board.copper.f,
  inner1: colors.board.copper.in1,
  inner2: colors.board.copper.in2,
  inner3: colors.board.copper.in3,
  inner4: colors.board.copper.in4,
  inner5: colors.board.copper.in5,
  inner6: colors.board.copper.in6,
  inner7: colors.board.copper.in7,
  inner8: colors.board.copper.in8,

  bottom: colors.board.copper.b,
  drill: colors.board.anchor,
  keepout: colors.board.background,
  tkeepout: colors.board.b_crtyd,
  tplace: colors.board.b_silks,

  top_silkscreen: colors.board.f_silks,
  bottom_silkscreen: colors.board.b_silks,

  ...colors.board,
}

export type LayerNameForColor = keyof typeof LAYER_NAME_TO_COLOR

export const DEFAULT_DRAW_ORDER = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "bottom",
] as const

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
  canvasLayerMap: Record<string, HTMLCanvasElement>
  ctxLayerMap: Record<string, CanvasRenderingContext2D>
  // @ts-ignore this.equip({}) handles constructor assignment
  aperture: Aperture
  transform: Matrix
  foregroundLayer: string = "top"
  lastPoint: { x: number; y: number }

  constructor(canvasLayerMap: Record<string, HTMLCanvasElement>) {
    this.canvasLayerMap = canvasLayerMap
    this.ctxLayerMap = Object.fromEntries(
      Object.entries(canvasLayerMap).map(([name, canvas]) => [
        name,
        canvas.getContext("2d")!,
      ]),
    )
    this.transform = identity()
    // positive is up (cartesian)
    this.transform.d *= -1
    this.transform = compose(this.transform, translate(0, -500))
    this.lastPoint = { x: 0, y: 0 }
    this.equip({})
  }

  clear() {
    for (const ctx of Object.values(this.ctxLayerMap)) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    }
  }

  equip(aperture: Partial<Aperture>) {
    this.aperture = {
      fontSize: 0,
      shape: "circle",
      mode: "add",
      size: 0,
      color: "red",
      layer: "top",
      opacity: this.foregroundLayer === aperture.color ? 1 : 0.5,
      ...aperture,
    }
  }

  rect(x: number, y: number, w: number, h: number) {
    const [x1$, y1$] = applyToPoint(this.transform, [x - w / 2, y - h / 2])
    const [x2$, y2$] = applyToPoint(this.transform, [x + w / 2, y + h / 2])
    this.applyAperture()
    const ctx = this.getLayerCtx()
    ctx.fillRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
  }

  circle(x: number, y: number, r: number) {
    const r$ = scaleOnly(this.transform, r)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    const ctx = this.getLayerCtx()
    ctx.beginPath()
    ctx.arc(x$, y$, r$, 0, 2 * Math.PI)
    ctx.fill()
    ctx.closePath()
  }

  oval(x: number, y: number, rx: number, ry: number) {
    const rx$ = scaleOnly(this.transform, rx)
    const ry$ = scaleOnly(this.transform, ry)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    const ctx = this.getLayerCtx()
    ctx.beginPath()
    ctx.ellipse(x$, y$, rx$, ry$, 0, 0, 2 * Math.PI)
    ctx.fill()
    ctx.closePath()
  }

  /* NOTE: This is not gerber compatible */
  debugText(text: string, x: number, y: number) {
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    const ctx = this.getLayerCtx()

    ctx.font = `10px sans-serif`
    ctx.fillText(text, x$, y$)
  }

  getLayerCtx() {
    const ctx = this.ctxLayerMap[this.aperture.layer]
    if (!ctx) {
      throw new Error(`No context for layer "${this.aperture.layer}"`)
    }
    return ctx
  }

  /**
   * Iterate over each canvas and set the z index based on the layer order, but
   * always render the foreground layer on top.
   *
   * Also: Set the opacity of every non-foreground layer to 0.5
   */
  orderAndFadeLayers() {
    const { canvasLayerMap, foregroundLayer } = this
    const opaqueLayers = new Set([foregroundLayer, "drill", "other", "board"])
    const order = [
      "drill",
      "board",
      foregroundLayer,
      ...DEFAULT_DRAW_ORDER.filter((l) => l !== foregroundLayer),
    ]
    order.forEach((layer, i) => {
      const canvas = canvasLayerMap[layer]
      if (!canvas) return
      canvas.style.zIndex = `${100 - i}`
      canvas.style.opacity = opaqueLayers.has(layer) ? "1" : "0.5"
    })
  }

  applyAperture() {
    const { transform, aperture } = this
    let { size, mode, color, fontSize } = aperture
    if (color in this.ctxLayerMap) {
      this.aperture.layer = color
    } else {
      this.aperture.layer = "other"
    }
    const ctx = this.getLayerCtx()
    if (!ctx) {
      throw new Error(`No context for layer "${this.foregroundLayer}"`)
    }
    if (!color) color = "undefined"
    ctx.lineWidth = scaleOnly(transform, size)
    ctx.lineCap = "round"
    if (mode === "add") {
      let colorString =
        color?.[0] === "#" || color?.startsWith("rgb")
          ? color
          : (LAYER_NAME_TO_COLOR as any)[color?.toLowerCase()]
            ? (LAYER_NAME_TO_COLOR as any)[color?.toLowerCase()]
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
    let { lastPoint } = this
    const lastPoint$ = applyToPoint(this.transform, lastPoint)

    this.applyAperture()
    const ctx = this.getLayerCtx()

    if (shape === "square")
      ctx.fillRect(
        lastPoint$.x - size$ / 2,
        lastPoint$.y - size$ / 2,
        size$,
        size$,
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
