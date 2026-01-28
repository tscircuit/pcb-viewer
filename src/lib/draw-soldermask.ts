import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import {
  CircuitToCanvasDrawer,
  DEFAULT_PCB_COLOR_MAP,
  type PcbColorMap,
} from "circuit-to-canvas"
import color from "color"
import type { Matrix } from "transformation-matrix"
import colors from "./colors"
import type { Primitive } from "./types"

const HOVER_SOLDERMASK_COLOR_MAP: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: color(colors.board.pad_front).lighten(0.5).toString(),
    bottom: color(colors.board.pad_back).lighten(0.5).toString(),
    inner1: color(colors.board.copper.in1).lighten(0.5).toString(),
    inner2: color(colors.board.copper.in2).lighten(0.5).toString(),
    inner3: color(colors.board.copper.in3).lighten(0.5).toString(),
    inner4: color(colors.board.copper.in4).lighten(0.5).toString(),
    inner5: color(colors.board.copper.in5).lighten(0.5).toString(),
    inner6: color(colors.board.copper.in6).lighten(0.5).toString(),
  },
  soldermask: {
    ...DEFAULT_PCB_COLOR_MAP.soldermask,
    top: color(colors.board.soldermask.top).lighten(0.35).toString(),
    bottom: color(colors.board.soldermask.bottom).lighten(0.35).toString(),
  },
}

export function drawSoldermaskElementsForLayer({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  primitives,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  primitives?: Primitive[]
}) {
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.realToCanvasMat = realToCanvasMat
  drawer.drawElements(elements, { layers, drawSoldermask: true })

  if (!primitives) return

  const hoveredElementIds = new Set<string>()
  for (const primitive of primitives) {
    if (!(primitive.is_mouse_over || primitive.is_in_highlighted_net)) continue
    const element = primitive._element
    if (element?.type === "pcb_smtpad") {
      hoveredElementIds.add(element.pcb_smtpad_id)
    } else if (element?.type === "pcb_plated_hole") {
      hoveredElementIds.add(element.pcb_plated_hole_id)
    } else if (element?.type === "pcb_via") {
      hoveredElementIds.add(element.pcb_via_id)
    }
  }

  if (hoveredElementIds.size === 0) return

  const hoveredElements = elements.filter((element) => {
    if (element.type === "pcb_smtpad") {
      return hoveredElementIds.has(element.pcb_smtpad_id)
    }
    if (element.type === "pcb_plated_hole") {
      return hoveredElementIds.has(element.pcb_plated_hole_id)
    }
    if (element.type === "pcb_via") {
      return hoveredElementIds.has(element.pcb_via_id)
    }
    return false
  })

  if (hoveredElements.length === 0) return

  const hoverDrawer = new CircuitToCanvasDrawer(canvas)
  hoverDrawer.configure({ colorOverrides: HOVER_SOLDERMASK_COLOR_MAP })
  hoverDrawer.realToCanvasMat = realToCanvasMat
  hoverDrawer.drawElements(hoveredElements, { layers, drawSoldermask: true })
}
