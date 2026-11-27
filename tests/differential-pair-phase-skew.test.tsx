import { expect, test } from "bun:test"
import "bun-match-svg"
import { createCanvas } from "@napi-rs/canvas"
import { Circuit } from "@tscircuit/core"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { compose, scale, translate } from "transformation-matrix"
import { ForumExampleBoard } from "./fixtures/differential-pair-phase-skew/forum-example-board/forum-example-board"

test("phase skew overlay on the KiCad forum pair", async () => {
  const circuit = new Circuit()
  circuit.add(<ForumExampleBoard />)
  await circuit.renderUntilSettled()

  const canvas = createCanvas(800, 300)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.realToCanvasMat = compose(translate(400, 250), scale(35, -35))
  drawer.drawElements(circuit.getCircuitJson(), {
    showDifferentialPairPhaseSkew: true,
  })

  const png = canvas.toBuffer("image/png").toString("base64")
  await expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><image width="800" height="300" href="data:image/png;base64,${png}"/></svg>`,
  ).toMatchSvgSnapshot(import.meta.path, "differential-pair-phase-skew")
})
