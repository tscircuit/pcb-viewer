import { useMemo } from "react"
import { createContext, useContext } from "react"
import { createStore, type StateProps } from "../global-store"

export const StoreContext = createContext(null)

export const ContextProviders = ({
  children,
  initialState,
}: { children?: any; initialState?: Partial<StateProps> }) => {
  const store = useMemo(() => createStore(initialState), [])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
