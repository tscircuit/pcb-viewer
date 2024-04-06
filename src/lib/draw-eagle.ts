import type { EagleJSON, Layer } from "@tscircuit/eagle-xml-converter"
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
      fromDefinition(
        fromTransformAttribute("translate(200, 200) scale(30,-30)")
      )
    )
  }

  const layerMap: Record<number, Layer> = {}
  for (const layer of eagle.layers) {
    layerMap[layer.number] = layer
  }

  for (const smd of pkg.smd || []) {
    drawer.equip({
      color: layerMap[smd.layer].name,
    })
    drawer.rect(smd.x - smd.dx / 2, smd.y - smd.dy / 2, smd.dx, smd.dy)
  }
  for (const wire of pkg.wire || []) {
    drawer.equip({
      size: wire.width,
      shape: "circle",
      color: layerMap[wire.layer].name,
    })
    drawer.moveTo(wire.x1, wire.y1)
    drawer.lineTo(wire.x2, wire.y2)
  }

  for (const circle of pkg.circle || []) {
    drawer.equip({ color: layerMap[circle.layer].name })
    drawer.circle(circle.x, circle.y, circle.radius)
  }
}
