import type { AnyCircuitElement, LayerRef, PcbRenderLayer } from "circuit-json"

export const getCopperLayerRefs = (numLayers = 2): LayerRef[] => {
  const layerCount = Math.max(2, Math.min(10, Math.floor(numLayers)))
  return [
    "top",
    ...Array.from(
      { length: layerCount - 2 },
      (_, index) => `inner${index + 1}` as LayerRef,
    ),
    "bottom",
  ]
}

export const getCopperLayerRefsFromElements = (
  elements: AnyCircuitElement[],
): LayerRef[] => {
  const board = elements.find((element) => element.type === "pcb_board")
  return getCopperLayerRefs(board?.num_layers ?? 2)
}

export const getCopperRenderLayer = (layer: LayerRef): PcbRenderLayer =>
  `${layer}_copper` as PcbRenderLayer

export const normalizeCopperRenderLayers = (
  layers: PcbRenderLayer[],
): LayerRef[] =>
  layers.map((layer) =>
    layer.endsWith("_copper")
      ? (layer.slice(0, -"_copper".length) as LayerRef)
      : (layer as LayerRef),
  )

export const getOrderedCanvasLayers = (
  elements: AnyCircuitElement[],
): string[] => {
  const innerLayers = getCopperLayerRefsFromElements(elements).filter((layer) =>
    layer.startsWith("inner"),
  )

  return [
    "board",
    "bottom",
    "soldermask_bottom",
    "bottom_silkscreen",
    "top",
    "soldermask_top",
    "soldermask_with_copper_bottom",
    "soldermask_with_copper_top",
    "top_fabrication",
    "bottom_fabrication",
    ...innerLayers,
    "drill",
    "edge_cuts",
    "bottom_notes",
    "top_notes",
    "top_silkscreen",
    "top_courtyard",
    "bottom_courtyard",
    "other",
  ]
}
