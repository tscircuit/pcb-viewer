import {
  useCallback,
  useRef,
  type MouseEvent,
  type TouchEvent,
  type CSSProperties,
} from "react"

/**
 * A hook to handle mobile touch events and prevent "ghost clicks" or double-firing
 * when using both click and touch handlers.
 */
export const useMobileTouch = <T extends HTMLElement = HTMLElement>(
  onClick?: (e: MouseEvent<T> | TouchEvent<T>) => void,
  options: { stopPropagation?: boolean } = { stopPropagation: true },
) => {
  const lastInteractionRef = useRef(0)

  const handleInteraction = useCallback(
    (e: MouseEvent<T> | TouchEvent<T>) => {
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
    (e: TouchEvent<T>) => {
      e.preventDefault()
      handleInteraction(e)
    },
    [handleInteraction],
  )

  const style: CSSProperties = { touchAction: "manipulation" }

  return {
    onClick: handleInteraction,
    onTouchEnd,
    style,
  }
}
