export interface DiagonalLabelParams {
  realWorldStart: { x: number; y: number }
  realWorldEnd: { x: number; y: number }
  screenStart: { x: number; y: number }
  screenEnd: { x: number; y: number }
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
  const { realWorldStart, realWorldEnd, screenStart, screenEnd } = params

  // Calculate real-world distance
  const deltaX = realWorldEnd.x - realWorldStart.x
  const deltaY = realWorldEnd.y - realWorldStart.y
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  // Calculate screen distance and angle
  const screenDeltaX = screenEnd.x - screenStart.x
  const screenDeltaY = screenEnd.y - screenStart.y
  const screenDistance = Math.sqrt(
    screenDeltaX * screenDeltaX + screenDeltaY * screenDeltaY,
  )

  // Find midpoint
  const midX = (screenStart.x + screenEnd.x) / 2
  const midY = (screenStart.y + screenEnd.y) / 2

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
