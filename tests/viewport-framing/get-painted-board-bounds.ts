export type PaintedBoardBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function getPaintedBoardBounds(): PaintedBoardBounds | null {
  const canvas = document.querySelector<HTMLCanvasElement>(".pcb-layer-board")
  const context = canvas?.getContext("2d")
  if (!canvas || !context) return null
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}
