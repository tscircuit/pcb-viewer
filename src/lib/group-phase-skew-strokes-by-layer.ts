import type { LayerStroke } from "@tscircuit/circuit-json-webgpu"

/** Phase skew strokes keyed by layer, so each copper canvas draws only its own. */
export type PhaseSkewStrokesByLayer = Map<LayerStroke["layer"], LayerStroke[]>

/** Groups `phaseSkewStrokes` by layer, keeping their order within each layer. */
export function groupPhaseSkewStrokesByLayer(
  phaseSkewStrokes: LayerStroke[],
): PhaseSkewStrokesByLayer {
  const phaseSkewStrokesByLayer: PhaseSkewStrokesByLayer = new Map()
  for (const stroke of phaseSkewStrokes) {
    const layerStrokes = phaseSkewStrokesByLayer.get(stroke.layer)
    if (layerStrokes) {
      layerStrokes.push(stroke)
      continue
    }
    phaseSkewStrokesByLayer.set(stroke.layer, [stroke])
  }
  return phaseSkewStrokesByLayer
}
