import { useEffect, useMemo, useRef } from "react"
import { createContext, useContext } from "react"
import {
  createStore,
  getControlledViewState,
  type ControlledViewState,
  type StateProps,
} from "../global-store"

export const StoreContext = createContext<ReturnType<
  typeof createStore
> | null>(null)

export const ContextProviders = ({
  children,
  initialState,
  disablePcbGroups,
  controlledViewState,
  onControlledViewStateChange,
}: {
  children?: any
  initialState?: Partial<StateProps>
  disablePcbGroups?: boolean
  controlledViewState?: Partial<ControlledViewState>
  onControlledViewStateChange?: (viewState: ControlledViewState) => void
}) => {
  const store = useMemo(
    () => createStore(initialState, disablePcbGroups),
    [disablePcbGroups],
  )

  const isSyncingFromPropsRef = useRef(false)

  useEffect(() => {
    if (!controlledViewState) return

    const currentState = store.getState()
    let nextPartialState: Partial<ControlledViewState> = {}

    const controlledEntries = Object.entries(controlledViewState) as {
      [K in keyof ControlledViewState]-?: [
        K,
        ControlledViewState[K] | undefined,
      ]
    }[keyof ControlledViewState][]

    for (const [typedKey, value] of controlledEntries) {
      if (value === undefined) continue
      if (currentState[typedKey] === value) continue
      nextPartialState = {
        ...nextPartialState,
        [typedKey]: value,
      }
    }

    if (Object.keys(nextPartialState).length === 0) return

    isSyncingFromPropsRef.current = true
    try {
      store.setState(nextPartialState)
    } finally {
      isSyncingFromPropsRef.current = false
    }
  }, [controlledViewState, store])

  useEffect(() => {
    if (!onControlledViewStateChange) return

    const unsubscribe = store.subscribe((state, previousState) => {
      if (isSyncingFromPropsRef.current) return

      const currentViewState = getControlledViewState(state)
      const prevViewState = getControlledViewState(previousState)

      const hasChanged = (
        Object.keys(currentViewState) as (keyof ControlledViewState)[]
      ).some((key) => currentViewState[key] !== prevViewState[key])

      if (hasChanged) {
        onControlledViewStateChange(currentViewState)
      }
    })

    return () => unsubscribe()
  }, [onControlledViewStateChange, store])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
