import type { AnyCircuitElement } from "circuit-json"
import { useEffect } from "react"
import {
  type Matrix,
  applyToPoint,
  compose,
  rotateDEG,
} from "transformation-matrix"
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
  const { outline } = focus
  const center = applyToPoint(transform, outline.center)
  const rotatedTransform = compose(transform, rotateDEG(outline.rotation ?? 0))
  const width =
    outline.width * Math.hypot(rotatedTransform.a, rotatedTransform.b) + 8
  const height =
    outline.height * Math.hypot(rotatedTransform.c, rotatedTransform.d) + 8
  const rotation = Math.atan2(rotatedTransform.b, rotatedTransform.a)
  return (
    <div
      data-pcb-focus-viewport
      style={{
        position: "absolute",
        inset: 0,
        overflow: "clip",
        pointerEvents: "none",
        zIndex: zIndexMap.elementOverlay,
      }}
    >
      <div
        data-focused-pcb-component-id={componentId}
        style={{
          position: "absolute",
          left: center.x - width / 2,
          top: center.y - height / 2,
          width,
          height,
          transform: `rotate(${rotation}rad)`,
          transformOrigin: "center",
          border: "2px solid #3399ff",
          borderRadius: 4,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
