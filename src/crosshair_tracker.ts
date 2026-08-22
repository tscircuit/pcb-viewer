export function formatPcbMmCoordinates(canvasX: number, canvasY: number, scale: number): { xMm: string; yMm: string } {
  return {
    xMm: (canvasX / scale).toFixed(3),
    yMm: (canvasY / scale).toFixed(3)
  };
}
