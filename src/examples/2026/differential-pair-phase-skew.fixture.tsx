import type { AnyCircuitElement } from "circuit-json"
import { lazy, Suspense } from "react"
import { PCBViewer } from "../../PCBViewer"
import { getTuningBumpCircuit } from "./differential-pair-phase-skew/tuning-bump"

const initialState = { is_showing_differential_pair_phase_skew: true }
const boardsUrl =
  "https://raw.githubusercontent.com/tscircuit/pcb-viewer/a4f6c5143a95ac014c2d417ea135c00a6085fee4/src/examples/2026/differential-pair-phase-skew"

function sampleBoard(name: string) {
  const Board = lazy(async () => {
    const response = await fetch(`${boardsUrl}/${name}.circuit.json`)
    if (!response.ok)
      throw new Error(`Unable to load ${name} (${response.status})`)
    const circuitJson: AnyCircuitElement[] = await response.json()
    return {
      default: () => (
        <PCBViewer circuitJson={circuitJson} initialState={initialState} />
      ),
    }
  })
  return () => (
    <Suspense fallback="Loading board…">
      <Board />
    </Suspense>
  )
}

export default {
  "Tuning bump": () => (
    <PCBViewer
      circuitJson={getTuningBumpCircuit()}
      initialState={initialState}
    />
  ),
  "KiCad forum": sampleBoard("forum-example"),
  "AM3352 DDR Track A": sampleBoard("am3352-ddr-track-a"),
}
