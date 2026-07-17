export const zIndexMap = {
  elementOverlay: 40,
  dimensionOverlay: 40,
  editTraceHintOverlay: 40,
  errorOverlay: 40,
  pcbGroupOverlay: 35,
  ratsNestOverlay: 30,
  toolbarOverlay: 70,
  warnings: 30,
  // Canvas layers are assigned z-indexes below this value. A 10-layer board
  // needs 26 canvas planes once masks, silkscreen, notes, and other overlays
  // are included, so keep enough room for the complete stack.
  topLayer: 30,
  clickToInteractOverlay: 100,
}
