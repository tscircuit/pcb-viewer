import type { LayerRef } from "circuit-json"

const COPPER_LAYERS: LayerRef[] = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "bottom",
]

export const getAvailableCopperLayers = (
  layerCount?: number | null,
): LayerRef[] => {
  if (layerCount == null) {
    return COPPER_LAYERS.slice()
  }

  const totalLayers = Math.max(1, Math.min(layerCount, COPPER_LAYERS.length))

  if (totalLayers === 1) {
    return ["top"]
  }

  const innerLayerCount = Math.min(totalLayers - 2, COPPER_LAYERS.length - 2)
  const innerLayers = COPPER_LAYERS.slice(1, 1 + innerLayerCount)

  return ["top", ...innerLayers, "bottom"]
}

export const sanitizeLayerSelection = (
  layer: LayerRef,
  availableCopperLayers: readonly LayerRef[],
): LayerRef => {
  return availableCopperLayers.includes(layer)
    ? layer
    : (availableCopperLayers[0] ?? ("top" as LayerRef))
}

export const isCopperLayer = (layer: string): layer is LayerRef => {
  const normalized = layer.replace(/-/g, "")
  return COPPER_LAYERS.includes(normalized as LayerRef)
}
