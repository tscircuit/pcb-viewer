import { memo, useMemo } from "react"
import { zIndexMap } from "lib/util/z-index-map"

type ScreenSnapPoint = {
  id: string
  screenPoint: { x: number; y: number }
}

const markerPath = ({ screenPoint: { x, y } }: ScreenSnapPoint) =>
  `M${x - 2.5},${y - 2.5}l5,5m0,-5l-5,5`

export const DimensionSnapGuides = memo(function DimensionSnapGuides({
  points,
  startId,
  endId,
}: {
  points: ScreenSnapPoint[]
  startId: string | null
  endId: string | null
}) {
  // Board geometry and the view transform determine the guides. Moving the
  // measuring endpoint should only update the two highlighted markers.
  const { path, pointsById } = useMemo(
    () => ({
      path: points.map(markerPath).join(""),
      pointsById: new Map(points.map((point) => [point.id, point])),
    }),
    [points],
  )
  const activePath = [...new Set([startId, endId])]
    .flatMap((id) => {
      const point = id === null ? undefined : pointsById.get(id)
      return point ? [markerPath(point)] : []
    })
    .join("")

  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "visible",
        pointerEvents: "none",
        zIndex: zIndexMap.dimensionOverlay,
      }}
      fill="none"
      strokeWidth={1}
    >
      <path d={path} stroke="white" />
      <path d={activePath} stroke="#66ccff" />
    </svg>
  )
})
