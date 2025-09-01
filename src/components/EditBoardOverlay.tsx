import React, { useEffect, useRef, useState } from "react"
import { useGlobalStore } from "../global-store"
import { inverse, applyToPoint, type Matrix } from "transformation-matrix"

type Rect = { x: number; y: number; width: number; height: number }

type Props = {
  /** Screen-space rect (pixels) from PCBViewer */
  boardRect?: Rect
  /** Canvas transform matrix from PCBViewer (world->screen) */
  transform: Matrix
  /** Report proposed edit in WORLD units (mm) on end of drag */
  onProposeEdit?: (args: {
    size?: { width: number; height: number }
    offset?: { x: number; y: number }
  }) => void
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
}

const handleSize = 10 // px
const minSize = 8 // px (screen)

function clampSize(v: number) {
  return Math.max(minSize, v)
}

function handlesFor(r: Rect) {
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  return [
    { id: "nw" as const, x: r.x - handleSize / 2, y: r.y - handleSize / 2, cursor: "nwse-resize" },
    { id: "n"  as const, x: cx - handleSize / 2, y: r.y - handleSize / 2, cursor: "ns-resize" },
    { id: "ne" as const, x: r.x + r.width - handleSize / 2, y: r.y - handleSize / 2, cursor: "nesw-resize" },
    { id: "e"  as const, x: r.x + r.width - handleSize / 2, y: cy - handleSize / 2, cursor: "ew-resize" },
    { id: "se" as const, x: r.x + r.width - handleSize / 2, y: r.y + r.height - handleSize / 2, cursor: "nwse-resize" },
    { id: "s"  as const, x: cx - handleSize / 2, y: r.y + r.height - handleSize / 2, cursor: "ns-resize" },
    { id: "sw" as const, x: r.x - handleSize / 2, y: r.y + r.height - handleSize / 2, cursor: "nesw-resize" },
    { id: "w"  as const, x: r.x - handleSize / 2, y: cy - handleSize / 2, cursor: "ew-resize" },
  ]
}

type DragKind =
  | { type: "none" }
  | { type: "move"; startX: number; startY: number; startRect: Rect }
  | {
      type: "resize"
      handle: ReturnType<typeof handlesFor>[number]["id"]
      startX: number
      startY: number
      startRect: Rect
    }

