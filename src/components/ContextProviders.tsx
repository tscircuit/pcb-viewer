import { useEffect } from "react"
import type { StateProps } from "../global-store"
import { getGlobalPcbViewerStore } from "../global-store"

export const ContextProviders = ({
  children,
  initialState,
  disablePcbGroups,
}: {
  children?: any
  initialState?: Partial<StateProps>
  disablePcbGroups?: boolean
}) => {
  useEffect(() => {
    if (!initialState) return
    const store = getGlobalPcbViewerStore()
    store.setState(initialState as any)
  }, [initialState])

  useEffect(() => {
    if (disablePcbGroups) {
      const store = getGlobalPcbViewerStore()
      store.getState().setIsShowingPcbGroups(false)
    }
  }, [disablePcbGroups])

  return <>{children}</>
}
