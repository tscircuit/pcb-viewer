import {
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
  CircuitToCanvasDrawer,
} from "circuit-to-canvas"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import color from "color"

// Create color map with lighter copper colors for hover effect
const HOVER_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
  },
}

export function isPcbSmtPad(element: AnyCircuitElement) {
  return element.type === "pcb_smtpad"
}

export function drawPcbSmtPadElementsForLayer(
  canvas: HTMLCanvasElement,
  elements: AnyCircuitElement[],
  layers: PcbRenderLayer[],
  realToCanvasMat: Matrix,
  hoveredElementIds?: Set<string>,
) {
  const smtPadElements = elements.filter(isPcbSmtPad)

  if (smtPadElements.length === 0) return

  // Draw non-hovered SMT pads with default colors
  if (!hoveredElementIds || hoveredElementIds.size === 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(smtPadElements, { layers })
    return
  }

  // Separate hovered and non-hovered elements
  const hoveredElements = smtPadElements.filter((element) =>
    hoveredElementIds.has(element.pcb_smtpad_id),
  )
  const nonHoveredElements = smtPadElements.filter(
    (element) => !hoveredElementIds.has((element as any).pcb_smtpad_id),
  )

  // Draw non-hovered elements with default colors
  if (nonHoveredElements.length > 0) {
    const drawer = new CircuitToCanvasDrawer(canvas)
    drawer.realToCanvasMat = realToCanvasMat
    drawer.drawElements(nonHoveredElements, { layers })
  }

  // Draw hovered elements with lighter colors
  if (hoveredElements.length > 0) {
    const hoverDrawer = new CircuitToCanvasDrawer(canvas)
    hoverDrawer.configure({ colorOverrides: HOVER_COLOR_MAP })
    hoverDrawer.realToCanvasMat = realToCanvasMat
    hoverDrawer.drawElements(hoveredElements, { layers })
  }
}
