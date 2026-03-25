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

          {HANDLE_CONFIGS.map((config) => (
            <div
              key={config.handle}
              style={{
                position: "absolute",
                left: boardRect.left + boardRect.width * config.xFactor,
                top: boardRect.top + boardRect.height * config.yFactor,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                transform: "translate(-50%, -50%)",
                borderRadius: 999,
                border: "2px solid rgba(107, 221, 143, 0.95)",
                backgroundColor: "#0d180f",
                boxSizing: "border-box",
                cursor: config.cursor,
              }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                cancelPanDrag()

                const rect = containerRef.current?.getBoundingClientRect()
                if (!rect) return

                setDragState({
                  mode: "resize",
                  handle: config.handle,
                  dragStart: applyToPoint(inverse(transform), {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                  }),
                  originalBoard: editableBoard,
                })
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              left: boardRect.left + boardRect.width / 2,
              top: boardRect.bottom + 12,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(12, 17, 13, 0.9)",
              color: "#d9fbe2",
              border: "1px solid rgba(107, 221, 143, 0.35)",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 11,
              fontFamily: "sans-serif",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {formatMm(editableBoard.width)}mm × {formatMm(editableBoard.height)}
            mm · center ({formatMm(editableBoard.center.x)},{" "}
            {formatMm(editableBoard.center.y)})
          </div>
        </>
      )}
    </div>
  )
}
