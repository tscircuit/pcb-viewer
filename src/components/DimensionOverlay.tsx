import { zIndexMap } from "lib/util/z-index-map"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import type { Primitive } from "lib/types"
import type { NinePointAnchor } from "circuit-json"
import {
  getPrimitiveBoundingBox,
  mergeBoundingBoxes,
} from "lib/util/get-primitive-bounding-box"
import type { BoundingBox } from "lib/util/get-primitive-bounding-box"

interface Props {
  transform?: Matrix
  children: any
  focusOnHover?: boolean
  primitives?: Primitive[]
}

const SNAP_THRESHOLD_PX = 16
const SNAP_MARKER_SIZE = 5

const shouldExcludePrimitiveFromSnapping = (primitive: Primitive) => {
  if (primitive.pcb_drawing_type === "text") return true

  const element = primitive._element as { type?: unknown } | undefined
  if (!element || typeof element !== "object") {
    return false
  }

  const elementType =
    typeof element.type === "string" ? (element.type as string) : undefined

  if (!elementType) return false

  if (elementType.startsWith("pcb_silkscreen_")) return true
  if (elementType.startsWith("pcb_note_")) return true
  if (elementType === "pcb_text") return true
  if (
    elementType.startsWith("pcb_fabrication_note_") &&
    elementType !== "pcb_fabrication_note_rect"
  ) {
    return true
  }

  return false
}

