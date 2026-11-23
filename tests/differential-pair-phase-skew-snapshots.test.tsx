import { afterAll, beforeAll, expect, test } from "bun:test"
import { cju } from "@tscircuit/circuit-json-util"
import "bun-match-svg"
import type { CircuitJson, Point } from "circuit-json"
import { getDifferentialPairPhaseSkew } from "circuit-json-to-differential-pair-phase-skew"
import { getPcbViewportBounds } from "../src/lib/get-pcb-viewport-bounds"
import type { PhaseSkewColorOverrides } from "../src/lib/get-phase-skew-strokes"
import {
  CustomColorsBoard,
  FourLanesBoard,
  LayerChangeBoard,
  LoadEndMeanderBoard,
  LocalCompensationBoard,
  MatchedPairBoard,
  MitredBendsBoard,
  PadShapesBoard,
  PadTapersBoard,
  PartiallyRoutedBoard,
  RendererComparisonBoard,
  phaseSkewColors,
  renderBoard,
} from "./fixtures/phase-skew/example-boards"
import {
  type RgbPixel,
  boardPointToScreen,
  screenshotPixelsAt,
  selectLayer,
  snapshotCopper,
  startPhaseSkewBrowser,
  togglePhaseSkew,
} from "./fixtures/phase-skew/open-phase-skew-page"
import { renderUnnamedPairBoard } from "./fixtures/phase-skew/unnamed-pair-board"

const WHITE: RgbPixel = [255, 255, 255]
const BLUE: RgbPixel = [0, 0, 255]
const RED: RgbPixel = [255, 0, 0]
const GREY: RgbPixel = [128, 128, 128]
const TOP_COPPER: RgbPixel = [200, 52, 52]

type SnapshotCase = {
  name: string
  title: string
  render: () => CircuitJson
  probes: [x: number, y: number, color: RgbPixel][]
  copperLayers?: ("top" | "bottom")[]
  drills?: Point[]
  colors?: PhaseSkewColorOverrides
  toggleOff?: boolean
  checkBoard?: (circuitJson: CircuitJson) => void
}

