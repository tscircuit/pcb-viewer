import { useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"

interface Props {
  transform?: Matrix
  children: any
}

export const DimensionOverlay = ({ children, transform }: Props) => {
  if (!transform) transform = identity()
  const [dimensionToolVisible, setDimensionToolVisible] = useState(false)
  const [dimensionToolStretching, setDimensionToolStretching] = useState(false)
  // Start of dimension tool line in real-world coordinates (not screen)
  const [dStart, setDStart] = useState({ x: 0, y: 0 })
  // End of dimension tool line in real-world coordinates (not screen)
  const [dEnd, setDEnd] = useState({ x: 0, y: 0 })
  const mousePosRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const container = containerRef.current!
  const containerBounds = container?.getBoundingClientRect()
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      console.log("got event")
      console.log(e.key)
      if (e.key === "d") {
        setDStart({ x: mousePosRef.current.x, y: mousePosRef.current.y })
        setDEnd({ x: mousePosRef.current.x, y: mousePosRef.current.y })
        setDimensionToolVisible((visible: boolean) => !visible)
        setDimensionToolStretching(true)
        e.preventDefault()
      }
      if (e.key === "Escape") {
        setDimensionToolVisible(false)
        setDimensionToolStretching(false)
      }
    }

    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [containerRef]) // TODO attempt to add event listener on mount and add keydown to ref

  const screenDStart = applyToPoint(transform, dStart)
  const screenDEnd = applyToPoint(transform, dEnd)

  const arrowScreenBounds = {
    left: Math.min(screenDStart.x, screenDEnd.x),
    right: Math.max(screenDStart.x, screenDEnd.x),
    top: Math.min(screenDStart.y, screenDEnd.y),
    bottom: Math.max(screenDStart.y, screenDEnd.y),
    flipX: screenDStart.x > screenDEnd.x,
    flipY: screenDStart.y > screenDEnd.y,
    width: 0,
    height: 0,
  }
  arrowScreenBounds.width = arrowScreenBounds.right - arrowScreenBounds.left
  arrowScreenBounds.height = arrowScreenBounds.bottom - arrowScreenBounds.top

  return (
    <div
      ref={containerRef}
      style={{ position: "relative" }}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const rwPoint = applyToPoint(inverse(transform!), { x, y })
        mousePosRef.current.x = rwPoint.x
        mousePosRef.current.y = rwPoint.y

        if (dimensionToolStretching) {
          setDEnd({ x: rwPoint.x, y: rwPoint.y })
        }
      }}
      onMouseDown={() => {
        if (dimensionToolStretching) {
          setDimensionToolStretching(false)
        } else if (dimensionToolVisible) {
          setDimensionToolVisible(false)
        }
      }}
    >
      {children}
      {dimensionToolVisible && (
        <>
          <div
            style={{
              position: "absolute",
              left: arrowScreenBounds.left,
              width: arrowScreenBounds.width,
              textAlign: "center",
              top: screenDStart.y + 2,
              color: "red",
              mixBlendMode: "difference",
              pointerEvents: "none",
              marginTop: arrowScreenBounds.flipY ? 0 : -20,
              fontSize: 12,
              fontFamily: "sans-serif",
              zIndex: 1000,
            }}
          >
            {Math.abs(dStart.x - dEnd.x).toFixed(2)}
          </div>
          <div
            style={{
              position: "absolute",
              left: screenDEnd.x,
              height: arrowScreenBounds.height,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              top: arrowScreenBounds.top,
              color: "red",
              pointerEvents: "none",
              mixBlendMode: "difference",
              fontSize: 12,
              fontFamily: "sans-serif",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                marginLeft: arrowScreenBounds.flipX ? "-100%" : 4,
                paddingRight: 4,
              }}
            >
              {Math.abs(dStart.y - dEnd.y).toFixed(2)}
            </div>
          </div>
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              pointerEvents: "none",
              mixBlendMode: "difference",
              zIndex: 1000,
            }}
            width={containerBounds.width}
            height={containerBounds.height}
          >
            <defs>
              <marker
                id="head"
                orient="auto"
                markerWidth="3"
                markerHeight="4"
                refX="2"
                refY="2"
              >
                <path d="M0,0 V4 L2,2 Z" fill="red" />
              </marker>
            </defs>
            <line
              x1={screenDStart.x}
              y1={screenDStart.y}
              x2={screenDEnd.x}
              y2={screenDEnd.y}
              markerEnd="url(#head)"
              strokeWidth={1.5}
              fill="none"
              stroke="red"
            />
            <line
              x1={screenDStart.x}
              y1={screenDStart.y}
              x2={screenDEnd.x}
              y2={screenDStart.y}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray={"2,2"}
              stroke="red"
            />
            <line
              x1={screenDEnd.x}
              y1={screenDStart.y}
              x2={screenDEnd.x}
              y2={screenDEnd.y}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray={"2,2"}
              stroke="red"
            />
          </svg>
          <div
            style={{
              right: 0,
              bottom: 0,
              position: "absolute",
              color: "red",
              fontFamily: "sans-serif",
              fontSize: 12,
              margin: 4,
            }}
          >
            ({dStart.x.toFixed(2)},{dStart.y.toFixed(2)})<br />(
            {dEnd.x.toFixed(2)},{dEnd.y.toFixed(2)})<br />
            dist:{" "}
            {Math.sqrt(
              Math.pow(dEnd.x - dStart.x, 2) + Math.pow(dEnd.y - dStart.y, 2),
            ).toFixed(2)}
          </div>
        </>
      )}
    </div>
  )
}
