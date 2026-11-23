import type { ComponentProps, ReactElement } from "react"
import { PCBViewer } from "../../../PCBViewer"

export function PhaseSkewViewer({
  circuitJson,
  renderer = "canvas",
  phaseSkewColors,
}: Pick<
  ComponentProps<typeof PCBViewer>,
  "circuitJson" | "renderer" | "phaseSkewColors"
>): ReactElement {
  return (
    <PCBViewer
      circuitJson={circuitJson}
      renderer={renderer}
      phaseSkewColors={phaseSkewColors}
      height={480}
      initialState={{ is_showing_differential_pair_phase_skew: true }}
    />
  )
}
