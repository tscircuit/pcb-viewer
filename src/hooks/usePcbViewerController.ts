import { useCallback, useMemo, useState } from "react"

export interface PcbViewerController {
  /** @internal Pending command, consumed after the viewer focuses the component. */
  focusRequest: { pcbComponentId: string } | null
  /** @internal Acknowledge only this request, preserving newer commands. */
  onFocusRequestHandled: (request: { pcbComponentId: string }) => void
}

/** Focus commands may be issued before the PCB viewer mounts, such as when switching tabs. */
export const usePcbViewerController = () => {
  const [focusRequest, setFocusRequest] =
    useState<PcbViewerController["focusRequest"]>(null)
  const focusPcbComponent = useCallback((pcbComponentId: string) => {
    setFocusRequest({ pcbComponentId })
  }, [])
  const onFocusRequestHandled = useCallback(
    (request: NonNullable<PcbViewerController["focusRequest"]>) => {
      setFocusRequest((current) => (current === request ? null : current))
    },
    [],
  )
  const controller = useMemo(
    () => ({ focusRequest, onFocusRequestHandled }),
    [focusRequest, onFocusRequestHandled],
  )
  return { controller, focusPcbComponent }
}
