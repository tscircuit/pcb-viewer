import type { AnyCircuitElement, PcbComponent } from "circuit-json"

export const isInsideOfPcbComponent = (
  pcb_component: PcbComponent,
  point: { x: number; y: number },
  padding = 0,
) => {
  const halfWidth = pcb_component.width / 2
  const halfHeight = pcb_component.height / 2

  const left = pcb_component.center.x - halfWidth - padding
  const right = pcb_component.center.x + halfWidth + padding
  const top = pcb_component.center.y - halfHeight - padding
  const bottom = pcb_component.center.y + halfHeight + padding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
}

/**
 * When multiple pcb_components overlap the click point, prefer the one with
 * the smallest bounding-box area so small parts nested under larger packages
 * can still be grabbed.
 */
export const findSmallestPcbComponentAt = (
  soup: AnyCircuitElement[],
  point: { x: number; y: number },
  padding = 0,
): PcbComponent | null => {
  let best: PcbComponent | null = null
  let bestArea = Number.POSITIVE_INFINITY

  for (const element of soup) {
    if (element.type !== "pcb_component") continue
    if (!isInsideOfPcbComponent(element, point, padding)) continue

    const area = element.width * element.height
    if (area < bestArea) {
      bestArea = area
      best = element
    }
  }

  return best
}
