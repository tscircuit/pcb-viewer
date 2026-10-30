import type { AnyCircuitElement } from "circuit-json"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { type Matrix, compose, scale, translate } from "transformation-matrix"
import type { getPcbComponentFocus } from "../lib/get-pcb-component-focus"
import {
  animateTransform,
  cancelTransformAnimation,
} from "../lib/util/transform-animation"
import type { PcbViewerController } from "./usePcbViewerController"

type FocusRequest = PcbViewerController["focusRequest"]

export const usePcbComponentSearchFocus = ({
  transform,
  setTransform,
  focusedPcbComponent,
  setFocusedPcbComponent,
  circuitJson,
}: {
  transform: Matrix
  setTransform: (transform: Matrix) => void
  focusedPcbComponent: FocusRequest
  setFocusedPcbComponent: Dispatch<SetStateAction<FocusRequest>>
  circuitJson?: AnyCircuitElement[]
}) => {
  const animationFrameRef = useRef<number | null>(null)
  const searchRequestRef = useRef<FocusRequest>(null)
  const cancelSearchAnimation = useCallback(() => {
    cancelTransformAnimation(animationFrameRef.current)
    animationFrameRef.current = null
  }, [])

  const clearSearchFocus = useCallback(() => {
    cancelSearchAnimation()
    const request = searchRequestRef.current
    searchRequestRef.current = null
    setFocusedPcbComponent((current) => (current === request ? null : current))
  }, [cancelSearchAnimation, setFocusedPcbComponent])

  useEffect(() => cancelSearchAnimation, [cancelSearchAnimation])
  useEffect(() => {
    cancelSearchAnimation()
  }, [circuitJson, cancelSearchAnimation])

  useEffect(() => {
    if (
      !focusedPcbComponent ||
      focusedPcbComponent !== searchRequestRef.current
    )
      return
    const timeout = window.setTimeout(() => setFocusedPcbComponent(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [focusedPcbComponent, setFocusedPcbComponent])

  const focusComponent = useCallback(
    (
      focus: NonNullable<ReturnType<typeof getPcbComponentFocus>>,
      width: number,
      height: number,
    ) => {
      // Keep surrounding board context: use half the normal component-fit zoom.
      const target = compose(
        translate(width / 2, height / 2),
        scale(0.5, 0.5),
        translate(-width / 2, -height / 2),
        focus.transform,
      )
      cancelSearchAnimation()
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setTransform(target)
      } else {
        animateTransform({
          startTransform: transform,
          endTransform: target,
          durationMs: 450,
          onUpdate: setTransform,
          setAnimationFrameId: (id) => {
            animationFrameRef.current = id
          },
        })
      }
      const request = { pcbComponentId: focus.component.pcb_component_id }
      searchRequestRef.current = request
      setFocusedPcbComponent(request)
    },
    [transform, setTransform, cancelSearchAnimation, setFocusedPcbComponent],
  )

  return { focusComponent, cancelSearchAnimation, clearSearchFocus }
}
