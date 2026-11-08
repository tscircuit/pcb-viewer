import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { identity } from "transformation-matrix"
import {
  drawCourtyardElementsForLayer,
  getCourtyardElementsForLayer,
} from "../../src/lib/draw-courtyard"
import {
  drawPcbNoteElementsForLayer,
  getPcbNoteElementsForLayer,
} from "../../src/lib/draw-pcb-note"

const createMockCanvas = () => {
  const ops: string[] = []
  const ctx = {
    canvas: { width: 100, height: 100 },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {
      ops.push("closePath")
    },
    moveTo: () => {
      ops.push("moveTo")
    },
    lineTo: () => {
      ops.push("lineTo")
    },
    arcTo: () => {},
    arc: () => {
      ops.push("arc")
    },
    ellipse: () => {},
    rect: () => {
      ops.push("rect")
    },
    stroke: () => {
      ops.push("stroke")
    },
    fill: () => {
      ops.push("fill")
    },
    setLineDash: () => {},
  }
  return {
    ops,
    canvas: {
      width: 100,
      height: 100,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement,
  }
}

describe("drawPcbNoteElementsForLayer", () => {
  const noteElements: AnyCircuitElement[] = [
    {
      type: "pcb_note_rect",
      pcb_note_rect_id: "layerless_note_rect",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      stroke_width: 0.1,
    } as AnyCircuitElement,
    {
      type: "pcb_note_line",
      pcb_note_line_id: "bottom_note_line",
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      stroke_width: 0.1,
      layer: "bottom",
    } as AnyCircuitElement,
  ]

  it("defaults layerless pcb_note_* elements to top_user_note and draws them", () => {
    const topNotes = getPcbNoteElementsForLayer({
      elements: noteElements,
      layers: ["top_user_note"],
    })
    expect(topNotes).toHaveLength(1)
    expect((topNotes[0] as any).layer).toBe("top")

    const bottomNotes = getPcbNoteElementsForLayer({
      elements: noteElements,
      layers: ["bottom_user_note"],
    })
    expect(bottomNotes).toHaveLength(1)
    expect((bottomNotes[0] as any).pcb_note_line_id).toBe("bottom_note_line")

    const topCanvas = createMockCanvas()
    drawPcbNoteElementsForLayer({
      canvas: topCanvas.canvas,
      elements: noteElements,
      layers: ["top_user_note"],
      realToCanvasMat: identity(),
    })
    expect(topCanvas.ops).toContain("rect")
    expect(topCanvas.ops).toContain("stroke")
  })
})

describe("drawCourtyardElementsForLayer", () => {
  const courtyardElements: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: "top_poly",
      pcb_component_id: "comp_1",
      layer: "top",
      points: [
        { x: -2, y: -1 },
        { x: 2, y: -1 },
        { x: 2, y: 1 },
        { x: -2, y: 1 },
      ],
    },
    {
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: "bottom_circle",
      pcb_component_id: "comp_1",
      center: { x: 0, y: 0 },
      radius: 2,
      layer: "bottom",
    },
  ]

  it("supports pcb_courtyard_polygon elements and filters by board side", () => {
    const topCourtyards = getCourtyardElementsForLayer({
      elements: courtyardElements,
      layers: ["top_courtyard"],
    })
    expect(topCourtyards).toHaveLength(1)
    expect(topCourtyards[0]?.type).toBe("pcb_courtyard_outline")

    const topCanvas = createMockCanvas()
    drawCourtyardElementsForLayer({
      canvas: topCanvas.canvas,
      elements: courtyardElements,
      layers: ["top_courtyard"],
      realToCanvasMat: identity(),
    })
    expect(topCanvas.ops).toContain("moveTo")
    expect(topCanvas.ops).toContain("lineTo")
    expect(topCanvas.ops).toContain("closePath")
    expect(topCanvas.ops).not.toContain("arc")

    const bottomCanvas = createMockCanvas()
    drawCourtyardElementsForLayer({
      canvas: bottomCanvas.canvas,
      elements: courtyardElements,
      layers: ["bottom_courtyard"],
      realToCanvasMat: identity(),
    })
    expect(bottomCanvas.ops).toContain("arc")
  })
})
