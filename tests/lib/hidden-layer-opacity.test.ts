import { describe, expect, it } from "bun:test"
import { Drawer } from "../../src/lib/Drawer"

const layers = [
  "board",
  "drill",
  "edge_cuts",
  "other",
  "top",
  "bottom",
  ...Array.from({ length: 6 }, (_, i) => `inner${i + 1}`),
  "top_silkscreen",
  "bottom_silkscreen",
  "top_notes",
  "bottom_notes",
  "soldermask_with_copper_top",
  "soldermask_with_copper_bottom",
]

const createDrawer = () =>
  new Drawer(
    Object.fromEntries(
      layers.map((layer) => [
        layer,
        {
          style: {},
          getContext: () => ({}),
        } as unknown as HTMLCanvasElement,
      ]),
    ),
  )

describe("hidden layer visibility", () => {
  it("applies every opacity choice to all seven inactive copper layers", () => {
    const drawer = createDrawer()
    drawer.foregroundLayer = "inner3"
    for (const opacity of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
      drawer.hiddenLayerOpacity = opacity
      drawer.orderAndFadeLayers()
      for (const layer of [
        "top",
        "bottom",
        "inner1",
        "inner2",
        "inner4",
        "inner5",
        "inner6",
      ]) {
        expect(drawer.getLayerOpacity(layer)).toBe(opacity)
        expect(drawer.canvasLayerMap[layer].style.opacity).toBe(String(opacity))
        expect(drawer.canvasLayerMap[layer].style.display).toBe(
          opacity === 0 ? "none" : "",
        )
      }
      expect(drawer.canvasLayerMap.inner3.style.opacity).toBe("1")
      expect(drawer.canvasLayerMap.inner3.style.display).toBe("")
    }
  })

  it("restores a newly selected layer when the others are hidden", () => {
    const drawer = createDrawer()
    drawer.hiddenLayerOpacity = 0
    drawer.orderAndFadeLayers()
    drawer.foregroundLayer = "bottom"
    drawer.orderAndFadeLayers()
    expect(drawer.canvasLayerMap.top.style.display).toBe("none")
    expect(drawer.canvasLayerMap.bottom.style.display).toBe("")
    expect(drawer.canvasLayerMap.top_silkscreen.style.display).toBe("none")
    expect(drawer.canvasLayerMap.bottom_silkscreen.style.opacity).toBe("1")
    for (const layer of ["board", "drill", "edge_cuts", "other"]) {
      expect(drawer.canvasLayerMap[layer].style.display).toBe("")
    }
  })
})
