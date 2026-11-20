import type { AnyCircuitElement } from "circuit-json"
import { getCopperLayerRefsFromElements } from "lib/copper-layers"
import {
  type BitmapShort,
  type CheckShortsModule,
  loadCheckShortsModule,
} from "./load-check-shorts-module"

export const checkForShorts = async (
  circuitJson: AnyCircuitElement[],
  options: { loadModule?: () => Promise<CheckShortsModule> } = {},
): Promise<BitmapShort[]> => {
  const { findBitmapShorts } = await (
    options.loadModule ?? loadCheckShortsModule
  )()
  const shorts: BitmapShort[] = []

  for (const layer of getCopperLayerRefsFromElements(circuitJson)) {
    // Rasterizing a layer blocks the thread, so let the browser paint between
    // layers.
    await new Promise((resolve) => setTimeout(resolve, 0))
    shorts.push(
      ...(await findBitmapShorts(circuitJson, { mode: "pcb", layer })),
    )
  }

  return shorts
}
