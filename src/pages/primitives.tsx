import { drawGrid } from "lib/draw-grid"
import React, { useEffect, useRef } from "react"
import { drawPrimitives } from "../lib/draw-primitives"
import { Drawer } from "../lib/Drawer"

export default () => {
  const ref = useRef()
  let [width, height] = [500, 500]
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    drawer.clear()
    drawGrid(drawer, {
      spacing: 100,
      view_window: { left: 0, bottom: 0, right: width, top: height },
    })
    drawPrimitives(drawer, [
      {
        pcb_drawing_type: "circle",
        x: 100,
        y: 100,
        r: 50,
        layer: "top",
      },
      {
        pcb_drawing_type: "rect",
        x: 100,
        y: 270,
        w: 100,
        h: 100,
        layer: "top",
      },
      {
        pcb_drawing_type: "text",
        x: 50,
        y: 210,
        size: 45,
        text: "Hello World1",
        layer: "top",
      },
      {
        pcb_drawing_type: "line",
        x1: 0,
        y1: 500,
        x2: 100,
        y2: 400,
        width: 10,
        layer: "top",
      },
      {
        pcb_drawing_type: "line",
        x1: 0,
        y1: 400,
        x2: 100,
        y2: 450,
        width: 10,
        squareCap: true,
        layer: "top",
      },
    ])
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
