import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { useGlobalStore } from "../global-store"
import { useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"

export type EditBoardEvent = {
  edit_event_id: string
  edit_event_type: "edit_pcb_board_size"
  pcb_board_id: string
  original_center: { x: number; y: number }
  new_center: { x: number; y: number }
  original_width: number
  new_width: number
  original_height: number
  new_height: number
  in_progress?: boolean
  created_at: number
}

type HandleType =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: EditBoardEvent) => void
  onModifyEditEvent: (event: Partial<EditBoardEvent>) => void
}

function computeNewDimensions(
  handleType: HandleType,
  originalCenter: { x: number; y: number },
  originalWidth: number,
  originalHeight: number,
  dx: number,
  dy: number,
) {
  if (handleType === "move") {
    return {
      new_center: { x: originalCenter.x + dx, y: originalCenter.y + dy },
      new_width: originalWidth,
      new_height: originalHeight,
    }
  }

  let new_center_x = originalCenter.x
  let new_center_y = originalCenter.y
  let new_width = originalWidth
  let new_height = originalHeight

  if (handleType.includes("e")) {
    new_width = Math.max(0.5, originalWidth + dx)
    new_center_x = originalCenter.x + (new_width - originalWidth) / 2
  } else if (handleType.includes("w")) {
    new_width = Math.max(0.5, originalWidth - dx)
    new_center_x = originalCenter.x - (new_width - originalWidth) / 2
  }

  if (handleType.includes("n")) {
    new_height = Math.max(0.5, originalHeight + dy)
    new_center_y = originalCenter.y + (new_height - originalHeight) / 2
  } else if (handleType.includes("s")) {
    new_height = Math.max(0.5, originalHeight - dy)
    new_center_y = originalCenter.y - (new_height - originalHeight) / 2
  }

  return {
    new_center: { x: new_center_x, y: new_center_y },
    new_width,
    new_height,
  }
}

const HANDLE_SIZE = 8

