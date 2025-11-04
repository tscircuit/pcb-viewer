import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { useGlobalStore } from "../global-store"
import { useEffect, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import type { ManualEditEvent } from "@tscircuit/props"

interface Props {
  transform: Matrix
  soup: AnyCircuitElement[]
  pcb_board: PcbBoard
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

export const EditBoardSizeOverlay = ({
  transform,
  soup,
  pcb_board,
  cancelPanDrag,
  onCreateEditEvent,
  onModifyEditEvent,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragState, setDragState] = useState<{
    dragHandle: "top" | "bottom" | "left" | "right" | "move"
    dragStart: { x: number; y: number }
    originalDimensions: { width: number; height: number }
    originalCenter: { x: number; y: number }
    edit_event_id: string
  } | null>(null)
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_edit_board_size_mode = useGlobalStore(
    (s) => s.in_edit_board_size_mode
  )
  const setIsEditingBoardSize = useGlobalStore((s) => s.setIsEditingBoardSize)

  const disabled = !in_edit_mode || !in_edit_board_size_mode

  useEffect(() => {
    if (dragState) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = (e.clientX - dragState.dragStart.x) / transform.a
        const deltaY = (e.clientY - dragState.dragStart.y) / -transform.d

        let newWidth = dragState.originalDimensions.width
        let newHeight = dragState.originalDimensions.height
        let newCenterX = dragState.originalCenter.x
        let newCenterY = dragState.originalCenter.y

        if (dragState.dragHandle === "top") {
          newHeight += deltaY
        } else if (dragState.dragHandle === "bottom") {
          newHeight -= deltaY
        } else if (dragState.dragHandle === "left") {
          newWidth -= deltaX
        } else if (dragState.dragHandle === "right") {
          newWidth += deltaX
        } else if (dragState.dragHandle === "move") {
          newCenterX += deltaX
          newCenterY += deltaY
        }

        onModifyEditEvent({
          edit_event_id: dragState.edit_event_id,
          width: newWidth,
          height: newHeight,
          center_x: newCenterX,
          center_y: newCenterY,
        })
      }

      const handleMouseUp = () => {
        setIsEditingBoardSize(false)
        onModifyEditEvent({
          edit_event_id: dragState.edit_event_id,
          in_progress: false,
        })
        setDragState(null)
      }

      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)

      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragState, transform])

  const board_center_in_screen_space = applyToPoint(transform, {
    x: pcb_board.center.x,
    y: pcb_board.center.y,
  })
  const board_half_width_in_screen_space = (pcb_board.width / 2) * transform.a
  const board_half_height_in_screen_space = (pcb_board.height / 2) * -transform.d

  const handleMouseDown = (
    e: React.MouseEvent,
    dragHandle: "top" | "bottom" | "left" | "right" | "move"
  ) => {
    e.preventDefault()
    e.stopPropagation()
    cancelPanDrag()
    const edit_event_id = Math.random().toString()
    setDragState({
      dragHandle,
      dragStart: { x: e.clientX, y: e.clientY },
      originalDimensions: {
        width: pcb_board.width,
        height: pcb_board.height,
      },
      originalCenter: {
        x: pcb_board.center.x,
        y: pcb_board.center.y,
      },
      edit_event_id,
    })
    onCreateEditEvent({
      edit_event_id,
      edit_event_type: "edit_pcb_board_size",
      pcb_edit_event_type: "edit_board_size",
      pcb_board_id: pcb_board.pcb_board_id,
      original_width: pcb_board.width,
      original_height: pcb_board.height,
      new_width: pcb_board.width,
      new_height: pcb_board.height,
      in_progress: true,
      created_at: Date.now(),
    } as any)
    setIsEditingBoardSize(true)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        zIndex: 999,
        pointerEvents: disabled ? "none" : "all",
      }}
    >
      {/* Resizing handles */}
      {/* Top Handle */}
      <div
        style={{
          position: "absolute",
          left: board_center_in_screen_space.x - 10,
          top:
            board_center_in_screen_space.y -
            board_half_height_in_screen_space -
            10,
          width: 20,
          height: 20,
          background: "rgba(255, 0, 0, 0.5)",
          cursor: "ns-resize",
        }}
        onMouseDown={(e) => handleMouseDown(e, "top")}
      />
      {/* Bottom Handle */}
      <div
        style={{
          position: "absolute",
          left: board_center_in_screen_space.x - 10,
          top:
            board_center_in_screen_space.y +
            board_half_height_in_screen_space -
            10,
          width: 20,
          height: 20,
          background: "rgba(255, 0, 0, 0.5)",
          cursor: "ns-resize",
        }}
        onMouseDown={(e) => handleMouseDown(e, "bottom")}
      />
      {/* Left Handle */}
      <div
        style={{
          position: "absolute",
          left:
            board_center_in_screen_space.x -
            board_half_width_in_screen_space -
            10,
          top: board_center_in_screen_space.y - 10,
          width: 20,
          height: 20,
          background: "rgba(255, 0, 0, 0.5)",
          cursor: "ew-resize",
        }}
        onMouseDown={(e) => handleMouseDown(e, "left")}
      />
      {/* Right Handle */}
      <div
        style={{
          position: "absolute",
          left:
            board_center_in_screen_space.x +
            board_half_width_in_screen_space -
            10,
          top: board_center_in_screen_space.y - 10,
          width: 20,
          height: 20,
          background: "rgba(255, 0, 0, 0.5)",
          cursor: "ew-resize",
        }}
        onMouseDown={(e) => handleMouseDown(e, "right")}
      />
      {/* Move Handle */}
      <div
        style={{
          position: "absolute",
          left: board_center_in_screen_space.x - 10,
          top: board_center_in_screen_space.y - 10,
          width: 20,
          height: 20,
          background: "rgba(0, 0, 255, 0.5)",
          cursor: "move",
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
        data-testid="edit-board-size"
      />
    </div>
  )
}

export default EditBoardSizeOverlay
