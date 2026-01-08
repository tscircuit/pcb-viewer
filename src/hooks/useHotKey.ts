import { useEffect, useRef } from "react"
import { useGlobalStore } from "../global-store"

export const useHotKey = (key: string, onUse: () => void) => {
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

      const activeElement = document.activeElement
      const isInsidePcbViewer =
        activeElement?.closest("[data-pcb-viewer]") !== null

      const shouldTrigger = isMouseOverContainerRef.current || isInsidePcbViewer

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
