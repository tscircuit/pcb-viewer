import type { ReactElement } from "react"
import { renderUsbPairBoard } from "../../../../tests/fixtures/phase-skew/usb-pair-board"
import { PCBViewer } from "../../../PCBViewer"

/** Rendered once, so the viewer doesn't get a new board on every render. */
const circuitJson = renderUsbPairBoard()

/** A USB pair matched end to end, whose traces are out of phase between the detours. */
export default function DifferentialPairPhaseSkew(): ReactElement {
  return <PCBViewer height={600} circuitJson={circuitJson} />
}
