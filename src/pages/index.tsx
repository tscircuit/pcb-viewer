import React, { useEffect, useRef } from "react"
import { Drawer } from "../lib/Drawer"

export default () => {
  const ref = useRef()
  let [width, height] = [500, 500]
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    drawer.clear()
    drawer.equip({ size: 30, shape: "square", mode: "add" })
    drawer.moveTo(50, 50)
    drawer.lineTo(300, 50)
    drawer.equip({ size: 30, shape: "square", mode: "subtract" })
    drawer.moveTo(250, 0)
    drawer.lineTo(250, 300)
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
