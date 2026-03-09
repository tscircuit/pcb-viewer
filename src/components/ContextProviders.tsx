import { useEffect, useMemo } from "react"
import {
  createStore,
  StoreContext,
  setGlobalPcbViewerStore,
  type StateProps,
} from "../global-store"

export const ContextProviders = ({
  children,
  initialState,
  disablePcbGroups,
}: {
  children?: any
  initialState?: Partial<StateProps>
  disablePcbGroups?: boolean
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  useEffect(() => {
    setGlobalPcbViewerStore(store)
  }, [store])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
