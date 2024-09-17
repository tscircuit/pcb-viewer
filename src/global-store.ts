import {
  createStore as createZustandStore,
  useStore as useZustandStore,
  UseBoundStore,
} from "zustand"
import { StoreContext } from "./components/ContextProviders"
import type { LayerRef } from "@tscircuit/soup"
import { useContext } from "react"

export interface State {
  selected_layer: LayerRef

  pcb_viewer_id: string

  in_edit_mode: boolean
  in_move_footprint_mode: boolean
  in_draw_trace_mode: boolean

  is_moving_component: boolean
  is_drawing_trace: boolean

  is_showing_rats_nest: boolean

  selectLayer: (layer: LayerRef) => void
  setEditMode: (mode: "off" | "move_footprint" | "draw_trace") => void
  setIsMovingComponent: (is_moving: boolean) => void
  setIsDrawingTrace: (is_drawing: boolean) => void
  setIsShowingRatsNest: (is_showing: boolean) => void
}

export type StateProps = {
  [key in keyof State]: State[key] extends boolean ? boolean : never
}

export const createStore = (initialState: Partial<StateProps> = {}) =>
  createZustandStore<State>(
    (set) =>
      ({
        selected_layer: "top",

        pcb_viewer_id: `pcb_viewer_${Math.random().toString().slice(2, 10)}`,

        in_edit_mode: false,
        in_move_footprint_mode: false,
        in_draw_trace_mode: false,

        is_moving_component: false,
        is_drawing_trace: false,

        is_showing_rats_nest: false,
        ...initialState,

        selectLayer: (layer) => set({ selected_layer: layer }),
        setEditMode: (mode) =>
          set({
            in_edit_mode: mode !== "off",
            in_move_footprint_mode: mode === "move_footprint",
            in_draw_trace_mode: mode === "draw_trace",
            is_moving_component: false,
            is_drawing_trace: false,
          }),
        setIsShowingRatsNest: (is_showing) =>
          set({ is_showing_rats_nest: is_showing }),
        setIsMovingComponent: (is_moving) =>
          set({ is_moving_component: is_moving }),
        setIsDrawingTrace: (is_drawing) =>
          set({ is_drawing_trace: is_drawing }),
      }) as const,
  )

export const useGlobalStore = <T = State>(s?: (state: State) => T): T => {
  const store = useContext(StoreContext)

  return useZustandStore(store as any, s as any)
}
