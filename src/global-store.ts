import {
  createStore as createZustandStore,
  useStore as useZustandStore,
  UseBoundStore,
} from "zustand"
import { StoreContext } from "./components/ContextProviders"
import type { LayerRef } from "@tscircuit/builder"
import { useContext } from "react"

export interface State {
  selected_layer: LayerRef

  selectLayer: (layer: LayerRef) => void
}

export const createStore = () =>
  createZustandStore<State>((set) => ({
    selected_layer: "top",

    selectLayer: (layer) => set({ selected_layer: layer }),
  }))

export const useStore = <T = State>(s?: (state: State) => T): T => {
  const store = useContext(StoreContext)

  return useZustandStore(store as any, s as any)
}
