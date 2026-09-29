import type { PcbComponent } from "circuit-json"

export interface PointLike {
  x: number
  y: number
}

const isInsideOf = (
  component: Pick<PcbComponent, "center" | "width" | "height">,
  point: PointLike,
  padding = 0,
): boolean => {
  const halfWidth = component.width / 2
  const halfHeight = component.height / 2

  const left = component.center.x - halfWidth - padding
  const right = component.center.x + halfWidth + padding
  const top = component.center.y - halfHeight - padding
  const bottom = component.center.y + halfHeight + padding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
}

const areaOf = (
  component: Pick<PcbComponent, "width" | "height">,
): number => component.width * component.height

/**
 * Returns the smallest-area component containing the point (ties keep soup
 * order), so dragging overlapping footprints grabs the most specific one
 * instead of whichever comes first in the soup.
 */
export const findSmallestComponentAt = <T extends Pick<PcbComponent, "center" | "width" | "height">>(
  components: T[],
  point: PointLike,
  padding = 0,
): T | null => {
  let best: T | null = null
  for (const component of components) {
    if (!isInsideOf(component, point, padding)) continue
    if (best === null || areaOf(component) < areaOf(best)) {
      best = component
    }
  }
  return best
}
