import { useEffect, useRef, type RefObject } from "react"
import { useGlobalStore } from "../global-store"

export const useHotKey = (
  key: string,
  onUse: () => void,
  containerRef?: RefObject<HTMLElement | null>,
) => {
  const isMouseOverContainer = useGlobalStore(
    (s) => s.is_mouse_over_container,
  ) as boolean

  const isMouseOverContainerRef = useRef(isMouseOverContainer)
  const onUseRef = useRef(onUse)

  useEffect(() => {
    isMouseOverContainerRef.current = isMouseOverContainer
  }, [isMouseOverContainer])

  useEffect(() => {
    onUseRef.current = onUse
  }, [onUse])

  useEffect(() => {
    if (!key) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const keyParts = key.split("+")

      const ctrlRequired = keyParts.includes("ctrl")
      const shiftRequired = keyParts.includes("shift")
      const altRequired = keyParts.includes("alt")
      const metaRequired = keyParts.includes("meta")
      const mainKey = keyParts[keyParts.length - 1]

      const containerHasFocus = containerRef?.current
        ? containerRef.current.contains(document.activeElement) ||
          document.activeElement === containerRef.current
        : false

      const shouldTrigger = isMouseOverContainerRef.current || containerHasFocus

      if (
        shouldTrigger &&
        (!ctrlRequired || event.ctrlKey) &&
        (!shiftRequired || event.shiftKey) &&
        (!altRequired || event.altKey) &&
        (!metaRequired || event.metaKey) &&
        event.key.toLowerCase() === mainKey.toLowerCase()
      ) {
        event.preventDefault()
        onUseRef.current()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [key])
}