export const EditBoardOverlay: React.FC<Props> = ({
  boardRect,
  transform,
  onProposeEdit,
}) => {
  const in_edit_board_mode = useGlobalStore((s) => s.in_edit_board_mode)
  const [draft, setDraft] = useState<Rect | undefined>(boardRect)
  const dragRef = useRef<DragKind>({ type: "none" })
  const activePointerId = useRef<number | null>(null)

  // Keep draft synced when not dragging
  useEffect(() => {
    if (dragRef.current.type === "none") setDraft(boardRect)
  }, [boardRect])

  // Ensure ESC works by forcing focus to the canvas/iframe on drag start
  const ensureWindowFocus = () => {
    try {
      window.focus()
      const active = document.activeElement as HTMLElement | null
      if (active && typeof active.blur === "function") active.blur()
      ;(document.body as any)?.focus?.()
    } catch {}
  }

  // Pointer-based drag lifecycle (mouse/touch/pen)
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return
      if (!draft) return
      const d = dragRef.current
      if (d.type === "move") {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        setDraft({ ...d.startRect, x: d.startRect.x + dx, y: d.startRect.y + dy })
      } else if (d.type === "resize") {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        let { x, y, width, height } = d.startRect

        switch (d.handle) {
          case "nw":
            x = d.startRect.x + dx
            y = d.startRect.y + dy
            width = clampSize(d.startRect.width - dx)
            height = clampSize(d.startRect.height - dy)
            break
          case "n":
            y = d.startRect.y + dy
            height = clampSize(d.startRect.height - dy)
            break
          case "ne":
            y = d.startRect.y + dy
            width = clampSize(d.startRect.width + dx)
            height = clampSize(d.startRect.height - dy)
            break
          case "e":
            width = clampSize(d.startRect.width + dx)
            break
          case "se":
            width = clampSize(d.startRect.width + dx)
            height = clampSize(d.startRect.height + dy)
            break
          case "s":
            height = clampSize(d.startRect.height + dy)
            break
          case "sw":
            x = d.startRect.x + dx
            width = clampSize(d.startRect.width - dx)
            height = clampSize(d.startRect.height + dy)
            break
          case "w":
            x = d.startRect.x + dx
            width = clampSize(d.startRect.width - dx)
            break
        }

        // Prevent inverted rects if we hit min size
        if (width <= minSize) {
          x =
            d.startRect.x +
            (d.handle === "nw" || d.handle === "w" || d.handle === "sw"
              ? d.startRect.width - minSize
              : 0)
        }
        if (height <= minSize) {
          y =
            d.startRect.y +
            (d.handle === "nw" || d.handle === "n" || d.handle === "ne"
              ? d.startRect.height - minSize
              : 0)
        }

        setDraft({ x, y, width, height })
      }
    }

    function commitAndClear() {
      if (dragRef.current.type === "none" || !draft || !boardRect) {
        activePointerId.current = null
        dragRef.current = { type: "none" }
        return
      }
      const d = dragRef.current
      activePointerId.current = null
      dragRef.current = { type: "none" }

      if (!onProposeEdit) return

      // Convert screen→world using inverse(transform)
      const inv = inverse(transform)
      const rectToWorld = (r: Rect) => {
        const tl = applyToPoint(inv, { x: r.x, y: r.y })
        const br = applyToPoint(inv, { x: r.x + r.width, y: r.y + r.height })
        const left = Math.min(tl.x, br.x)
        const top = Math.min(tl.y, br.y)
        const w = Math.abs(br.x - tl.x)
        const h = Math.abs(br.y - tl.y)
        return { x: left, y: top, width: w, height: h }
      }

      const startWorld = rectToWorld(boardRect)
      const endWorld = rectToWorld(draft)

      const payload: {
        size?: { width: number; height: number }
        offset?: { x: number; y: number }
      } = {}

      if (d.type === "move") {
        payload.offset = {
          x: endWorld.x - startWorld.x,
          y: endWorld.y - startWorld.y,
        }
      } else if (d.type === "resize") {
        payload.size = {
          width: endWorld.width,
          height: endWorld.height,
        }
      }

      onProposeEdit(payload)
    }

    const onUp = (e: PointerEvent) => {
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return
      try { (e.target as Element)?.releasePointerCapture?.(e.pointerId) } catch {}
      commitAndClear()
    }

    const onCancel = (e: PointerEvent) => {
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return
      try { (e.target as Element)?.releasePointerCapture?.(e.pointerId) } catch {}
      // cancel drag (don’t emit)
      dragRef.current = { type: "none" }
      activePointerId.current = null
      setDraft(boardRect)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onUp, { passive: true })
    window.addEventListener("pointercancel", onCancel, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
    }
  }, [draft, transform, onProposeEdit, boardRect])

  // ESC-to-cancel while dragging (no emit)
  useEffect(() => {
    const cancel = () => {
      if (dragRef.current.type !== "none") {
        dragRef.current = { type: "none" }
        activePointerId.current = null
        setDraft(boardRect)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const isEsc = e.key === "Escape" || e.code === "Escape" || (e as any).keyCode === 27
      if (!isEsc) return
      e.preventDefault()
      e.stopPropagation()
      cancel()
    }

    // capture phase so we win over other handlers / iframes
    window.addEventListener("keydown", onKey, true)
    document.addEventListener("keydown", onKey, true)

    // if focus is lost mid-drag, cancel
    const onBlur = () => cancel()
    window.addEventListener("blur", onBlur)

    return () => {
      window.removeEventListener("keydown", onKey, true)
      document.removeEventListener("keydown", onKey, true)
      window.removeEventListener("blur", onBlur)
    }
  }, [boardRect])

  if (!in_edit_board_mode || !draft) return null

  const handles = handlesFor(draft)

  return (
    <div style={overlayStyle}>
      {/* Highlight */}
      <div
        style={{
          position: "absolute",
          left: draft.x,
          top: draft.y,
          width: draft.width,
          height: draft.height,
          border: "2px dashed #8bd3ff",
          background: "rgba(139, 211, 255, 0.06)",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />

      {/* Handles (pointer-enabled) */}
      {handles.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            ensureWindowFocus()
            activePointerId.current = e.pointerId
            try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch {}
            dragRef.current = {
              type: "resize",
              handle: h.id,
              startX: e.clientX,
              startY: e.clientY,
              startRect: draft,
            }
          }}
          style={{
            position: "absolute",
            left: h.x,
            top: h.y,
            width: handleSize,
            height: handleSize,
            borderRadius: 2,
            border: "1px solid #8bd3ff",
            background: "rgba(139, 211, 255, 0.9)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35) inset",
            pointerEvents: "auto",
            cursor: h.cursor as any,
            touchAction: "none",
          }}
          title={`Resize: ${h.id.toUpperCase()}`}
        />
      ))}

      {/* Drag surface (offset) */}
      <div
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          ensureWindowFocus()
          activePointerId.current = e.pointerId
          try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch {}
          dragRef.current = {
            type: "move",
            startX: e.clientX,
            startY: e.clientY,
            startRect: draft,
          }
        }}
        style={{
          position: "absolute",
          left: draft.x + 6,
          top: draft.y + 6,
          width: Math.max(0, draft.width - 12),
          height: Math.max(0, draft.height - 12),
          pointerEvents: "auto",
          cursor: "move",
          touchAction: "none",
        }}
        title="Drag to offset"
      />
    </div>
  )
}

export default EditBoardOverlay
