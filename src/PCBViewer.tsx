import { applyEditEvents } from "@tscircuit/core"
import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, SourceTrace } from "circuit-json"
import { ContextProviders } from "./components/ContextProviders"
import type { StateProps } from "./global-store"
import type { GraphicsObject } from "graphics-debug"
import { ToastContainer } from "lib/toast"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure } from "react-use"
import { compose, scale, translate } from "transformation-matrix"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"
import type { BoundsSelection } from "./components/DimensionOverlay"
import type { ManualEditEvent } from "@tscircuit/props"
import { zIndexMap } from "lib/util/z-index-map"
import { calculateCircuitJsonKey } from "lib/calculate-circuit-json-key"
import { calculateBoardSizeKey } from "lib/calculate-board-size-key"


const defaultTransform = compose(translate(400, 300), scale(40, -40))


type Props = {
  circuitJson?: AnyCircuitElement[]
  height?: number
  allowEditing?: boolean
  editEvents?: ManualEditEvent[]
  initialState?: Partial<StateProps>
  onEditEventsChanged?: (editEvents: ManualEditEvent[]) => void
  onBoundsSelected?: (bounds: BoundsSelection) => void
  focusOnHover?: boolean
  clickToInteractEnabled?: boolean
  debugGraphics?: GraphicsObject | null
  disablePcbGroups?: boolean
}


export const PCBViewer = ({
  circuitJson,
