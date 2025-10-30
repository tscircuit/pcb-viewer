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
import { zIndexMap } from "./util/z-index-map"
import { Rotation } from "circuit-json"
import { BRepShape, Ring } from "lib/types"
import colorParser from "color"

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

  notes: colors.board.user_2,

  ...(colors.board as any),
}

export type LayerNameForColor = keyof typeof LAYER_NAME_TO_COLOR

export const DEFAULT_DRAW_ORDER = [
  "inner6",
  "inner5",
  "inner4",
  "inner3",
  "inner2",
  "inner1",
  "bottom",
  "bottom_silkscreen",
  "top",
  "top_silkscreen",
  "board",
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

  rect({
    x,
    y,
    w,
    h,
    mesh_fill,
    is_filled = true,
    has_stroke,
    is_stroke_dashed,
    stroke_width,
    roundness,
  }: {
    x: number
    y: number
    w: number
    h: number
    mesh_fill?: boolean
    is_filled?: boolean
    has_stroke?: boolean
    is_stroke_dashed?: boolean
    stroke_width?: number
    roundness?: number
  }) {
    const [x1$, y1$] = applyToPoint(this.transform, [x - w / 2, y - h / 2])
    const [x2$, y2$] = applyToPoint(this.transform, [x + w / 2, y + h / 2])
    this.applyAperture()
    const ctx = this.getLayerCtx()

    const radius$ = roundness ? scaleOnly(this.transform, roundness) : 0

    const shouldDrawStroke =
      has_stroke === undefined ? is_filled === false : has_stroke

    if (mesh_fill) {
      ctx.save()
      ctx.beginPath()
      if (radius$ > 0 && ctx.roundRect) {
        ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
      } else {
        ctx.rect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      }
      ctx.clip()

      // Draw the mesh pattern
      this.drawMeshPattern(x - w / 2, y - h / 2, w, h, 0.15) // Adjust spacing as needed

      ctx.restore()

      // Draw the outline
      if (radius$ > 0 && ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
        ctx.stroke()
      } else {
        ctx.strokeRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      }
    } else {
      if (is_filled !== false) {
        if (radius$ > 0 && ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
          ctx.fill()
        } else {
          ctx.fillRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
        }
      }

      if (shouldDrawStroke) {
        const originalLineWidth = ctx.lineWidth
        if (stroke_width !== undefined) {
          ctx.lineWidth = scaleOnly(this.transform, stroke_width)
        }
        if (is_stroke_dashed) {
          let dashPattern: number[] = []

          const scale = Math.abs(this.transform.a)
          if (scale > 0) {
            const SEGMENT_LENGTH = 0.1
            const dash = SEGMENT_LENGTH * scale
            const gap = dash * 1.3

            if (dash > 0.5) {
              dashPattern = [dash, gap]
            }
          }
          ctx.setLineDash(dashPattern)
        }
        if (radius$ > 0 && ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
          ctx.stroke()
        } else {
          ctx.strokeRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
        }
        if (is_stroke_dashed) {
          ctx.setLineDash([]) // Reset dash pattern
        }
        if (stroke_width !== undefined) {
          ctx.lineWidth = originalLineWidth
        }
      }
    }
  }

  rotatedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    ccw_rotation: Rotation,
    roundness?: number,
    mesh_fill?: boolean,
  ) {
    const ctx = this.getLayerCtx()
    this.applyAperture()

    const [x1$, y1$] = applyToPoint(this.transform, [x - w / 2, y - h / 2])
    const [x2$, y2$] = applyToPoint(this.transform, [x + w / 2, y + h / 2])
    const radius$ = roundness ? scaleOnly(this.transform, roundness) : 0

    ctx.save()

    const [centerX, centerY] = applyToPoint(this.transform, [x, y])
    ctx.translate(centerX, centerY)
    const cw_rotation = 360 - ccw_rotation
    if (ccw_rotation) ctx.rotate((cw_rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)

    if (mesh_fill) {
      ctx.beginPath()
      if (radius$ > 0 && ctx.roundRect) {
        ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
      } else {
        ctx.rect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      }
      ctx.clip()

      this.drawMeshPattern(x - w / 2, y - h / 2, w, h, 0.15)

      if (radius$ > 0 && ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
        ctx.stroke()
      } else {
        ctx.strokeRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      }
    } else {
      if (radius$ > 0 && ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x1$, y1$, x2$ - x1$, y2$ - y1$, radius$)
        ctx.fill()
      } else {
        ctx.fillRect(x1$, y1$, x2$ - x1$, y2$ - y1$)
      }
    }

    ctx.restore()
  }

  rotatedPill(
    x: number,
    y: number,
    w: number,
    h: number,
    ccw_rotation: Rotation,
  ) {
    const ctx = this.getLayerCtx()
    this.applyAperture()

    ctx.save()

    const [centerX, centerY] = applyToPoint(this.transform, [x, y])
    ctx.translate(centerX, centerY)
    const cw_rotation = 360 - ccw_rotation
    if (ccw_rotation) ctx.rotate((cw_rotation * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)

    this.pill(x, y, w, h)

    ctx.restore()
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
    ctx.fill("evenodd")

    // Draw the outline only if we have a non-zero stroke width.
    // Calling ctx.stroke() with a zero width will re-use the previous
    // stroke width which can cause the polygon to suddenly expand when
    // other primitives (like hovered rectangles) change the aperture size.
    const lineWidth = scaleOnly(this.transform, this.aperture.size)
    if (lineWidth > 0) {
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }
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
    const opaqueLayers = new Set([
      foregroundLayer,
      "drill",
      "other",
      "board",
      foregroundLayer === "top"
        ? "top_silkscreen"
        : foregroundLayer === "bottom"
          ? "bottom_silkscreen"
          : "",
    ])

    const associatedSilkscreen =
      foregroundLayer === "top"
        ? "top_silkscreen"
        : foregroundLayer === "bottom"
          ? "bottom_silkscreen"
          : undefined

    const layersToShiftToTop = [
      foregroundLayer,
      ...(associatedSilkscreen ? [associatedSilkscreen] : []),
    ]

    const order = [
      ...DEFAULT_DRAW_ORDER.filter(
        (l) => !layersToShiftToTop.includes(l as any),
      ),
      foregroundLayer,
      "drill",
      ...(associatedSilkscreen ? [associatedSilkscreen] : []),
    ]

    order.forEach((layer, i) => {
      const canvas = canvasLayerMap[layer]
      if (!canvas) return

      canvas.style.zIndex = `${zIndexMap.topLayer - (order.length - i)}`
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
      ctx.globalCompositeOperation = "source-over"
      let colorString = LAYER_NAME_TO_COLOR[color.toLowerCase()]
      if (!colorString)
        try {
          colorString = colorParser(color).rgb().toString()
        } catch (error) {
          console.warn(`Invalid color format: '${color}'`)
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

  polygonWithArcs(brep: BRepShape) {
    const ctx = this.getLayerCtx()

    const processRing = (ring: Ring) => {
      if (ring.vertices.length === 0) return
      const startPoint = ring.vertices[0]
      const t_start_point = applyToPoint(this.transform, [
        startPoint.x,
        startPoint.y,
      ])
      ctx.moveTo(t_start_point[0], t_start_point[1])

      for (let i = 0; i < ring.vertices.length; i++) {
        const p1 = ring.vertices[i]
        const p2 = ring.vertices[(i + 1) % ring.vertices.length]

        if (p1.bulge && p1.bulge !== 0) {
          const bulge = p1.bulge

          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const chord = Math.sqrt(dx * dx + dy * dy)

          if (chord < 1e-9) {
            const t_p2 = applyToPoint(this.transform, [p2.x, p2.y])
            ctx.lineTo(t_p2[0], t_p2[1])
            continue
          }

          const angle = 4 * Math.atan(bulge)
          const radius = Math.abs(chord / (2 * Math.sin(angle / 2)))

          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2

          const norm_dx = dx / chord
          const norm_dy = dy / chord

          const perp_vx = -norm_dy
          const perp_vy = norm_dx

          const dist_to_center = Math.sqrt(
            Math.max(0, radius * radius - (chord / 2) ** 2),
          )

          const cx = mx + dist_to_center * perp_vx * Math.sign(bulge)
          const cy = my + dist_to_center * perp_vy * Math.sign(bulge)

          const startAngle = Math.atan2(p1.y - cy, p1.x - cx)
          let endAngle = Math.atan2(p2.y - cy, p2.x - cx)

          if (bulge > 0 && endAngle < startAngle) {
            endAngle += 2 * Math.PI
          } else if (bulge < 0 && endAngle > startAngle) {
            endAngle -= 2 * Math.PI
          }

          const t_center = applyToPoint(this.transform, [cx, cy])
          const t_radius = scaleOnly(this.transform, radius)

          ctx.arc(
            t_center[0],
            t_center[1],
            t_radius,
            -startAngle,
            -endAngle,
            bulge > 0,
          )
        } else {
          const t_p2 = applyToPoint(this.transform, [p2.x, p2.y])
          ctx.lineTo(t_p2[0], t_p2[1])
        }
      }
      ctx.closePath()
    }

    ctx.beginPath()

    processRing(brep.outer_ring)
    if (brep.inner_rings) {
      for (const inner_ring of brep.inner_rings) {
        processRing(inner_ring)
      }
    }

    ctx.fill("evenodd")
  }
}
