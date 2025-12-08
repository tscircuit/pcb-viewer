import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { ConnectivityMapResult } from "../../workers/connectivityWorker"

type Pending = {
  resolve: (value: ConnectivityMapResult) => void
  reject: (reason?: unknown) => void
}

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, Pending>()

const ensureWorker = () => {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null
  if (!worker) {
    worker = new Worker(
      new URL("../../workers/connectivityWorker.ts", import.meta.url),
      { type: "module" },
    )
    worker.onmessage = (
      event: MessageEvent<{
        id: number
        ok: boolean
        result?: ConnectivityMapResult
        error?: string
      }>,
    ) => {
      const { id, ok, result, error } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (ok && result) {
        entry.resolve(result)
      } else {
        entry.reject(new Error(error || "connectivity worker error"))
      }
    }
    worker.onerror = (err) => {
      pending.forEach((entry) => entry.reject(err))
      pending.clear()
    }
  }
  return worker
}

export const buildConnectivityMapAsync = (
  elements: AnyCircuitElement[],
): Promise<ConnectivityMapResult> => {
  const w = ensureWorker()
  if (!w) {
    return Promise.resolve(getFullConnectivityMapFromCircuitJson(elements || []))
  }
  const id = ++seq
  return new Promise<ConnectivityMapResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, elements })
  })
}
