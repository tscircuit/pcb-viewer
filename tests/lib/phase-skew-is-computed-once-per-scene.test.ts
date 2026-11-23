import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSceneDifferentialPairPhaseSkews } from "../../src/lib/get-scene-differential-pair-phase-skews"
import { renderUsbPairBoard } from "../fixtures/phase-skew/usb-pair-board"

test("turning phase skew off and on again reuses the scene's calculation", () => {
  const elements = renderUsbPairBoard() as AnyCircuitElement[]
  const shown = getSceneDifferentialPairPhaseSkews({ elements })
  const shownAgain = getSceneDifferentialPairPhaseSkews({ elements })
  expect(shownAgain).toBe(shown)
  // An edited board is a new scene and gets its own calculation.
  const edited = getSceneDifferentialPairPhaseSkews({ elements: [...elements] })
  expect(edited).not.toBe(shown)
  expect(edited).toEqual(shown)
})
