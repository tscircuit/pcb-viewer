import type { AnyCircuitElement, LayerRef } from "circuit-json"

export type BitmapShort = {
  mode: "pcb" | "gerber"
  layer: LayerRef
  firstConnectivityKey: string
  secondConnectivityKey: string
  pixelCount: number
  center: { x: number; y: number }
  firstOwnerLabels: string[]
  secondOwnerLabels: string[]
}

/** The part of @tscircuit/check-shorts that the viewer uses. */
export type CheckShortsModule = {
  findBitmapShorts: (
    circuitJson: AnyCircuitElement[],
    options?: { mode?: "pcb" | "gerber"; layer?: LayerRef },
  ) => Promise<BitmapShort[]>
}

/**
 * The browser entry of @tscircuit/check-shorts. The package's main entry
 * imports Node-only dependencies (resvg, node:zlib) and cannot load here.
 */
export const CHECK_SHORTS_MODULE_URL =
  "https://jscdn.tscircuit.com/@tscircuit/check-shorts/latest/dist/browser.js/+esm"

let checkShortsModulePromise: Promise<CheckShortsModule> | null = null

/**
 * Fetches the short checker from the CDN the first time it is needed, so it
 * adds nothing to the viewer bundle for users who never run the check.
 */
export const loadCheckShortsModule = (): Promise<CheckShortsModule> => {
  checkShortsModulePromise ??= (
    import(
      /* @vite-ignore */ /* webpackIgnore: true */ CHECK_SHORTS_MODULE_URL
    ) as Promise<CheckShortsModule>
  ).catch((error) => {
    // Don't cache a failed load: the next attempt may have a network again.
    checkShortsModulePromise = null
    throw error
  })
  return checkShortsModulePromise
}
