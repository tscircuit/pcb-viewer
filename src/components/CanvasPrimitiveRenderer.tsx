import React, { useEffect, useRef } from "react"
import { drawPrimitives } from "../lib/draw-primitives"
import { Drawer } from "../lib/Drawer"
import { Primitive } from "../lib/types"

interface Props {
  primitives: Primitive[]
  defaultUnit?: string
}

export const CanvasPrimitiveRenderer = ({ primitives }: Props) => {
  const ref = useRef()
  let [width, height] = [500, 500]
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    drawer.clear()
    drawPrimitives(drawer, primitives)
  }, [primitives])

  return (
    <div style={{ backgroundColor: "black" }}>
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
