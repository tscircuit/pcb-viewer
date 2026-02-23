import { useEffect, useMemo } from "react"
import { createContext } from "react"
import { createStore, type StateProps } from "../global-store"
import type { ViewPropOverrides } from "../lib/ViewPropOverrides"

export const StoreContext = createContext(null)

export const ContextProviders = ({
  children,
  initialState,
  disablePcbGroups,
  viewOverrides,
}: {
  children?: any
  initialState?: Partial<StateProps>
  disablePcbGroups?: boolean
  viewOverrides?: ViewPropOverrides
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  useEffect(() => {
    if (!viewOverrides) return
    const s = store.getState()
    if (viewOverrides.showRatsNest !== undefined)
      s.setIsShowingRatsNest(viewOverrides.showRatsNest)
    if (viewOverrides.showDrcErrors !== undefined)
      s.setIsShowingDrcErrors(viewOverrides.showDrcErrors)
    if (viewOverrides.showCopperPours !== undefined)
      s.setIsShowingCopperPours(viewOverrides.showCopperPours)
    if (viewOverrides.showSolderMask !== undefined)
      s.setIsShowingSolderMask(viewOverrides.showSolderMask)
    if (viewOverrides.showTraceLengths !== undefined)
      s.setIsShowingMultipleTracesLength(viewOverrides.showTraceLengths)
    if (viewOverrides.showAutorouting !== undefined)
      s.setIsShowingAutorouting(viewOverrides.showAutorouting)
    if (viewOverrides.showPcbGroups !== undefined)
      s.setIsShowingPcbGroups(viewOverrides.showPcbGroups)
    if (viewOverrides.showGroupAnchorOffsets !== undefined)
      s.setIsShowingGroupAnchorOffsets(viewOverrides.showGroupAnchorOffsets)
  }, [
    store,
    viewOverrides?.showRatsNest,
    viewOverrides?.showDrcErrors,
    viewOverrides?.showCopperPours,
    viewOverrides?.showSolderMask,
    viewOverrides?.showTraceLengths,
    viewOverrides?.showAutorouting,
    viewOverrides?.showPcbGroups,
    viewOverrides?.showGroupAnchorOffsets,
  ])

  return (
    <StoreContext.Provider value={store as any}>
      {children}
    </StoreContext.Provider>
  )
}
