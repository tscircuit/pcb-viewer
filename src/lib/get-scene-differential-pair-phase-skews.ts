import type { AnyCircuitElement } from "circuit-json"
import {
  type DifferentialPairPhaseSkew,
  getDifferentialPairPhaseSkew,
} from "circuit-json-to-differential-pair-phase-skew"

/** Phase skew by scene, kept while the overlay is off so turning it on again doesn't recompute it. */
const differentialPairPhaseSkewsByScene = new WeakMap<
  AnyCircuitElement[],
  DifferentialPairPhaseSkew[]
>()

/** The phase skew of every pair in `elements`, computed once per scene. */
export function getSceneDifferentialPairPhaseSkews({
  elements,
}: {
  elements: AnyCircuitElement[]
}): DifferentialPairPhaseSkew[] {
  const cachedDifferentialPairPhaseSkews =
    differentialPairPhaseSkewsByScene.get(elements)
  if (cachedDifferentialPairPhaseSkews) return cachedDifferentialPairPhaseSkews
  const differentialPairPhaseSkews = getDifferentialPairPhaseSkew({
    circuitJson: elements,
  })
  differentialPairPhaseSkewsByScene.set(elements, differentialPairPhaseSkews)
  return differentialPairPhaseSkews
}
