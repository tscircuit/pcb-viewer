import { describe, expect, it } from "bun:test"
import { LayerImageCache } from "../../src/lib/rendering/image-cache"
import type { LayerRenderRequest } from "../../src/lib/rendering/types"

const request = (key: string, layer = "top", x = 0): LayerRenderRequest => ({
  key,
  layer,
  width: 10,
  height: 10,
  viewBox: { x, y: 0, width: 10, height: 10 },
  transform: { a: 1, b: 0, c: 0, d: -1, e: -x, f: 10 },
})
const bitmap = () => {
  let closed = 0
  return {
    image: {
      close() {
        closed++
      },
    } as ImageBitmap,
    get closed() {
      return closed
    },
  }
}

describe("layer image cache", () => {
  it("evicts old regions but preserves the latest frame of every layer", () => {
    const cache = new LayerImageCache(400)
    const old = bitmap(),
      current = bitmap(),
      bottom = bitmap()
    cache.put(request("old"), old.image)
    cache.put(request("bottom", "bottom"), bottom.image)
    cache.put(request("current"), current.image)
    expect(old.closed).toBe(1)
    expect(bottom.closed).toBe(0)
    expect(current.closed).toBe(0)
    cache.clear()
    expect(bottom.closed).toBe(1)
    expect(current.closed).toBe(1)
  })
  it("chooses a cached region that actually covers the new viewport", () => {
    const cache = new LayerImageCache(10000)
    cache.put(request("near"), bitmap().image)
    cache.put(request("far", "top", 100), bitmap().image)
    expect(
      cache.best("top", { x: 1, y: 1, width: 5, height: 5 }, 1)?.request.key,
    ).toBe("near")
    expect(
      cache.best("top", { x: 30, y: 30, width: 5, height: 5 }, 1),
    ).toBeUndefined()
  })
  it("keeps stale previews until each layer's replacement arrives", () => {
    const cache = new LayerImageCache(10000)
    const oldTop = bitmap(),
      oldBottom = bitmap()
    cache.put(request("top"), oldTop.image)
    cache.put(request("bottom", "bottom"), oldBottom.image)
    cache.invalidate()
    expect(cache.has("top")).toBe(false)
    expect(
      cache.best("top", { x: 0, y: 0, width: 10, height: 10 }, 1),
    ).toBeDefined()
    cache.put(request("top"), bitmap().image)
    expect(cache.has("top")).toBe(true)
    expect(oldTop.closed).toBe(1)
    expect(oldBottom.closed).toBe(0)
    cache.clear()
  })
  it("closes replaced bitmaps exactly once", () => {
    const cache = new LayerImageCache(1000),
      old = bitmap(),
      next = bitmap()
    cache.put(request("same"), old.image)
    cache.put(request("same"), next.image)
    expect(old.closed).toBe(1)
    cache.clear()
    expect(old.closed).toBe(1)
    expect(next.closed).toBe(1)
  })
})
