// 2D Rotation Matrix Transformation for Non-Centered Pad Holes
export function rotateHoleOffset(
  holeOffsetX: number,
  holeOffsetY: number,
  angleRad: number
): { rotatedX: number; rotatedY: number } {
  return {
    rotatedX: holeOffsetX * Math.cos(angleRad) - holeOffsetY * Math.sin(angleRad),
    rotatedY: holeOffsetX * Math.sin(angleRad) + holeOffsetY * Math.cos(angleRad),
  };
}
