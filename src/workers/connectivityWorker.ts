import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

export type ConnectivityMapResult = ReturnType<
  typeof getFullConnectivityMapFromCircuitJson
>

const ctx = self as unknown as Worker

ctx.onmessage = (event: MessageEvent<{ id: number; elements: AnyCircuitElement[] }>) => {
  const { id, elements } = event.data
  try {
    const result = getFullConnectivityMapFromCircuitJson(elements || [])
    ctx.postMessage({ id, ok: true, result })
  } catch (error) {
    ctx.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export {}
