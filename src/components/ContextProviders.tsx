import { useMemo, useEffect, createContext, useContext } from "react"
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

  useEffect(() => {
    if (!initialState) return
    try {
      // apply controlled boolean overrides dynamically to the store
      store.setState(initialState as Partial<StateProps>)
    } catch (err) {
      // swallow — controlled updates are best-effort
    }
  }, [initialState, store])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
