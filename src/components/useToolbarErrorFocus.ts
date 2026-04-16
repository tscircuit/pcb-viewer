import { useCallback, useEffect, useRef } from "react"

export const useToolbarErrorFocus = ({
  onClose,
  setHoveredErrorId,
  setFocusedErrorId,
  highlightDurationMs = 3000,
}: {
  onClose: () => void
  setHoveredErrorId: (errorId: string | null) => void
  setFocusedErrorId: (errorId: string | null) => void
  highlightDurationMs?: number
}) => {
  const clearHighlightTimeoutRef = useRef<number | null>(null)
  const focusRequestRef = useRef<number | null>(null)
  const selectedErrorIdRef = useRef<string | null>(null)

  const clearPendingSelection = useCallback(() => {
    if (clearHighlightTimeoutRef.current !== null) {
      window.clearTimeout(clearHighlightTimeoutRef.current)
      clearHighlightTimeoutRef.current = null
    }

    if (focusRequestRef.current !== null) {
      window.cancelAnimationFrame(focusRequestRef.current)
      focusRequestRef.current = null
    }
  }, [])

  useEffect(() => clearPendingSelection, [clearPendingSelection])

  const handleErrorSelect = useCallback(
    (errorId: string) => {
      clearPendingSelection()

      selectedErrorIdRef.current = errorId
      setHoveredErrorId(errorId)
      setFocusedErrorId(null)

      focusRequestRef.current = window.requestAnimationFrame(() => {
        setFocusedErrorId(errorId)
        focusRequestRef.current = null
      })

      onClose()

      clearHighlightTimeoutRef.current = window.setTimeout(() => {
        selectedErrorIdRef.current = null
        setHoveredErrorId(null)
        setFocusedErrorId(null)
        clearHighlightTimeoutRef.current = null
      }, highlightDurationMs)
    },
    [
      clearPendingSelection,
      highlightDurationMs,
      onClose,
      setFocusedErrorId,
      setHoveredErrorId,
    ],
  )

  const isSelectedError = useCallback(
    (errorId: string) => selectedErrorIdRef.current === errorId,
    [],
  )

  return {
    handleErrorSelect,
    isSelectedError,
  }
}