const cases: SnapshotCase[] = [
  {
    name: "matched",
    title: "Matched pair stays white from source to load",
    render: () => renderBoard(<MatchedPairBoard />),
    probes: [
      [-10, 0.6, WHITE],
      [10, -0.6, WHITE],
    ],
  },
  {
    name: "load-end-meander",
    title: "Load-end meander brings both traces back to white",
    render: () => renderBoard(<LoadEndMeanderBoard />),
    probes: [
      [0, 0.6, BLUE],
      [0, -0.6, RED],
      [11.4, 0.6, WHITE],
      [11.4, -0.6, WHITE],
    ],
  },
  {
    name: "local-compensation",
    title:
      "Upper pair corrects early while lower pair carries skew to the load",
    render: () => renderBoard(<LocalCompensationBoard />),
    probes: [
      [8, 2.8, WHITE],
      [8, 1.6, WHITE],
      [8, -1.6, BLUE],
      [8, -2.8, RED],
    ],
  },
  {
    name: "four-lanes",
    title: "Four lanes show zero skew, both polarities and a polarity reversal",
    render: () => renderBoard(<FourLanesBoard />),
    probes: [
      [10, 6.6, WHITE],
      [10, 2.6, BLUE],
      [10, -1.4, RED],
      [0, -5.4, RED],
      [10, -5.4, BLUE],
    ],
  },
  {
    name: "layer-change",
    title: "Skew reaches the vias on top copper and the drills stay open",
    render: () => renderBoard(<LayerChangeBoard />),
    probes: [
      [-2, 0.6, BLUE],
      [-2, -0.6, RED],
    ],
    copperLayers: ["bottom", "top"],
    drills: [
      { x: 0, y: 0.6 },
      { x: 0, y: -0.6 },
    ],
  },
  {
    name: "pad-tapers",
    title: "Overlay widens over the teardrop tapers at the pads",
    render: () => renderBoard(<PadTapersBoard />),
    probes: [
      [-11.75, 0.85, WHITE],
      [11.75, 0.85, BLUE],
      [11.75, -0.85, RED],
    ],
  },
  {
    name: "pad-shapes",
    title: "Jogs inside pill and polygon pads leave the coupled run white",
    render: () => renderBoard(<PadShapesBoard />),
    probes: [
      [-10, 1.5 - 2 * (0.9 / 3.9), GREY],
      [10, -1.5 + 2 * (0.9 / 3.9), GREY],
      [0, 0.6, WHITE],
      [0, -0.6, WHITE],
    ],
    checkBoard: (circuitJson) => {
      const [pair] = getDifferentialPairPhaseSkew({ circuitJson })
      expect(pair.end_to_end_length_delta).toBe(0)
      expect(pair.max_abs_phase_skew).toBe(0)
    },
  },
  {
    name: "mitred-bends",
    title: "Opposite 45° bends swap the red and blue traces",
    render: () => renderBoard(<MitredBendsBoard />),
    probes: [
      [-4, 2.6, RED],
      [0, 4.6, WHITE],
      [4, 2.6, BLUE],
    ],
  },
  {
    name: "unnamed-pair",
    title: "A pair without net names still shows blue and red skew",
    render: () =>
      renderUnnamedPairBoard([
        { x: 5, y: 0 },
        { x: 6, y: 1 },
        { x: 7, y: 0 },
      ]),
    probes: [
      [0, 0.3, BLUE],
      [0, -0.3, RED],
    ],
    checkBoard: (circuitJson) => {
      expect(
        cju(circuitJson)
          .source_trace.list()
          .map((trace) => trace.name),
      ).toEqual([undefined, undefined])
    },
  },
  {
    name: "custom-colors",
    title:
      "Custom colors use cream for zero, teal for ahead and orange for behind",
    render: () => renderBoard(<CustomColorsBoard />),
    colors: phaseSkewColors,
    probes: [
      [-10, 0.6, [255, 241, 188]],
      [0, 0.6, [255, 141, 50]],
      [0, -0.6, [41, 226, 189]],
    ],
  },
  {
    name: "bottom-layer",
    title:
      "Selected bottom copper carries skew past the vias to the correction",
    render: () => renderBoard(<LayerChangeBoard />),
    probes: [
      [2, 0.6, BLUE],
      [2, -0.6, RED],
      [10, 0.6, WHITE],
      [10, -0.6, WHITE],
    ],
    copperLayers: ["top", "bottom"],
    drills: [
      { x: 0, y: 0.6 },
      { x: 0, y: -0.6 },
    ],
  },
  {
    name: "partially-routed",
    title:
      "A partially routed pair keeps plain copper above the white matched pair",
    render: () => renderBoard(<PartiallyRoutedBoard />),
    probes: [
      [0, 2.6, TOP_COPPER],
      [0, -1.4, WHITE],
      [0, -2.6, WHITE],
    ],
    checkBoard: (circuitJson) => {
      expect(cju(circuitJson).source_bus.list()).toHaveLength(2)
      expect(getDifferentialPairPhaseSkew({ circuitJson })).toHaveLength(1)
    },
  },
  {
    name: "overlay-off",
    title: "Turning the overlay off restores plain copper on both traces",
    render: () => renderBoard(<RendererComparisonBoard />),
    probes: [
      [0, 0.6, TOP_COPPER],
      [0, -0.6, TOP_COPPER],
    ],
    toggleOff: true,
  },
]

let harness: Awaited<ReturnType<typeof startPhaseSkewBrowser>>
beforeAll(async () => {
  harness = await startPhaseSkewBrowser("canvas")
})
afterAll(async () => {
  await harness?.close()
})

for (const example of cases) {
  test(example.title, async () => {
    const circuitJson = example.render()
    example.checkBoard?.(circuitJson)
    const board = getPcbViewportBounds(circuitJson)
    const points = example.probes.map(([x, y]) =>
      boardPointToScreen({ x, y }, board),
    )
    const expected = example.probes.map(([, , color]) => color)
    const drillPoints = (example.drills ?? []).map((point) =>
      boardPointToScreen(point, board),
    )

    const { page, errors, close } = await harness.open({
      circuitJson,
      phaseSkewColors: example.colors,
    })
    try {
      if (example.copperLayers?.at(-1) === "bottom") {
        await selectLayer({ page, layer: "bottom" })
      }
      const drillPixels = drillPoints.length
        ? await screenshotPixelsAt({ page, points: drillPoints })
        : []

      await togglePhaseSkew({ page })
      if (example.toggleOff) {
        expect(await screenshotPixelsAt({ page, points })).toEqual([BLUE, RED])
        await togglePhaseSkew({ page })
      }

      expect(
        await screenshotPixelsAt({ page, points: [...points, ...drillPoints] }),
      ).toEqual([...expected, ...drillPixels])
      expect(errors).toEqual([])

      if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE === undefined) {
        const svg = await snapshotCopper({
          page,
          title: example.title,
          layers: example.copperLayers,
        })
        await expect(svg).toMatchSvgSnapshot(
          import.meta.path,
          `differential-pair-phase-skew-${example.name}`,
        )
      }
    } finally {
      await close()
    }
  }, 60000)
}
