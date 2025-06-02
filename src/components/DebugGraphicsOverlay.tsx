import type { GraphicsObject } from "graphics-debug"
import type { Matrix } from "transformation-matrix"
import { drawGraphicsToCanvas } from "graphics-debug"
import { useEffect, useRef } from "react"
import { useMeasure } from "react-use"
import { useGlobalStore } from "../global-store"

interface Props {
  transform?: Matrix
  debugGraphics?: GraphicsObject | null
  children?: any
}

export const DebugGraphicsOverlay = ({
  children,
  transform,
  debugGraphics,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()
  const is_showing_autorouting = useGlobalStore((s) => s.is_showing_autorouting)

  useEffect(() => {
    if (!is_showing_autorouting) return
    if (canvasRef.current && debugGraphics && width && height) {
      canvasRef.current.width = width
      canvasRef.current.height = height
      drawGraphicsToCanvas(debugGraphics, canvasRef.current, {
        transform,
        disableLabels: true,
      })
    }
  }, [debugGraphics, transform, width, height, is_showing_autorouting])

  if (!is_showing_autorouting) return children

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0.5,
          zIndex: 100,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
