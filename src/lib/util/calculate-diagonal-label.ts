export interface DiagonalLabelParams {
  dimensionStart: { x: number; y: number }
  dimensionEnd: { x: number; y: number }
  screenDimensionStart: { x: number; y: number }
  screenDimensionEnd: { x: number; y: number }
}

export interface DiagonalLabelResult {
  distance: number
  screenDistance: number
  x: number
  y: number
  show: boolean
}

export function calculateDiagonalLabel(
  params: DiagonalLabelParams,
): DiagonalLabelResult {
  const {
    dimensionStart,
    dimensionEnd,
    screenDimensionStart,
    screenDimensionEnd,
  } = params

  // Calculate dimension distance in world coordinates
  const deltaX = dimensionEnd.x - dimensionStart.x
  const deltaY = dimensionEnd.y - dimensionStart.y
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  // Calculate screen distance and angle
  const screenDeltaX = screenDimensionEnd.x - screenDimensionStart.x
  const screenDeltaY = screenDimensionEnd.y - screenDimensionStart.y
  const screenDistance = Math.sqrt(
    screenDeltaX * screenDeltaX + screenDeltaY * screenDeltaY,
  )

  // Find midpoint in screen coordinates
  const midX = (screenDimensionStart.x + screenDimensionEnd.x) / 2
  const midY = (screenDimensionStart.y + screenDimensionEnd.y) / 2

  // Calculate angle of the measurement line
  const angle = Math.atan2(screenDeltaY, screenDeltaX) * (180 / Math.PI)

  // Offset perpendicular to the line to avoid collision with the line itself
  const offsetDistance = 15
  const perpendicularAngle = angle + 90
  const offsetX =
    Math.cos((perpendicularAngle * Math.PI) / 180) * offsetDistance
  const offsetY =
    Math.sin((perpendicularAngle * Math.PI) / 180) * offsetDistance

  return {
    distance,
    screenDistance,
    x: midX + offsetX,
    y: midY + offsetY,
    show: distance > 0.01 && screenDistance > 30,
  }
}
