import {
  createStore as createZustandStore,
  useStore as useZustandStore,
  UseBoundStore,
} from "zustand"
import { StoreContext } from "./components/ContextProviders"
import type { LayerRef } from "circuit-json"
import { useContext } from "react"
import {
  getStoredBoolean,
  getStoredString,
  setStoredBoolean,
  setStoredString,
  STORAGE_KEYS,
} from "./hooks/useLocalStorage"

export interface State {
  selected_layer: LayerRef

  pcb_viewer_id: string

  in_edit_mode: boolean
  in_move_footprint_mode: boolean
  in_draw_trace_mode: boolean
  is_mouse_over_container: boolean
  is_moving_component: boolean
  is_drawing_trace: boolean
  is_showing_autorouting: boolean
  is_showing_drc_errors: boolean

  is_showing_multiple_traces_length: boolean
  is_showing_rats_nest: boolean
  is_showing_copper_pours: boolean
  is_showing_pcb_groups: boolean
  pcb_group_view_mode: "all" | "named_only"

  hovered_error_id: string | null

  selectLayer: (layer: LayerRef) => void
  setEditMode: (mode: "off" | "move_footprint" | "draw_trace") => void
  setIsMovingComponent: (is_moving: boolean) => void
  setIsDrawingTrace: (is_drawing: boolean) => void
  setIsShowingRatsNest: (is_showing: boolean) => void
  setIsMouseOverContainer: (is_focused: boolean) => void
  setIsShowingAutorouting: (is_showing: boolean) => void
  setIsShowingMultipleTracesLength: (is_showing: boolean) => void
  setIsShowingDrcErrors: (is_showing: boolean) => void
  setIsShowingCopperPours: (is_showing: boolean) => void
  setIsShowingPcbGroups: (is_showing: boolean) => void
  setPcbGroupViewMode: (mode: "all" | "named_only") => void
  setHoveredErrorId: (errorId: string | null) => void
}

export type StateProps = {
  [key in keyof State]: State[key] extends boolean ? boolean : never
}

const DEFAULT_PCB_GROUP_VIEW_MODE: "all" | "named_only" =
  process.env.NODE_ENV !== "production" ? "named_only" : "all"

export const createStore = (
  initialState: Partial<StateProps> = {},
  disablePcbGroups = false,
) =>
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
        is_mouse_over_container: false,

        is_showing_multiple_traces_length: false,
        is_showing_rats_nest: false,
        is_showing_autorouting: true,
        is_showing_drc_errors: true,
        is_showing_copper_pours: getStoredBoolean(
          STORAGE_KEYS.IS_SHOWING_COPPER_POURS,
          true,
        ),
        is_showing_pcb_groups: disablePcbGroups
          ? false
          : getStoredBoolean(STORAGE_KEYS.IS_SHOWING_PCB_GROUPS, true),
        pcb_group_view_mode: disablePcbGroups
          ? "all"
          : (getStoredString(
              STORAGE_KEYS.PCB_GROUP_VIEW_MODE,
              DEFAULT_PCB_GROUP_VIEW_MODE,
            ) as "all" | "named_only"),

        hovered_error_id: null,
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
        setIsMouseOverContainer: (is_focused) =>
          set({ is_mouse_over_container: is_focused }),
        setIsShowingMultipleTracesLength: (is_showing) =>
          set({ is_showing_multiple_traces_length: is_showing }),
        setIsShowingAutorouting: (is_showing) =>
          set({ is_showing_autorouting: is_showing }),
        setIsShowingDrcErrors: (is_showing) =>
          set({ is_showing_drc_errors: is_showing }),
        setIsShowingCopperPours: (is_showing) => {
          setStoredBoolean(STORAGE_KEYS.IS_SHOWING_COPPER_POURS, is_showing)
          set({ is_showing_copper_pours: is_showing })
        },
        setIsShowingPcbGroups: (is_showing) => {
          if (disablePcbGroups) return
          setStoredBoolean(STORAGE_KEYS.IS_SHOWING_PCB_GROUPS, is_showing)
          set({ is_showing_pcb_groups: is_showing })
        },
        setPcbGroupViewMode: (mode) => {
          if (disablePcbGroups) return
          setStoredString(STORAGE_KEYS.PCB_GROUP_VIEW_MODE, mode)
          set({ pcb_group_view_mode: mode })
        },
        setHoveredErrorId: (errorId) => set({ hovered_error_id: errorId }),
      }) as const,
  )

export const useGlobalStore = <T = State>(s?: (state: State) => T): T => {
  const store = useContext(StoreContext)

  return useZustandStore(store as any, s as any)
}
