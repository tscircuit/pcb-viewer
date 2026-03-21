import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useMemo, useRef, useState } from "react"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import {
  type EditableBoard,
  type ResizeHandle,
  getEditableBoard,
  resizeEditableBoard,
} from "../lib/board-editing"

interface Props {
  transform?: Matrix
  children: React.ReactNode
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onBoardChanged: (
    board: EditableBoard,
    options: { inProgress: boolean },
  ) => void
}

type DragState =
  | {
      mode: "move"
      dragStart: { x: number; y: number }
      originalBoard: EditableBoard
    }
  | {
      mode: "resize"
      dragStart: { x: number; y: number }
      originalBoard: EditableBoard
      handle: ResizeHandle
    }

const HANDLE_SIZE = 12

const HANDLE_CONFIGS: Array<{
  handle: ResizeHandle
  cursor: React.CSSProperties["cursor"]
  xFactor: number
  yFactor: number
}> = [
  { handle: "nw", cursor: "nwse-resize", xFactor: 0, yFactor: 0 },
  { handle: "n", cursor: "ns-resize", xFactor: 0.5, yFactor: 0 },
  { handle: "ne", cursor: "nesw-resize", xFactor: 1, yFactor: 0 },
  { handle: "e", cursor: "ew-resize", xFactor: 1, yFactor: 0.5 },
  { handle: "se", cursor: "nwse-resize", xFactor: 1, yFactor: 1 },
  { handle: "s", cursor: "ns-resize", xFactor: 0.5, yFactor: 1 },
  { handle: "sw", cursor: "nesw-resize", xFactor: 0, yFactor: 1 },
  { handle: "w", cursor: "ew-resize", xFactor: 0, yFactor: 0.5 },
]

const formatMm = (value: number) => {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export const EditBoardOverlay = ({
  children,
  disabled: disabledProp,
  transform,
  soup,
  cancelPanDrag,
  onBoardChanged,
}: Props) => {
  if (!transform) transform = identity()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const inEditBoardMode = useGlobalStore((state) => state.in_edit_board_mode)
  const editableBoard = useMemo(() => getEditableBoard(soup), [soup])
  const disabled = disabledProp || !inEditBoardMode || !editableBoard

  const boardRect = useMemo(() => {
    if (!editableBoard) return null

    const topLeft = applyToPoint(transform, {
      x: editableBoard.center.x - editableBoard.width / 2,
      y: editableBoard.center.y + editableBoard.height / 2,
    })
    const bottomRight = applyToPoint(transform, {
      x: editableBoard.center.x + editableBoard.width / 2,
      y: editableBoard.center.y - editableBoard.height / 2,
    })

    const left = Math.min(topLeft.x, bottomRight.x)
    const top = Math.min(topLeft.y, bottomRight.y)
    const right = Math.max(topLeft.x, bottomRight.x)
    const bottom = Math.max(topLeft.y, bottomRight.y)

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
      bottom,
    }
  }, [editableBoard, transform])

  useEffect(() => {
    if (!dragState || !containerRef.current) return

    const getRealWorldPoint = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return null

      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      if (Number.isNaN(point.x) || Number.isNaN(point.y)) return null
      return applyToPoint(inverse(transform), point)
    }

    const onMouseMove = (event: MouseEvent) => {
      const point = getRealWorldPoint(event)
      if (!point) return

      const delta = {
        x: point.x - dragState.dragStart.x,
        y: point.y - dragState.dragStart.y,
      }

      const nextBoard =
        dragState.mode === "move"
          ? {
              ...dragState.originalBoard,
              center: {
                x: dragState.originalBoard.center.x + delta.x,
                y: dragState.originalBoard.center.y + delta.y,
              },
            }
          : resizeEditableBoard({
              board: dragState.originalBoard,
              handle: dragState.handle,
              delta,
            })

      onBoardChanged(nextBoard, { inProgress: true })
    }

    const onMouseUp = (event: MouseEvent) => {
      const point = getRealWorldPoint(event)
      let finalBoard = dragState.originalBoard

      if (point) {
        const delta = {
          x: point.x - dragState.dragStart.x,
          y: point.y - dragState.dragStart.y,
        }

        finalBoard =
          dragState.mode === "move"
            ? {
                ...dragState.originalBoard,
                center: {
                  x: dragState.originalBoard.center.x + delta.x,
                  y: dragState.originalBoard.center.y + delta.y,
                },
              }
            : resizeEditableBoard({
                board: dragState.originalBoard,
                handle: dragState.handle,
                delta,
              })
      }

      onBoardChanged(finalBoard, { inProgress: false })
      setDragState(null)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [dragState, onBoardChanged, transform])

  useEffect(() => {
    if (!disabled) return
    setDragState(null)
  }, [disabled])

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
      {!disabled && editableBoard && boardRect && (
        <>
          {/* Board body - drag to move */}
          <div
            style={{
              position: "absolute",
              left: boardRect.left,
              top: boardRect.top,
              width: boardRect.width,
              height: boardRect.height,
              border: "1px dashed rgba(107, 221, 143, 0.95)",
              backgroundColor:
                dragState?.mode === "move"
                  ? "rgba(107, 221, 143, 0.08)"
                  : "rgba(107, 221, 143, 0.02)",
              cursor: "move",
              boxSizing: "border-box",
            }}
            onMouseDown={(event) => {
              event.preventDefault()
              cancelPanDrag()

              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return

              setDragState({
                mode: "move",
                dragStart: applyToPoint(inverse(transform), {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                }),
                originalBoard: editableBoard,
              })
            }}
          />

          {/* Dimension label */}
          <div
            style={{
              position: "absolute",
              left: boardRect.left + boardRect.width / 2,
              top: boardRect.top + boardRect.height + 8,
              transform: "translateX(-50%)",
              color: "rgba(107, 221, 143, 0.95)",
              fontSize: 11,
              fontFamily: "monospace",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {formatMm(editableBoard.width)} x {formatMm(editableBoard.height)}{" "}
            mm
          </div>

          {/* Resize handles */}
          {HANDLE_CONFIGS.map(({ handle, cursor, xFactor, yFactor }) => (
            <div
              key={handle}
              style={{
                position: "absolute",
                left:
                  boardRect.left + boardRect.width * xFactor - HANDLE_SIZE / 2,
                top:
                  boardRect.top + boardRect.height * yFactor - HANDLE_SIZE / 2,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                backgroundColor: "rgba(107, 221, 143, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                cursor,
                boxSizing: "border-box",
              }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                cancelPanDrag()

                const rect = containerRef.current?.getBoundingClientRect()
                if (!rect) return

                setDragState({
                  mode: "resize",
                  dragStart: applyToPoint(inverse(transform), {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                  }),
                  originalBoard: editableBoard,
                  handle,
                })
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
