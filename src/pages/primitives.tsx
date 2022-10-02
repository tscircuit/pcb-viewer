import React, { useEffect, useRef } from "react"
import attinyEagle from "../assets/attiny-eagle"
import { drawEagle } from "../lib/draw-eagle"
import { drawPrimitives } from "../lib/draw-primitives"
import { Drawer } from "../lib/Drawer"

export default () => {
  const ref = useRef()
  let [width, height] = [500, 500]
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    drawer.clear()
    drawPrimitives(drawer, [
      {
        pcb_drawing_type: "circle",
        x: 100,
        y: 100,
        r: 50,
        layer: { name: "top" },
      },
      {
        pcb_drawing_type: "rect",
        x: 100,
        y: 250,
        w: 100,
        h: 100,
        layer: { name: "top" },
      },
      {
        pcb_drawing_type: "text",
        x: 150,
        y: 200,
        size: 45,
        // text: "Hello World",
        text: "Hello World",
        layer: { name: "top" },
      },
      {
        pcb_drawing_type: "line",
        x1: 0,
        y1: 500,
        x2: 100,
        y2: 400,
        width: 10,
        layer: { name: "top" },
      },
      {
        pcb_drawing_type: "line",
        x1: 0,
        y1: 400,
        x2: 100,
        y2: 450,
        width: 10,
        squareCap: true,
        layer: { name: "top" },
      },
    ])
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
