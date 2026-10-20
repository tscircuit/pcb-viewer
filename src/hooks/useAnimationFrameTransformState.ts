import { useCallback, useEffect, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"

export function useAnimationFrameTransformState(initialTransform: Matrix) {
  const [transform, setTransformState] = useState(initialTransform)
  const animationFrameIdRef = useRef<number | null>(null)
  const pendingTransformRef = useRef<Matrix | null>(null)

  const setTransform = useCallback((nextTransform: Matrix) => {
    pendingTransformRef.current = nextTransform
    if (animationFrameIdRef.current !== null) return

    animationFrameIdRef.current = requestAnimationFrame(() => {
      animationFrameIdRef.current = null
      if (!pendingTransformRef.current) return
      setTransformState(pendingTransformRef.current)
      pendingTransformRef.current = null
    })
  }, [])

  useEffect(
    () => () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    },
    [],
  )

  return { setTransform, transform }
}
