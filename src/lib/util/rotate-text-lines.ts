export const rotateText = (params: {
  x: number
  y: number
  angle: number
  originX: number
  originY: number
}) => {
  const { x, y, angle, originX, originY } = params
  const radians = (Math.PI / 180) * angle // Convert to radians
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  // Translate point back to origin
  const translatedX = x - originX
  const translatedY = y - originY

  // Apply rotation
  const rotatedX = translatedX * cos - translatedY * sin
  const rotatedY = translatedX * sin + translatedY * cos

  // Translate point back to original position
  return { x: rotatedX + originX, y: rotatedY + originY }
}
