import { getBoundsOfPcbElements } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, LayerRef, PcbComponent } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { createTransformForBounds } from "./error-preview"

export type PcbComponentFocusRequest = {
  pcbComponentId: string
  requestId: number
}

export type PcbComponentFocusTarget = {
  component: PcbComponent
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  layer: LayerRef
}

export type AppliedPcbComponentFocusRequest = {
  requestId: number
  circuitJsonKey: string
}

export const PCB_COMPONENT_FOCUS_PADDING_MM = 1.75
export const PCB_COMPONENT_FOCUS_MAX_SCALE = 100

const hasFiniteBounds = (bounds: PcbComponentFocusTarget["bounds"]) =>
  Object.values(bounds).every(Number.isFinite)

export const getPcbComponentFocusTarget = (
  elements: AnyCircuitElement[],
  pcbComponentId: string,
): PcbComponentFocusTarget | null => {
  const component = elements.find(
    (element): element is PcbComponent =>
      element.type === "pcb_component" &&
      element.pcb_component_id === pcbComponentId,
  )
  if (!component) return null

  const footprintElements = elements.filter(
    (element) =>
      element.type.startsWith("pcb_") &&
      ((element.type === "pcb_component" &&
        element.pcb_component_id === pcbComponentId) ||
        ("pcb_component_id" in element &&
          element.pcb_component_id === pcbComponentId)),
  )
  const bounds = getBoundsOfPcbElements(footprintElements)
  if (!hasFiniteBounds(bounds)) return null

  const childLayer = footprintElements.find(
    (element) => "layer" in element && typeof element.layer === "string",
  ) as { layer?: LayerRef } | undefined

  return {
    component,
    bounds,
    layer: component.layer ?? childLayer?.layer ?? "top",
  }
}

export const createPcbComponentFocusTransform = ({
  target,
  width,
  height,
}: {
  target: PcbComponentFocusTarget
  width: number
  height: number
}): Matrix =>
  createTransformForBounds({
    bounds: target.bounds,
    width,
    height,
    padding: PCB_COMPONENT_FOCUS_PADDING_MM,
    maxScale: PCB_COMPONENT_FOCUS_MAX_SCALE,
  })

export const shouldHandlePcbComponentFocusRequest = (
  request: PcbComponentFocusRequest | undefined,
  lastHandledRequestId: number | null,
) => Boolean(request && request.requestId !== lastHandledRequestId)

export const isPcbComponentFocusAppliedToCircuit = ({
  request,
  appliedRequest,
  circuitJsonKey,
}: {
  request: PcbComponentFocusRequest | undefined
  appliedRequest: AppliedPcbComponentFocusRequest | null
  circuitJsonKey: string
}) =>
  Boolean(
    request &&
      appliedRequest &&
      request.requestId === appliedRequest.requestId &&
      circuitJsonKey === appliedRequest.circuitJsonKey,
  )

export const shouldResetBoardTransform = ({
  initialRenderCompleted,
  boardSizeChanged,
  hasValidFocusRequest,
}: {
  initialRenderCompleted: boolean
  boardSizeChanged: boolean
  hasValidFocusRequest: boolean
}) =>
  !hasValidFocusRequest &&
  (!initialRenderCompleted || (initialRenderCompleted && boardSizeChanged))
