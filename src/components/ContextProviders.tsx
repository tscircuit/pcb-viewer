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
  showDrCErrors,
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
  showDrCErrors?: boolean
  showCopperPours?: boolean
  showPcbGroups?: boolean
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  useEffect(() => {
    if (typeof showGroupAnchorOffsets === "boolean") {
      store.getState().setIsShowingGroupAnchorOffsets(showGroupAnchorOffsets)
    }
  }, [store, showGroupAnchorOffsets])

  useEffect(() => {
    if (typeof showSolderMask === "boolean") {
      store.getState().setIsShowingSolderMask(showSolderMask)
    }
  }, [store, showSolderMask])

  useEffect(() => {
    if (typeof showRatsNest === "boolean") {
      store.getState().setIsShowingRatsNest(showRatsNest)
    }
  }, [store, showRatsNest])

  useEffect(() => {
    if (typeof showMultipleTracesLength === "boolean") {
      store
        .getState()
        .setIsShowingMultipleTracesLength(showMultipleTracesLength)
    }
  }, [store, showMultipleTracesLength])

  useEffect(() => {
    if (typeof showAutorouting === "boolean") {
      store.getState().setIsShowingAutorouting(showAutorouting)
    }
  }, [store, showAutorouting])

  useEffect(() => {
    if (typeof showDrCErrors === "boolean") {
      store.getState().setIsShowingDrcErrors(showDrCErrors)
    }
  }, [store, showDrCErrors])

  useEffect(() => {
    if (typeof showCopperPours === "boolean") {
      store.getState().setIsShowingCopperPours(showCopperPours)
    }
  }, [store, showCopperPours])

  useEffect(() => {
    if (typeof showPcbGroups === "boolean") {
      store.getState().setIsShowingPcbGroups(showPcbGroups)
    }
  }, [store, showPcbGroups])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
