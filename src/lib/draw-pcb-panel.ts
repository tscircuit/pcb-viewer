import {
  findBoundsAndCenter,
  getBoardBounds,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPanel, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { Matrix } from "transformation-matrix"

export function isPcbPanelElement(
  element: AnyCircuitElement,
): element is PcbPanel {
  return element.type === "pcb_panel"
}

export function normalizePcbPanelElement(
  panel: PcbPanel,
  elements: AnyCircuitElement[],
): PcbPanel {
  const { width, height, center } = panel
  if (
    !center ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0
  ) {
    return panel
  }

  const isHalfSizeOffset =
    Math.abs(center.x - width / 2) < 1e-6 &&
    Math.abs(center.y - height / 2) < 1e-6
  if (!isHalfSizeOffset) return panel

  const panels = elements.filter(isPcbPanelElement)
  const boards = elements
    .filter((el) => el.type === "pcb_board")
    .filter(
      (board) =>
        board.pcb_panel_id === panel.pcb_panel_id ||
        (!board.pcb_panel_id && panels.length === 1),
    )
    .map((board) => {
      if (!board.outline?.length) return board
      const bounds = getBoardBounds(board)
      return { ...board, ...bounds }
    })

  if (boards.length === 0) return panel

  const boardBounds = findBoundsAndCenter(boards)
  const boardsMinX = boardBounds.center.x - boardBounds.width / 2
  const boardsMaxX = boardBounds.center.x + boardBounds.width / 2
  const boardsMinY = boardBounds.center.y - boardBounds.height / 2
  const boardsMaxY = boardBounds.center.y + boardBounds.height / 2

  const panelMinX = center.x - width / 2
  const panelMaxX = center.x + width / 2
  const panelMinY = center.y - height / 2
  const panelMaxY = center.y + height / 2

  const fitsCurrentPanel =
    boardsMinX >= panelMinX - 1e-6 &&
    boardsMaxX <= panelMaxX + 1e-6 &&
    boardsMinY >= panelMinY - 1e-6 &&
    boardsMaxY <= panelMaxY + 1e-6

  if (fitsCurrentPanel) return panel

  const fitsOriginCenteredPanel =
    boardsMinX >= -width / 2 - 1e-6 &&
    boardsMaxX <= width / 2 + 1e-6 &&
    boardsMinY >= -height / 2 - 1e-6 &&
    boardsMaxY <= height / 2 + 1e-6

  if (fitsOriginCenteredPanel) {
    return {
      ...panel,
      center: { x: 0, y: 0 },
    }
  }

  return panel
}

export function drawPcbPanelElements({
  canvas,
  elements,
  layers,
  realToCanvasMat,
  drawSoldermask,
}: {
  canvas: HTMLCanvasElement
  elements: AnyCircuitElement[]
  layers: PcbRenderLayer[]
  realToCanvasMat: Matrix
  drawSoldermask?: boolean
}) {
  const drawer = new CircuitToCanvasDrawer(canvas)

  drawer.realToCanvasMat = realToCanvasMat

  const pcbPanelElements = elements
    .filter(isPcbPanelElement)
    .map((panel) => normalizePcbPanelElement(panel, elements))

  for (const element of pcbPanelElements) {
    drawer.drawElements([element], { layers })
  }
}
