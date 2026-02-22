import { useMemo, useEffect, createContext, useContext } from "react"
import { createStore, type StateProps } from "../global-store"

export const StoreContext = createContext(null)

export const ContextProviders = ({
  children,
  initialState,
  controlledState,
  disablePcbGroups,
}: {
  children?: any
  initialState?: Partial<StateProps>
  controlledState?: Partial<StateProps>
  disablePcbGroups?: boolean
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  useEffect(() => {
    if (!controlledState) return
    try {
      // apply controlled boolean overrides dynamically to the store
      store.setState(controlledState as any)
    } catch (err) {
      // swallow — controlled updates are best-effort
    }
  }, [controlledState, store])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
