/** Format an anchor offset label, appending "mm" only when the display offset
 * doesn't already carry a unit (e.g. "5mm" from core vs. a computed 5.00). */
export const formatOffsetLabel = (
  displayOffset: string | number | undefined,
  computedOffsetMm: number,
): string => {
  const value =
    displayOffset === undefined || displayOffset === null
      ? computedOffsetMm.toFixed(2)
      : String(displayOffset)
  return value.trim().endsWith("mm") ? value : `${value}mm`
}
