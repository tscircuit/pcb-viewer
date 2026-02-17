import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { useGlobalStore } from "../global-store"
import { useEffect, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, inverse } from "transformation-matrix"

type DragHandle =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

interface DragState {
  handle: DragHandle
  dragStartWorld: { x: number; y: number }
  originalWidth: number
  originalHeight: number
  originalCenter: { x: number; y: number }
}

interface BoardSizeEdit {
  width: number
  height: number
  center: { x: number; y: number }
}

interface Props {
  children: React.ReactNode
  transform?: Matrix
  elements: AnyCircuitElement[]
  cancelPanDrag: () => void
  onBoardSizeEdit?: (edit: BoardSizeEdit) => void
}

const HANDLE_SIZE = 8
const HANDLE_HALF = HANDLE_SIZE / 2
const MIN_BOARD_SIZE_MM = 1

const handleCursors: Record<DragHandle, string> = {
  top: "ns-resize",
  bottom: "ns-resize",
  left: "ew-resize",
  right: "ew-resize",
  "top-left": "nwse-resize",
  "top-right": "nesw-resize",
  "bottom-left": "nesw-resize",
  "bottom-right": "nwse-resize",
}

export const EditBoardOverlay = ({
  children,
  transform,
  elements,
  cancelPanDrag,
  onBoardSizeEdit,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const in_edit_board_size_mode = useGlobalStore(
    (s) => s.in_edit_board_size_mode,
  )
  const setIsEditingBoardSize = useGlobalStore((s) => s.setIsEditingBoardSize)

  const disabled = !in_edit_board_size_mode

  const pcbBoard = elements.find((e): e is PcbBoard => e.type === "pcb_board")

  // When dragging, attach window-level mouse listeners so we don't lose the drag
  useEffect(() => {
    if (!dragState || !transform) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !pcbBoard) return

      const rect = containerRef.current.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const worldPoint = applyToPoint(inverse(transform), {
        x: screenX,
        y: screenY,
      })

      const dx = worldPoint.x - dragState.dragStartWorld.x
      const dy = worldPoint.y - dragState.dragStartWorld.y
      const { handle, originalWidth, originalHeight, originalCenter } =
        dragState

      let newWidth = originalWidth
      let newHeight = originalHeight
      let newCenterX = originalCenter.x
      let newCenterY = originalCenter.y

      if (
        handle === "right" ||
        handle === "top-right" ||
        handle === "bottom-right"
      ) {
        const widthDelta = dx
        newWidth = Math.max(MIN_BOARD_SIZE_MM, originalWidth + widthDelta)
        newCenterX = originalCenter.x + (newWidth - originalWidth) / 2
      }
      if (
        handle === "left" ||
        handle === "top-left" ||
        handle === "bottom-left"
      ) {
        const widthDelta = -dx
        newWidth = Math.max(MIN_BOARD_SIZE_MM, originalWidth + widthDelta)
        newCenterX = originalCenter.x - (newWidth - originalWidth) / 2
      }
      if (handle === "top" || handle === "top-left" || handle === "top-right") {
        const heightDelta = dy
        newHeight = Math.max(MIN_BOARD_SIZE_MM, originalHeight + heightDelta)
        newCenterY = originalCenter.y + (newHeight - originalHeight) / 2
      }
      if (
        handle === "bottom" ||
        handle === "bottom-left" ||
        handle === "bottom-right"
      ) {
        const heightDelta = -dy
        newHeight = Math.max(MIN_BOARD_SIZE_MM, originalHeight + heightDelta)
        newCenterY = originalCenter.y - (newHeight - originalHeight) / 2
      }

      onBoardSizeEdit?.({
        width: newWidth,
        height: newHeight,
        center: { x: newCenterX, y: newCenterY },
      })
    }

    const handleMouseUp = () => {
      setIsEditingBoardSize(false)
      setDragState(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState, transform, pcbBoard, onBoardSizeEdit, setIsEditingBoardSize])

  const startDrag = (e: React.MouseEvent, handle: DragHandle) => {
    if (!transform || !pcbBoard || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    cancelPanDrag()

    const rect = containerRef.current.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPoint = applyToPoint(inverse(transform), {
      x: screenX,
      y: screenY,
    })

    setIsEditingBoardSize(true)
    setDragState({
      handle,
      dragStartWorld: worldPoint,
      originalWidth: pcbBoard.width ?? 0,
      originalHeight: pcbBoard.height ?? 0,
      originalCenter: { x: pcbBoard.center.x, y: pcbBoard.center.y },
    })
  }

  if (disabled || !pcbBoard || !transform) {
    return (
      <div
        ref={containerRef}
        style={{ position: "relative", overflow: "hidden" }}
      >
        {children}
      </div>
    )
  }

  const boardWidth = pcbBoard.width ?? 0
  const boardHeight = pcbBoard.height ?? 0
  if (boardWidth === 0 || boardHeight === 0) {
    return (
      <div
        ref={containerRef}
        style={{ position: "relative", overflow: "hidden" }}
      >
        {children}
      </div>
    )
  }

  // Compute screen-space corners of the board
  const topLeftWorld = {
    x: pcbBoard.center.x - boardWidth / 2,
    y: pcbBoard.center.y + boardHeight / 2,
  }
  const bottomRightWorld = {
    x: pcbBoard.center.x + boardWidth / 2,
    y: pcbBoard.center.y - boardHeight / 2,
  }
  const tl = applyToPoint(transform, topLeftWorld)
  const br = applyToPoint(transform, bottomRightWorld)

  const screenLeft = Math.min(tl.x, br.x)
  const screenTop = Math.min(tl.y, br.y)
  const screenWidth = Math.abs(br.x - tl.x)
  const screenHeight = Math.abs(br.y - tl.y)
  const screenRight = screenLeft + screenWidth
  const screenBottom = screenTop + screenHeight
  const screenCenterX = screenLeft + screenWidth / 2
  const screenCenterY = screenTop + screenHeight / 2

  // Define handle positions
  const handles: { handle: DragHandle; x: number; y: number }[] = [
    { handle: "top", x: screenCenterX, y: screenTop },
    { handle: "bottom", x: screenCenterX, y: screenBottom },
    { handle: "left", x: screenLeft, y: screenCenterY },
    { handle: "right", x: screenRight, y: screenCenterY },
    { handle: "top-left", x: screenLeft, y: screenTop },
    { handle: "top-right", x: screenRight, y: screenTop },
    { handle: "bottom-left", x: screenLeft, y: screenBottom },
    { handle: "bottom-right", x: screenRight, y: screenBottom },
  ]

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {children}
      {/* Dashed outline around the board */}
      <div
        style={{
          position: "absolute",
          left: screenLeft,
          top: screenTop,
          width: screenWidth,
          height: screenHeight,
          border: "2px dashed rgba(100, 180, 255, 0.7)",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />
      {/* Dimension label */}
      <div
        style={{
          position: "absolute",
          left: screenLeft,
          top: screenBottom + 4,
          color: "rgba(100, 180, 255, 0.9)",
          fontSize: 11,
          fontFamily: "monospace",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {boardWidth.toFixed(2)}mm x {boardHeight.toFixed(2)}mm
      </div>
      {/* Drag handles */}
      {handles.map(({ handle, x, y }) => (
        <div
          key={handle}
          onMouseDown={(e) => startDrag(e, handle)}
          style={{
            position: "absolute",
            left: x - HANDLE_HALF,
            top: y - HANDLE_HALF,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: "rgba(100, 180, 255, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            borderRadius: handle.includes("-") ? 0 : "50%",
            cursor: handleCursors[handle],
            zIndex: 50,
          }}
        />
      ))}
    </div>
  )
}
