import { useMemo } from "react"
import { createContext, useContext } from "react"
import { createStore } from "../global-store"

export const StoreContext = createContext(null)

export const ContextProviders = ({ children }: { children?: any }) => {
  const store = createStore()

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
