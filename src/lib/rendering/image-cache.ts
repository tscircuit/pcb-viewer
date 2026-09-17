import {
  closeImage,
  type LayerRenderRequest,
  type RenderImage,
  type ViewBox,
} from "./types"

type Entry = { request: LayerRenderRequest; image: RenderImage; bytes: number }

export class LayerImageCache {
  private entries = new Map<string, Entry>()
  private stale = new Set<string>()
  private bytes = 0
  private latest = new Map<string, string>()
  constructor(private maxBytes: number) {}

  has(key: string) {
    return this.entries.has(key) && !this.stale.has(key)
  }

  invalidate() {
    this.stale = new Set(this.entries.keys())
  }

  put(request: LayerRenderRequest, image: RenderImage) {
    for (const [key, entry] of this.entries) {
      if (entry.request.layer === request.layer && this.stale.has(key))
        this.remove(key)
    }
    this.remove(request.key)
    const bytes = request.width * request.height * 4
    this.entries.set(request.key, { request, image, bytes })
    this.bytes += bytes
    this.latest.set(request.layer, request.key)
    // Always retain a frame for each layer. Evicting the only frame would make
    // that layer disappear on the next pan. The active layer set is a soft floor.
    for (const [key, entry] of this.entries) {
      if (this.bytes <= this.maxBytes) break
      if (this.latest.get(entry.request.layer) !== key) this.remove(key)
    }
  }

  best(layer: string, view: ViewBox, zoom: number) {
    let best: Entry | undefined
    let bestScore = -Infinity
    for (const entry of this.entries.values()) {
      if (entry.request.layer !== layer) continue
      const box = entry.request.viewBox
      const overlap =
        Math.max(
          0,
          Math.min(box.x + box.width, view.x + view.width) -
            Math.max(box.x, view.x),
        ) *
        Math.max(
          0,
          Math.min(box.y + box.height, view.y + view.height) -
            Math.max(box.y, view.y),
        )
      if (!overlap) continue
      const score =
        (this.stale.has(entry.request.key) ? -1000 : 0) +
        (100 * overlap) / (view.width * view.height) -
        Math.abs(Math.log2(entry.request.transform.a / zoom))
      if (score >= bestScore) {
        best = entry
        bestScore = score
      }
    }
    if (best) {
      this.entries.delete(best.request.key)
      this.entries.set(best.request.key, best)
    }
    return best
  }

  private remove(key: string) {
    const entry = this.entries.get(key)
    if (!entry) return
    this.entries.delete(key)
    this.stale.delete(key)
    this.bytes -= entry.bytes
    closeImage(entry.image)
  }

  clear() {
    for (const key of this.entries.keys()) this.remove(key)
    this.latest.clear()
  }
}
