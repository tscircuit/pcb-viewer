import { createContext, useContext } from "react"

export type RenderingEngine = "canvas" | "webgpu"

export const RenderingEngineContext = createContext<{
  renderer: RenderingEngine
  setRenderer: (renderer: RenderingEngine) => void
} | null>(null)

export const useRenderingEngine = () => useContext(RenderingEngineContext)
