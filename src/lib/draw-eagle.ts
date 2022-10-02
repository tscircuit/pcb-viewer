import { EagleJSON, Layer } from "@tscircuit/eagle-xml-converter"
import {
  compose,
  fromDefinition,
  fromTransformAttribute,
} from "transformation-matrix"
import { Drawer } from "./Drawer"

export const drawEagle = (drawer: Drawer, eagle: EagleJSON) => {
  const pkg = eagle.library.packages[0]

  if (eagle.grid.unit === "inch") {
    drawer.transform = compose(
      fromDefinition(fromTransformAttribute("translate(200, 200) scale(30,30)"))
    )
  }

  const layerMap: Record<number, Layer> = {}
  for (const layer of eagle.layers) {
    layerMap[layer.number] = layer
  }

  for (const smd of pkg.smd || []) {
    drawer.equip({
      mode: "add",
      size: 1,
      fontSize: 0.5,
      shape: "square",
      color: layerMap[smd.layer].color,
    })
    drawer.rect(smd.x - smd.dx / 2, smd.y - smd.dy / 2, smd.dx, smd.dy)

    drawer.equip({ color: "green", fontSize: 0.7 })
    drawer.text(smd.layer.toString(), smd.x, smd.y)
  }
  for (const wire of pkg.wire || []) {
    drawer.equip({
      mode: "add",
      size: wire.width,
      shape: "circle",
      color: layerMap[wire.layer].color,
    })
    drawer.moveTo(wire.x1, wire.y1)
    drawer.lineTo(wire.x2, wire.y2)

    drawer.equip({ color: "green", fontSize: 0.7 })
    drawer.text(wire.layer.toString(), wire.x1, wire.y1)
  }

  for (const circle of pkg.circle || []) {
    drawer.equip({ color: layerMap[circle.layer].color })
    drawer.circle(circle.x, circle.y, circle.width)

    drawer.equip({ color: "green", fontSize: 0.7 })
    drawer.text(circle.layer.toString(), circle.x, circle.y)
  }
}
