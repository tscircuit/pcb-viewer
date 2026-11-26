import type { AnyCircuitElement } from "circuit-json"
import { useWindowSize } from "react-use"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./am3352-ddr-track-a.circuit.json"

// `tsci clone 0hmX/am3352-ddr-track-a-local-dfm-wip-20261007` (v0.0.17), rendered with core 0.0.2483
// after adding <differentialpair> DDR_DQS_PAIR0, DDR_DQS_PAIR1 and DDR_CK_PAIR on the existing traces.
export default function Am3352DdrTrackA() {
  const { height } = useWindowSize(0, 600)
  return (
    <PCBViewer
      circuitJson={circuitJson as AnyCircuitElement[]}
      height={height}
      renderer="canvas"
      initialPairSkewBusId="source_bus_1"
    />
  )
}
