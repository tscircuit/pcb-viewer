import { expect, test } from "bun:test"
import { Drawer } from "../../src/lib/Drawer"

test("Drawer.dimCopper dims copper layer canvases without affecting non-copper layers", () => {
  const layers = ["board", "top", "inner1", "bottom", "drill", "top_silkscreen"]
  const canvasMap = Object.fromEntries(
    layers.map((layer) => [
      layer,
      {
        style: {},
        getContext: () => ({}),
      } as unknown as HTMLCanvasElement,
    ]),
  )
  const drawer = new Drawer(canvasMap)
  drawer.dimCopper = true
  drawer.orderAndFadeLayers()

  for (const copperLayer of ["top", "inner1", "bottom"]) {
    expect(canvasMap[copperLayer].style.filter).toBe("brightness(0.35)")
  }
  for (const nonCopperLayer of ["board", "drill", "top_silkscreen"]) {
    expect(canvasMap[nonCopperLayer].style.filter).toBe("")
  }

  drawer.dimCopper = false
  drawer.orderAndFadeLayers()
  for (const layer of layers) {
    expect(canvasMap[layer].style.filter).toBe("")
  }
})
