export interface DiagonalLabelParams {
  dimensionStart: { x: number; y: number }
  dimensionEnd: { x: number; y: number }
  screenDimensionStart: { x: number; y: number }
  screenDimensionEnd: { x: number; y: number }
  flipX: boolean
  flipY: boolean
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
    flipX,
    flipY,
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

  // Calculate angle of the measurement line
  const angle = Math.atan2(screenDeltaY, screenDeltaX) * (180 / Math.PI)

  const normalizedAngle = Math.abs(angle) % 90
  const angleFromAxis = Math.min(normalizedAngle, 90 - normalizedAngle)
  const isDiagonal = angleFromAxis > 15

  // Find midpoint of the diagonal line
  const midX = (screenDimensionStart.x + screenDimensionEnd.x) / 2
  const midY = (screenDimensionStart.y + screenDimensionEnd.y) / 2

  // Offset perpendicular to the line, always pointing away from the inner triangle
  const offsetDistance = 15
  const perpendicularAngle = angle + 90

  let offsetX = Math.cos((perpendicularAngle * Math.PI) / 180) * offsetDistance
  let offsetY = Math.sin((perpendicularAngle * Math.PI) / 180) * offsetDistance

  const isNE = screenDeltaX > 0 && screenDeltaY < 0
  const isNW = screenDeltaX < 0 && screenDeltaY < 0
  const isSE = screenDeltaX > 0 && screenDeltaY > 0
  const isSW = screenDeltaX < 0 && screenDeltaY > 0

  if (flipX !== flipY && !isNE) {
    offsetX = -offsetX
    offsetY = -offsetY
  }

  if (isNE) {
    const lessOffset = -45
    offsetX += Math.cos((perpendicularAngle * Math.PI) / 180) * lessOffset
    offsetY += Math.sin((perpendicularAngle * Math.PI) / 180) * lessOffset
  }

  if (isSE) {
    const seAdjust = -10
    offsetX += Math.cos((perpendicularAngle * Math.PI) / 180) + seAdjust * 2
    offsetY += Math.sin((perpendicularAngle * Math.PI) / 180) + seAdjust
  }

  if (isSW) {
    const reduceOffset = 10
    offsetX += Math.cos((perpendicularAngle * Math.PI) / 180) * reduceOffset
    offsetY += Math.sin((perpendicularAngle * Math.PI) / 180) * reduceOffset
  }

  const x = midX + offsetX
  const y = midY + offsetY

  return {
    distance,
    screenDistance,
    x,
    y,
    show: distance > 0.01 && screenDistance > 30 && isDiagonal,
  }
}
