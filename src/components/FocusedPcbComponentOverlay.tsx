import type { AnyCircuitElement } from "circuit-json"
import { useEffect } from "react"
import { applyToPoint, type Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { getPcbComponentFocus } from "../lib/get-pcb-component-focus"
import { zIndexMap } from "../lib/util/z-index-map"

export const FocusedPcbComponentOverlay = ({
  focusRequest,
  elements,
  transform,
}: {
  focusRequest?: { pcbComponentId: string } | null
  elements: AnyCircuitElement[]
  transform?: Matrix
}) => {
  const componentId = focusRequest?.pcbComponentId
  const selectLayer = useGlobalStore((state) => state.selectLayer)
  const focus = componentId
    ? getPcbComponentFocus(elements, componentId, 1, 1)
    : undefined
  const layer = focus?.component.layer
  useEffect(() => {
    if (layer) selectLayer(layer)
  }, [focusRequest, layer, selectLayer])

  if (!focus || !transform) return null
  const { bounds } = focus
  const a = applyToPoint(transform, { x: bounds.minX, y: bounds.minY })
  const b = applyToPoint(transform, { x: bounds.maxX, y: bounds.maxY })
  return (
    <div
      data-focused-pcb-component-id={componentId}
      style={{
        position: "absolute",
        left: Math.min(a.x, b.x) - 4,
        top: Math.min(a.y, b.y) - 4,
        width: Math.abs(b.x - a.x) + 8,
        height: Math.abs(b.y - a.y) + 8,
        border: "2px solid #3399ff",
        borderRadius: 4,
        boxSizing: "border-box",
        pointerEvents: "none",
        zIndex: zIndexMap.elementOverlay,
      }}
    />
  )
}
