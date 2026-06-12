import { describe, expect, it } from "bun:test"
import { Drawer } from "../../src/lib/Drawer"

const createFakeCanvas = () =>
  ({
    style: {},
    getContext: () => ({ canvas: { width: 0, height: 0 } }),
  }) as unknown as HTMLCanvasElement

describe("Drawer.orderAndFadeLayers", () => {
  it("keeps every layer visible while lifting the selected top layer above other board layers", () => {
    const drawer = new Drawer({
      board: createFakeCanvas(),
      bottom: createFakeCanvas(),
      top: createFakeCanvas(),
      top_silkscreen: createFakeCanvas(),
      edge_cuts: createFakeCanvas(),
      drill: createFakeCanvas(),
    })

    drawer.foregroundLayer = "top"
    drawer.orderAndFadeLayers()

    expect(drawer.canvasLayerMap.bottom.style.opacity).toBe("1")
    expect(drawer.canvasLayerMap.bottom.style.visibility).toBe("visible")
    expect(drawer.canvasLayerMap.top.style.opacity).toBe("1")
    expect(drawer.canvasLayerMap.top.style.visibility).toBe("visible")
    expect(Number(drawer.canvasLayerMap.top.style.zIndex)).toBeGreaterThan(
      Number(drawer.canvasLayerMap.bottom.style.zIndex),
    )
    expect(Number(drawer.canvasLayerMap.top.style.zIndex)).toBeGreaterThan(
      Number(drawer.canvasLayerMap.top_silkscreen.style.zIndex),
    )
  })

  it("reorders the stack when switching to the bottom layer without hiding other layers", () => {
    const drawer = new Drawer({
      top: createFakeCanvas(),
      inner1: createFakeCanvas(),
      bottom: createFakeCanvas(),
      edge_cuts: createFakeCanvas(),
      drill: createFakeCanvas(),
    })

    drawer.foregroundLayer = "bottom"
    drawer.orderAndFadeLayers()

    expect(drawer.canvasLayerMap.top.style.opacity).toBe("1")
    expect(drawer.canvasLayerMap.top.style.visibility).toBe("visible")
    expect(drawer.canvasLayerMap.inner1.style.opacity).toBe("1")
    expect(drawer.canvasLayerMap.inner1.style.visibility).toBe("visible")
    expect(Number(drawer.canvasLayerMap.bottom.style.zIndex)).toBeGreaterThan(
      Number(drawer.canvasLayerMap.top.style.zIndex),
    )
    expect(Number(drawer.canvasLayerMap.bottom.style.zIndex)).toBeGreaterThan(
      Number(drawer.canvasLayerMap.inner1.style.zIndex),
    )
  })
})
