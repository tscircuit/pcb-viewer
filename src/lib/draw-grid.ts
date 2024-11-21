import { applyToPoint, Matrix, inverse } from "transformation-matrix"
import { Drawer } from "./Drawer"
import { GridConfig } from "./types"
import { scaleOnly } from "./util/scale-only"

export const transformBounds = (
  transform: Matrix,
  bounds: { left: number; right: number; top: number; bottom: number },
) => {
  const { left, right, top, bottom } = bounds
  const [left$, top$] = applyToPoint(transform, [left, top])
  const [right$, bottom$] = applyToPoint(transform, [right, bottom])
  return {
    left: Math.min(left$, right$),
    right: Math.max(left$, right$),
    top: Math.max(bottom$, top$),
    bottom: Math.min(bottom$, top$),
  }
}

export const drawGrid = (drawer: Drawer, grid_config: GridConfig) => {
  const { spacing, view_window } = grid_config

  const transformed_window = transformBounds(
    inverse(drawer.transform),
    view_window,
  )

  const { left, right, top, bottom } = transformed_window

  const startx = Math.floor(left / spacing) * spacing
  const starty = Math.floor(bottom / spacing) * spacing

  const px = scaleOnly(inverse(drawer.transform))

  drawer.equip({
    color: "green",
    mode: "add",
    shape: "circle",
    size: px,
  })

  for (let x = startx; x < right; x += spacing) {
    drawer.moveTo(x, bottom)
    drawer.lineTo(x, top)
  }

  for (let y = starty; y < top; y += spacing) {
    drawer.moveTo(left, y)
    drawer.lineTo(right, y)
  }

  for (let x = startx; x < right; x += spacing) {
    for (let y = starty; y < top; y += spacing) {
      drawer.debugText(`${x}, ${y}`, x + px * 3, y - px * 3)
    }
  }
}
