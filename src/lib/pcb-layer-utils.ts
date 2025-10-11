import type { LayerRef } from "circuit-json"

const COPPER_LAYER_NAMES = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "bottom",
] as const

const INNER_LAYER_NAMES = [
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
] as const

export const COPPER_LAYER_SET = new Set<string>(COPPER_LAYER_NAMES)

export const deriveAvailableCopperLayers = (
  layerCount?: number | null,
): LayerRef[] => {
  if (layerCount == null) {
    return COPPER_LAYER_NAMES.map((layer) => layer as LayerRef)
  }

  if (layerCount <= 1) {
    return ["top"] as LayerRef[]
  }

  const innerLayerCount = Math.max(
    0,
    Math.min(layerCount - 2, INNER_LAYER_NAMES.length),
  )
  const innerLayers = INNER_LAYER_NAMES.slice(0, innerLayerCount).map(
    (layer) => layer as LayerRef,
  )

  const copperLayers: LayerRef[] = ["top", ...innerLayers]

  if (layerCount >= 2) {
    copperLayers.push("bottom")
  }

  return copperLayers
}

export const filterLayersForBoard = (
  allLayers: readonly string[],
  availableCopperLayers: readonly LayerRef[],
) => {
  const availableCopperLayerSet = new Set(availableCopperLayers)

  return allLayers
    .map((layer) => layer.replace(/-/g, ""))
    .filter((layer) => {
      if (COPPER_LAYER_SET.has(layer)) {
        return availableCopperLayerSet.has(layer as LayerRef)
      }

      return true
    })
}

export const ensureLayerIsAvailable = (
  layer: LayerRef,
  availableCopperLayers: readonly LayerRef[],
): LayerRef => {
  if (COPPER_LAYER_SET.has(layer) && !availableCopperLayers.includes(layer)) {
    return availableCopperLayers[0] ?? ("top" as LayerRef)
  }

  return layer
}
