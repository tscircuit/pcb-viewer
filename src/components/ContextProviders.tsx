import { useMemo } from "react"
import { createContext, useContext } from "react"
import { createStore, type StateProps } from "../global-store"

export const StoreContext = createContext(null)

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

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
