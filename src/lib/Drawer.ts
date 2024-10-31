import {
  type Matrix,
  applyToPoint,
  compose,
  identity,
  inverse,
  translate,
} from "transformation-matrix"
import colors from "./colors"
import { scaleOnly } from "./util/scale-only"
import {zIndexMap} from "./util/z-index-map"

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
  board: "rgb(255, 255, 255)",
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

  top_fabrication: colors.board.f_fab,
  bottom_fabrication: colors.board.b_fab,

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

  drawMeshPattern(
    x: number,
    y: number,
    width: number,
    height: number,
    spacing: number,
    angle: number = 45,
  ) {
    const ctx = this.getLayerCtx()
    const [x1, y1] = applyToPoint(this.transform, [x, y])
    const [x2, y2] = applyToPoint(this.transform, [x + width, y + height])
    const spacing$ = scaleOnly(this.transform, spacing)

    // Set line properties for the mesh
    ctx.lineWidth = 1
    ctx.strokeStyle = this.aperture.color

    const drawLines = (angle: number) => {
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      const diag = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

      for (let i = -diag; i <= diag; i += spacing$) {
        ctx.beginPath()
        ctx.moveTo(x1 + i * cos - diag * sin, y1 + i * sin + diag * cos)
        ctx.lineTo(x1 + i * cos + diag * sin, y1 + i * sin - diag * cos)
        ctx.stroke()
      }
    }

    // Draw first set of parallel lines
    drawLines((angle * Math.PI) / 180)
    // Draw second set of parallel lines (perpendicular to the first set)
    drawLines(((angle + 90) * Math.PI) / 180)
  }

  rect(x: number, y: number, w: number, h: number, mesh_fill?: boolean) {
    const [x1$, y1$] = applyToPoint(this.transform, [x - w / 2, y - h / 2])
    const [x2$, y2$] = applyToPoint(this.transform, [x + w / 2, y + h / 2])
    this.applyAperture()
    const ctx = this.getLayerCtx()

    if (mesh_fill) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      ctx.clip()

      // Draw the mesh pattern
      this.drawMeshPattern(x - w / 2, y - h / 2, w, h, 0.15) // Adjust spacing as needed

      ctx.restore()

      // Draw the outline
      ctx.strokeRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
    } else {
      ctx.fillRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
    }
  }

  circle(x: number, y: number, r: number, mesh_fill?: boolean) {
    const r$ = scaleOnly(this.transform, r)
    const [x$, y$] = applyToPoint(this.transform, [x, y])
    this.applyAperture()
    const ctx = this.getLayerCtx()

    if (mesh_fill) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x$, y$, r$, 0, 2 * Math.PI)
      ctx.clip()

      // Draw the mesh pattern
      // We need to cover the entire circular area, so we use a square that fully encloses the circle
      this.drawMeshPattern(x - r, y - r, r * 2, r * 2, 0.15) // Adjust spacing as needed

      ctx.restore()

      // Draw the outline
      ctx.beginPath()
      ctx.arc(x$, y$, r$, 0, 2 * Math.PI)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x$, y$, r$, 0, 2 * Math.PI)
      ctx.fill()
    }
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

  pill(x: number, y: number, w: number, h: number) {
    const [x$, y$] = applyToPoint(this.transform, [x - w / 2, y + h / 2])
    const width$ = scaleOnly(this.transform, w)
    const height$ = scaleOnly(this.transform, h)
    const radius = Math.min(width$, height$) / 2
    this.applyAperture()
    const ctx = this.getLayerCtx()
    ctx.beginPath()
    ctx.arc(x$ + radius, y$ + radius, radius, Math.PI, Math.PI * 1.5)
    ctx.arc(x$ + width$ - radius, y$ + radius, radius, Math.PI * 1.5, 0)
    ctx.arc(
      x$ + width$ - radius,
      y$ + height$ - radius,
      radius,
      0,
      Math.PI * 0.5,
    )
    ctx.arc(x$ + radius, y$ + height$ - radius, radius, Math.PI * 0.5, Math.PI)
    ctx.fill()
    ctx.closePath()
  }

  polygon(points: { x: number; y: number }[]) {
    if (points.length < 3) {
      console.warn("Polygon must have at least 3 points")
      return
    }

    this.applyAperture()
    const ctx = this.getLayerCtx()

    // Transform all points
    const transformedPoints = points.map((point) =>
      applyToPoint(this.transform, [point.x, point.y]),
    )

    // Draw the filled polygon
    ctx.beginPath()
    ctx.moveTo(transformedPoints[0][0], transformedPoints[0][1])
    for (let i = 1; i < transformedPoints.length; i++) {
      ctx.lineTo(transformedPoints[i][0], transformedPoints[i][1])
    }
    ctx.closePath()
    ctx.fill()

    // Draw the outline
    const lineWidth = scaleOnly(this.transform, this.aperture.size)
    ctx.lineWidth = lineWidth
    ctx.stroke()
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
      canvas.style.zIndex = `${zIndexMap.topLayer - i}`
      canvas.style.opacity = opaqueLayers.has(layer) ? "1" : "0.5"
    })
  }

  applyAperture() {
    const { transform, aperture } = this
    let { size, mode, color, fontSize, layer } = aperture
    if (!(layer in this.ctxLayerMap)) this.aperture.layer = "other"

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
