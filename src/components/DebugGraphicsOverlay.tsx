import type { GraphicsObject } from "graphics-debug"
import type { Matrix } from "transformation-matrix"
import { drawGraphicsToCanvas } from "graphics-debug"
import { useEffect, useRef } from "react"
import { useMeasure } from "react-use"

interface Props {
  transform?: Matrix
  debugGraphics?: GraphicsObject
  children?: any
}

export const DebugGraphicsOverlay = ({
  children,
  transform,
  debugGraphics,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()

  useEffect(() => {
    if (canvasRef.current && debugGraphics && width && height) {
      canvasRef.current.width = width
      canvasRef.current.height = height
      drawGraphicsToCanvas(debugGraphics, canvasRef.current, {
        transform,
      })
    }
  }, [debugGraphics, transform, width, height])

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
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