export const DimensionOverlay = ({
  children,
  transform,
  focusOnHover = false,
  primitives = [],
}: Props) => {
  if (!transform) transform = identity()
  const [dimensionToolVisible, setDimensionToolVisible] = useState(false)
  const [dimensionToolStretching, setDimensionToolStretching] = useState(false)
  const [measureToolArmed, setMeasureToolArmed] = useState(false)
  const [activeSnapIds, setActiveSnapIds] = useState({
    start: null as string | null,
    end: null as string | null,
  })

  const disarmMeasure = useCallback(() => {
    if (measureToolArmed) {
      setMeasureToolArmed(false)
      window.dispatchEvent(new Event("disarm-dimension-tool"))
    }
  }, [measureToolArmed])
  // Start of dimension tool line in real-world coordinates (not screen)
  const [dStart, setDStart] = useState({ x: 0, y: 0 })
  // End of dimension tool line in real-world coordinates (not screen)
  const [dEnd, setDEnd] = useState({ x: 0, y: 0 })
  const mousePosRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const container = containerRef.current!
  const containerBounds = container?.getBoundingClientRect()

  const elementBoundingBoxes = useMemo(() => {
    const boundingBoxes = new Map<object, BoundingBox>()

    for (const primitive of primitives) {
      if (!primitive._element) continue
      if (shouldExcludePrimitiveFromSnapping(primitive)) continue
      const bbox = getPrimitiveBoundingBox(primitive)
      if (!bbox) continue

      const existing = boundingBoxes.get(primitive._element as object)
      boundingBoxes.set(
        primitive._element as object,
        mergeBoundingBoxes(existing ?? undefined, bbox),
      )
    }

    return boundingBoxes
  }, [primitives])

  const snappingPoints = useMemo(() => {
    const points: {
      anchor: NinePointAnchor
      point: { x: number; y: number }
      element: object
    }[] = []

    elementBoundingBoxes.forEach((bounds, element) => {
      if (!bounds) return

      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2

      const anchorPoints: Record<NinePointAnchor, { x: number; y: number }> = {
        top_left: { x: bounds.minX, y: bounds.minY },
        top_center: { x: centerX, y: bounds.minY },
        top_right: { x: bounds.maxX, y: bounds.minY },
        center_left: { x: bounds.minX, y: centerY },
        center: { x: centerX, y: centerY },
        center_right: { x: bounds.maxX, y: centerY },
        bottom_left: { x: bounds.minX, y: bounds.maxY },
        bottom_center: { x: centerX, y: bounds.maxY },
        bottom_right: { x: bounds.maxX, y: bounds.maxY },
      }

      for (const [anchor, point] of Object.entries(anchorPoints) as [
        NinePointAnchor,
        { x: number; y: number },
      ][]) {
        points.push({
          anchor,
          point,
          element,
        })
      }
    })

    return points
  }, [elementBoundingBoxes])

  const snappingPointsWithScreen = useMemo(() => {
    return snappingPoints.map((snap, index) => ({
      ...snap,
      id: `${index}-${snap.anchor}`,
      screenPoint: applyToPoint(transform!, snap.point),
    }))
  }, [snappingPoints, transform])

  const findSnap = useCallback(
    (rwPoint: { x: number; y: number }) => {
      if (snappingPointsWithScreen.length === 0) {
        return { point: rwPoint, id: null as string | null }
      }

      const screenPoint = applyToPoint(transform!, rwPoint)
      let bestMatch: {
        distance: number
        id: string
        point: { x: number; y: number }
      } | null = null

      for (const snap of snappingPointsWithScreen) {
        const dx = snap.screenPoint.x - screenPoint.x
        const dy = snap.screenPoint.y - screenPoint.y
        const distance = Math.hypot(dx, dy)

        if (distance > SNAP_THRESHOLD_PX) continue
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            distance,
            id: snap.id,
            point: snap.point,
          }
        }
      }

      if (!bestMatch) {
        return { point: rwPoint, id: null as string | null }
      }

      return { point: bestMatch.point, id: bestMatch.id }
    },
    [snappingPointsWithScreen, transform],
  )

  useEffect(() => {
    const container = containerRef.current

    const down = (e: KeyboardEvent) => {
      if (e.key === "d") {
        const snap = findSnap({
          x: mousePosRef.current.x,
          y: mousePosRef.current.y,
        })

        setDStart({ x: snap.point.x, y: snap.point.y })
        setDEnd({ x: snap.point.x, y: snap.point.y })
        setActiveSnapIds({ start: snap.id, end: snap.id })

        if (dimensionToolVisible) {
          setDimensionToolVisible(false)
          setDimensionToolStretching(false)
          setActiveSnapIds({ start: null, end: null })
        } else {
          setDimensionToolVisible(true)
          setDimensionToolStretching(true)
        }
        disarmMeasure()
      }
      if (e.key === "Escape") {
        setDimensionToolVisible(false)
        setDimensionToolStretching(false)
        setActiveSnapIds({ start: null, end: null })
        disarmMeasure()
      }
    }

    const armMeasure = () => {
      setMeasureToolArmed(true)
    }

    const addKeyListener = () => {
      if (container) {
        window.addEventListener("keydown", down)
      }
    }

    const removeKeyListener = () => {
      if (container) {
        window.removeEventListener("keydown", down)
      }
    }
    window.addEventListener("arm-dimension-tool", armMeasure)

    if (container) {
      container.addEventListener("focus", addKeyListener)
      container.addEventListener("blur", removeKeyListener)
      container.addEventListener("mouseenter", addKeyListener)
      container.addEventListener("mouseleave", removeKeyListener)
    }
    return () => {
      window.removeEventListener("arm-dimension-tool", armMeasure)
      disarmMeasure()
      if (container) {
        container.removeEventListener("focus", addKeyListener)
        container.removeEventListener("blur", removeKeyListener)
        container.removeEventListener("mouseenter", addKeyListener)
        container.removeEventListener("mouseleave", removeKeyListener)
      }
    }
  }, [containerRef, dimensionToolVisible, disarmMeasure, findSnap])

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
      // biome-ignore lint/a11y/noNoninteractiveTabindex: <explanation>
      tabIndex={0}
      style={{ position: "relative" }}
      onMouseEnter={() => {
        if (focusOnHover && containerRef.current) {
          containerRef.current.focus()
        }
      }}
      onMouseLeave={() => {
        if (containerRef.current) {
          containerRef.current.blur()
        }
      }}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const rwPoint = applyToPoint(inverse(transform!), { x, y })
        mousePosRef.current.x = rwPoint.x
        mousePosRef.current.y = rwPoint.y

        if (dimensionToolStretching) {
          const snap = findSnap(rwPoint)
          setDEnd({ x: snap.point.x, y: snap.point.y })
          setActiveSnapIds((prev) => ({ ...prev, end: snap.id }))
        }
      }}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const rwPoint = applyToPoint(inverse(transform!), { x, y })

        if (measureToolArmed && !dimensionToolVisible) {
          const snap = findSnap(rwPoint)
          setDStart({ x: snap.point.x, y: snap.point.y })
          setDEnd({ x: snap.point.x, y: snap.point.y })
          setActiveSnapIds({ start: snap.id, end: snap.id })
          setDimensionToolVisible(true)
          setDimensionToolStretching(true)
          disarmMeasure()
        } else if (dimensionToolStretching) {
          setDimensionToolStretching(false)
          setActiveSnapIds((prev) => ({ ...prev, end: null }))
        } else if (dimensionToolVisible) {
          setDimensionToolVisible(false)
          setActiveSnapIds({ start: null, end: null })
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
              zIndex: zIndexMap.dimensionOverlay,
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
              zIndex: zIndexMap.dimensionOverlay,
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
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              pointerEvents: "none",
              mixBlendMode: "difference",
              zIndex: zIndexMap.dimensionOverlay,
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
          {dimensionToolStretching &&
            snappingPointsWithScreen.map((snap) => {
              const isActive =
                snap.id === activeSnapIds.start || snap.id === activeSnapIds.end
              const half = SNAP_MARKER_SIZE / 2
              return (
                <svg
                  key={snap.id}
                  width={SNAP_MARKER_SIZE}
                  height={SNAP_MARKER_SIZE}
                  style={{
                    position: "absolute",
                    left: snap.screenPoint.x - half,
                    top: snap.screenPoint.y - half,
                    pointerEvents: "none",
                    zIndex: zIndexMap.dimensionOverlay,
                  }}
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={SNAP_MARKER_SIZE}
                    y2={SNAP_MARKER_SIZE}
                    stroke={isActive ? "#66ccff" : "white"}
                    strokeWidth={1}
                  />
                  <line
                    x1={SNAP_MARKER_SIZE}
                    y1={0}
                    x2={0}
                    y2={SNAP_MARKER_SIZE}
                    stroke={isActive ? "#66ccff" : "white"}
                    strokeWidth={1}
                  />
                </svg>
              )
            })}
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
              (dEnd.x - dStart.x) ** 2 + (dEnd.y - dStart.y) ** 2,
            ).toFixed(2)}
          </div>
        </>
      )}
    </div>
  )
}