const HANDLE_CURSORS: Record<HandleType, string> = {
  move: "move",
  n: "n-resize",
  s: "s-resize",
  e: "e-resize",
  w: "w-resize",
  ne: "ne-resize",
  nw: "nw-resize",
  se: "se-resize",
  sw: "sw-resize",
}

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
  const in_edit_board_mode = useGlobalStore((s) => s.in_edit_board_mode)
  const disabled = disabledProp || !in_edit_board_mode

  const [dragState, setDragState] = useState<{
    handleType: HandleType
    dragStart: { x: number; y: number }
    originalCenter: { x: number; y: number }
    originalWidth: number
    originalHeight: number
    edit_event_id: string
    pcb_board_id: string
  } | null>(null)

  const board = soup.find((e): e is PcbBoard => e.type === "pcb_board")
  const hasBoardWithSize =
    board && board.width != null && board.height != null && !board.outline?.length

  if (!hasBoardWithSize || disabled) {
    return (
      <div
        style={{ position: "relative", overflow: "hidden" }}
        onMouseMove={(e) => {
          if (!dragState || !transform) return
          const rect = e.currentTarget.getBoundingClientRect()
          const rwPoint = applyToPoint(inverse(transform), {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          })
          const dx = rwPoint.x - dragState.dragStart.x
          const dy = rwPoint.y - dragState.dragStart.y
          const { new_center, new_width, new_height } = computeNewDimensions(
            dragState.handleType,
            dragState.originalCenter,
            dragState.originalWidth,
            dragState.originalHeight,
            dx,
            dy,
          )
          onModifyEditEvent({
            edit_event_id: dragState.edit_event_id,
            new_center,
            new_width,
            new_height,
          })
        }}
        onMouseUp={() => {
          if (!dragState) return
          onModifyEditEvent({
            edit_event_id: dragState.edit_event_id,
            in_progress: false,
          })
          setDragState(null)
        }}
      >
        {children}
      </div>
    )
  }

  const w = board.width!
  const h = board.height!
  const cx = board.center.x
  const cy = board.center.y

  const tl = applyToPoint(transform, { x: cx - w / 2, y: cy + h / 2 })
  const br = applyToPoint(transform, { x: cx + w / 2, y: cy - h / 2 })

  const screenLeft = tl.x
  const screenTop = tl.y
  const screenRight = br.x
  const screenBottom = br.y
  const screenMidX = (screenLeft + screenRight) / 2
  const screenMidY = (screenTop + screenBottom) / 2
  const screenWidth = screenRight - screenLeft
  const screenHeight = screenBottom - screenTop

  const handles: { type: HandleType; sx: number; sy: number }[] = [
    { type: "nw", sx: screenLeft, sy: screenTop },
    { type: "n", sx: screenMidX, sy: screenTop },
    { type: "ne", sx: screenRight, sy: screenTop },
    { type: "e", sx: screenRight, sy: screenMidY },
    { type: "se", sx: screenRight, sy: screenBottom },
    { type: "s", sx: screenMidX, sy: screenBottom },
    { type: "sw", sx: screenLeft, sy: screenBottom },
    { type: "w", sx: screenLeft, sy: screenMidY },
  ]

  const startDrag = (
    e: React.MouseEvent,
    handleType: HandleType,
    containerEl: HTMLElement,
  ) => {
    if (!board || !transform) return
    e.stopPropagation()
    e.preventDefault()
    cancelPanDrag()

    const rect = containerEl.getBoundingClientRect()
    const rwPoint = applyToPoint(inverse(transform), {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })

    const edit_event_id = Math.random().toString()
    setDragState({
      handleType,
      dragStart: rwPoint,
      originalCenter: { ...board.center },
      originalWidth: board.width!,
      originalHeight: board.height!,
      edit_event_id,
      pcb_board_id: board.pcb_board_id,
    })

    onCreateEditEvent({
      edit_event_id,
      edit_event_type: "edit_pcb_board_size",
      pcb_board_id: board.pcb_board_id,
      original_center: { ...board.center },
      new_center: { ...board.center },
      original_width: board.width!,
      new_width: board.width!,
      original_height: board.height!,
      new_height: board.height!,
      in_progress: true,
      created_at: Date.now(),
    })
  }

  return (
    <div
      style={{ position: "relative", overflow: "hidden" }}
      onMouseMove={(e) => {
        if (!dragState || !transform) return
        const rect = e.currentTarget.getBoundingClientRect()
        const rwPoint = applyToPoint(inverse(transform), {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        const dx = rwPoint.x - dragState.dragStart.x
        const dy = rwPoint.y - dragState.dragStart.y
        const { new_center, new_width, new_height } = computeNewDimensions(
          dragState.handleType,
          dragState.originalCenter,
          dragState.originalWidth,
          dragState.originalHeight,
          dx,
          dy,
        )
        onModifyEditEvent({
          edit_event_id: dragState.edit_event_id,
          new_center,
          new_width,
          new_height,
        })
      }}
      onMouseUp={() => {
        if (!dragState) return
        onModifyEditEvent({
          edit_event_id: dragState.edit_event_id,
          in_progress: false,
        })
        setDragState(null)
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          left: screenLeft,
          top: screenTop,
          width: screenWidth,
          height: screenHeight,
          border: "2px solid #4a90d9",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: screenLeft,
          top: screenTop,
          width: screenWidth,
          height: screenHeight,
          cursor: HANDLE_CURSORS.move,
          opacity: 0,
        }}
        onMouseDown={(e) =>
          startDrag(e, "move", e.currentTarget.parentElement as HTMLElement)
        }
      />
      {handles.map(({ type, sx, sy }) => (
        <div
          key={type}
          style={{
            position: "absolute",
            left: sx - HANDLE_SIZE / 2,
            top: sy - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: "#4a90d9",
            border: "1px solid white",
            cursor: HANDLE_CURSORS[type],
            borderRadius: 1,
            zIndex: 1,
          }}
          onMouseDown={(e) =>
            startDrag(
              e,
              type,
              e.currentTarget.parentElement as HTMLElement,
            )
          }
        />
      ))}
    </div>
  )
}
