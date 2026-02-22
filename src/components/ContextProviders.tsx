import { useEffect, useMemo } from "react"
import { createContext, useContext } from "react"
import { type StateProps, createStore } from "../global-store"

export const StoreContext = createContext(null)

export const ContextProviders = ({
  children,
  initialState,
  disablePcbGroups,
  showGroupAnchorOffsets,
  showSolderMask,
  showRatsNest,
  showMultipleTracesLength,
  showAutorouting,
  showDrcErrors,
  showCopperPours,
  showPcbGroups,
}: {
  children?: any
  initialState?: Partial<StateProps>
  disablePcbGroups?: boolean
  showGroupAnchorOffsets?: boolean
  showSolderMask?: boolean
  showRatsNest?: boolean
  showMultipleTracesLength?: boolean
  showAutorouting?: boolean
  showDrcErrors?: boolean
  showCopperPours?: boolean
  showPcbGroups?: boolean
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  useEffect(() => {
    if (typeof showGroupAnchorOffsets === "boolean") {
      store.setState({ is_showing_group_anchor_offsets: showGroupAnchorOffsets })
    }
  }, [store, showGroupAnchorOffsets])

  useEffect(() => {
    if (typeof showSolderMask === "boolean") {
      store.setState({ is_showing_solder_mask: showSolderMask })
    }
  }, [store, showSolderMask])

  useEffect(() => {
    if (typeof showRatsNest === "boolean") {
      store.setState({ is_showing_rats_nest: showRatsNest })
    }
  }, [store, showRatsNest])

  useEffect(() => {
    if (typeof showMultipleTracesLength === "boolean") {
      store.setState({
        is_showing_multiple_traces_length: showMultipleTracesLength,
      })
    }
  }, [store, showMultipleTracesLength])

  useEffect(() => {
    if (typeof showAutorouting === "boolean") {
      store.setState({ is_showing_autorouting: showAutorouting })
    }
  }, [store, showAutorouting])

  useEffect(() => {
    if (typeof showDrcErrors === "boolean") {
      store.setState({ is_showing_drc_errors: showDrcErrors })
    }
  }, [store, showDrcErrors])

  useEffect(() => {
    if (typeof showCopperPours === "boolean") {
      store.setState({ is_showing_copper_pours: showCopperPours })
    }
  }, [store, showCopperPours])

  useEffect(() => {
    if (typeof showPcbGroups === "boolean") {
      if (disablePcbGroups) return
      store.setState({ is_showing_pcb_groups: showPcbGroups })
    }
  }, [store, showPcbGroups, disablePcbGroups])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
