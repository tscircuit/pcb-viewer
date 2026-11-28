import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { PCBViewer } from "../../../../src/PCBViewer"

const boardUrl = new URL("./am3352-ddr-track-a.circuit.json", import.meta.url)

export default function Am3352DdrTrackAFixture() {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(
    null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(boardUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json() as Promise<AnyCircuitElement[]>
      })
      .then(setCircuitJson)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(String(error))
      })
    return () => controller.abort()
  }, [])

  if (loadError) return <p role="alert">Could not load AM3352: {loadError}</p>
  if (!circuitJson) return <output>Loading the AM3352 board…</output>
  return (
    <PCBViewer
      circuitJson={circuitJson}
      initialState={{ is_showing_differential_pair_phase_skew: true }}
    />
  )
}
