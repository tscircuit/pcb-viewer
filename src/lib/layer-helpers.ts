
import { type LayerRef, all_layers } from "circuit-json"

/**
 * Generates a list of available layer names based on the total layer count
 * of the PCB.
 *
 * @param layerCount - The total number of layers on the board.
 * @returns An array of {@link LayerRef} strings.
 */
export const getAvailableLayers = (layerCount: number): LayerRef[] => {
  if (layerCount <= 0) {
    return []
  }
  if (layerCount === 1) {
    return ["top"]
  }
  if (layerCount === 2) {
    return ["top", "bottom"]
  }

  // For multi-layer boards (more than 2 layers), construct the list
  // including inner layers.
  const layers: LayerRef[] = ["top"]
  for (let i = 1; i <= layerCount - 2; i++) {
    layers.push(`inner${i}` as LayerRef)
  }
  layers.push("bottom")

  // Filter against all_layers to ensure we only return valid layer names,
  // although the logic above should already guarantee this.
  return layers.filter((l) => all_layers.includes(l))
}
