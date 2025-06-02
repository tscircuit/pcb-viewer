import React, { useEffect, useRef } from "react"
import attinyEagle from "../assets/attiny-eagle"
import { drawEagle } from "lib/draw-eagle"
import { Drawer } from "lib/Drawer"

export default () => {
  const ref = useRef<any>()
  let [width, height] = [500, 500]
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    drawer.clear()
    drawEagle(drawer, attinyEagle as any)
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
