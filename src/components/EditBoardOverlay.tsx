import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { useGlobalStore } from "../global-store"
import { useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import type { ManualEditEvent } from "@tscircuit/props"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

type HandleType =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export const EditBoardOverlay = ({
  children,
  disabled: disabledProp,
  transform,
  soup,
  cancelPanDrag,
  onCreateEditEvent,
  onModifyEditEvent,
}: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null)
  const [dragState, setDragState] = useState<{
    dragStart: { x: number; y: number }
    originalBoard: { width: number; height: number; center: { x: number; y: number } }
    edit_event_id: string
  } | null>(null)

  const { in_edit_board_mode, setIsEditingBoard } = useGlobalStore((s) => ({
    in_edit_board_mode: s.in_edit_board_mode,
    setIsEditingBoard: s.setIsEditingBoard,
  }))
  const disabled = disabledProp || !in_edit_board_mode

  const board = soup.find((e): e is PcbBoard => e.type === "pcb_board")

  if (!board || disabled) {
    return <>{children}</>
  }

  const handleDragStart = (handle: HandleType, e: React.MouseEvent) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rwMousePoint = applyToPoint(inverse(transform!), { x, y })

    cancelPanDrag()
    setActiveHandle(handle)
    const edit_event_id = Math.random().toString()
    setDragState({
      dragStart: rwMousePoint,
      originalBoard: {
        width: board.width,
        height: board.height,
        center: board.center,
      },
      edit_event_id,
    })

    onCreateEditEvent({
      edit_event_id,
      edit_event_type: "edit_pcb_board_size" as any,
      pcb_edit_event_type: "edit_board_size" as any,
      original_width: board.width,
      original_height: board.height,
      original_center: board.center,
      new_width: board.width,
      new_height: board.height,
      new_center: board.center,
      in_progress: true,
      created_at: Date.now(),
    } as any)

    setIsEditingBoard(true)
    e.preventDefault()
    e.stopPropagation()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeHandle || !dragState) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rwMousePoint = applyToPoint(inverse(transform!), { x, y })

    const dx = rwMousePoint.x - dragState.dragStart.x
    const dy = rwMousePoint.y - dragState.dragStart.y

    let newWidth = dragState.originalBoard.width
    let newHeight = dragState.originalBoard.height
    let newCenterX = dragState.originalBoard.center.x
    let newCenterY = dragState.originalBoard.center.y

    if (activeHandle.includes("left")) {
      newWidth = Math.max(0.1, dragState.originalBoard.width - dx)
      newCenterX = dragState.originalBoard.center.x + (dragState.originalBoard.width - newWidth) / 2
    } else if (activeHandle.includes("right")) {
      newWidth = Math.max(0.1, dragState.originalBoard.width + dx)
      newCenterX = dragState.originalBoard.center.x + (newWidth - dragState.originalBoard.width) / 2
    }

    if (activeHandle.includes("top")) {
      newHeight = Math.max(0.1, dragState.originalBoard.height - dy)
      newCenterY = dragState.originalBoard.center.y + (dragState.originalBoard.height - newHeight) / 2
    } else if (activeHandle.includes("bottom")) {
      newHeight = Math.max(0.1, dragState.originalBoard.height + dy)
      newCenterY = dragState.originalBoard.center.y + (newHeight - dragState.originalBoard.height) / 2
    }

    onModifyEditEvent({
      edit_event_id: dragState.edit_event_id,
      new_width: newWidth,
      new_height: newHeight,
      new_center: { x: newCenterX, y: newCenterY },
    } as any)
  }

  const handleMouseUp = () => {
    if (!activeHandle || !dragState) return
    setIsEditingBoard(false)
    onModifyEditEvent({
      edit_event_id: dragState.edit_event_id,
      in_progress: false,
    } as any)
    setActiveHandle(null)
    setDragState(null)
  }

  const handleSize = 8 / transform.a
  const boardLeft = board.center.x - board.width / 2
  const boardRight = board.center.x + board.width / 2
  const boardTop = board.center.y - board.height / 2
  const boardBottom = board.center.y + board.height / 2
  const boardCenterX = board.center.x
  const boardCenterY = board.center.y

  const handles: { type: HandleType; x: number; y: number }[] = [
    { type: "top-left", x: boardLeft, y: boardTop },
    { type: "top-center", x: boardCenterX, y: boardTop },
    { type: "top-right", x: boardRight, y: boardTop },
    { type: "middle-left", x: boardLeft, y: boardCenterY },
    { type: "middle-right", x: boardRight, y: boardCenterY },
    { type: "bottom-left", x: boardLeft, y: boardBottom },
    { type: "bottom-center", x: boardCenterX, y: boardBottom },
    { type: "bottom-right", x: boardRight, y: boardBottom },
  ]

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}
      {handles.map((h) => {
        const projected = applyToPoint(transform!, { x: h.x, y: h.y })
        return (
          <div
            key={h.type}
            onMouseDown={(e) => handleDragStart(h.type, e)}
            style={{
              position: "absolute",
              left: projected.x,
              top: projected.y,
              width: 10,
              height: 10,
              backgroundColor: "blue",
              border: "1px solid white",
              transform: "translate(-50%, -50%)",
              cursor: h.type.includes("top") || h.type.includes("bottom") ? (h.type.includes("left") || h.type.includes("right") ? "nwse-resize" : "ns-resize") : "ew-resize",
              zIndex: 1000,
            }}
          />
        )
      })}
    </div>
  )
}
