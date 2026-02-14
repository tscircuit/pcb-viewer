import { useCallback, useRef } from "react"

/**
 * A hook to handle mobile touch events and prevent "ghost clicks" or double-firing
 * when using both click and touch handlers.
 */
export const useMobileTouch = (
  onClick?: (e: any) => void,
  options: { stopPropagation?: boolean } = { stopPropagation: true },
) => {
  const lastInteractionRef = useRef(0)

  const handleInteraction = useCallback(
    (e: any) => {
      if (options.stopPropagation) {
        e.stopPropagation()
      }

      const now = Date.now()
      if (now - lastInteractionRef.current < 300) return
      lastInteractionRef.current = now

      onClick?.(e)
    },
    [onClick, options.stopPropagation],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleInteraction(e)
    },
    [handleInteraction],
  )

  return {
    onClick: handleInteraction,
    onTouchEnd,
    style: { touchAction: "manipulation" as const },
  }
}
