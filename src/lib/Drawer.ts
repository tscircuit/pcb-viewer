export interface Aperture {
  shape: "circle" | "square"
  size: number
  mode: "add" | "subtract"
}

export class Drawer {
  ctx: CanvasRenderingContext2D
  aperture: Aperture
  lastPoint: { x: number; y: number }

  constructor(public canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
  }

  clear() {
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  equip(aperature: Aperture) {
    this.aperture = aperature
  }

  moveTo(x: number, y: number) {
    this.lastPoint = { x, y }
  }
  lineTo(x: number, y: number) {
    const { size, shape, mode } = this.aperture
    const { lastPoint, ctx } = this
    ctx.beginPath()
    // set the line width to the size of the aperture
    ctx.lineWidth = this.aperture.size
    ctx.lineCap = "round"
    if (mode === "add") {
      ctx.fillStyle = "red"
      ctx.strokeStyle = "red"
    } else {
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,1)"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    }
    if (shape === "square")
      ctx.fillRect(lastPoint.x - size / 2, lastPoint.y - size / 2, size, size)
    ctx.moveTo(this.lastPoint.x, this.lastPoint.y)
    ctx.lineTo(x, y)
    if (shape === "square") ctx.fillRect(x - size / 2, y - size / 2, size, size)

    ctx.stroke()
    this.lastPoint = { x, y }
  }
}
