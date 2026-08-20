import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import {
  createPcbComponentFocusTransform,
  getPcbComponentFocusTarget,
  PCB_COMPONENT_FOCUS_MAX_SCALE,
  shouldHandlePcbComponentFocusRequest,
  shouldResetBoardTransform,
} from "../../src/lib/util/pcb-component-focus"

const elements = [
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_target",
    source_component_id: "source_component_target",
    center: { x: 10, y: 5 },
    width: 2,
    height: 2,
    layer: "bottom",
    rotation: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "left_pad",
    pcb_component_id: "pcb_component_target",
    pcb_port_id: "left_port",
    shape: "rect",
    x: 6,
    y: 5,
    width: 2,
    height: 4,
    layer: "bottom",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "right_pad",
    pcb_component_id: "pcb_component_target",
    pcb_port_id: "right_port",
    shape: "rect",
    x: 14,
    y: 5,
    width: 2,
    height: 4,
    layer: "bottom",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_unrelated",
    source_component_id: "source_component_unrelated",
    center: { x: 100, y: 100 },
    width: 40,
    height: 40,
    layer: "top",
    rotation: 0,
  },
] as AnyCircuitElement[]

test("component focus covers the complete footprint and centers it with padding", () => {
  const target = getPcbComponentFocusTarget(elements, "pcb_component_target")!

  expect(target.bounds).toEqual({ minX: 5, minY: 3, maxX: 15, maxY: 7 })
  const transform = createPcbComponentFocusTransform({
    target,
    width: 800,
    height: 600,
  })
  expect(applyToPoint(transform, { x: 10, y: 5 })).toEqual({
    x: 400,
    y: 300,
  })
  expect(Math.abs(transform.a)).toBeLessThanOrEqual(
    PCB_COMPONENT_FOCUS_MAX_SCALE,
  )

  const paddedTopLeft = applyToPoint(transform, { x: 3.25, y: 8.75 })
  const paddedBottomRight = applyToPoint(transform, { x: 16.75, y: 1.25 })
  expect(paddedTopLeft.x).toBeGreaterThan(0)
  expect(paddedTopLeft.y).toBeGreaterThan(0)
  expect(paddedBottomRight.x).toBeLessThan(800)
  expect(paddedBottomRight.y).toBeLessThan(600)
})

test("a new request ID retriggers focus for the same component", () => {
  const firstRequest = {
    pcbComponentId: "pcb_component_target",
    requestId: 1,
  }
  const secondRequest = { ...firstRequest, requestId: 2 }

  expect(shouldHandlePcbComponentFocusRequest(firstRequest, null)).toBe(true)
  expect(shouldHandlePcbComponentFocusRequest(firstRequest, 1)).toBe(false)
  expect(shouldHandlePcbComponentFocusRequest(secondRequest, 1)).toBe(true)
})

test("invalid component IDs fail safely", () => {
  expect(getPcbComponentFocusTarget(elements, "missing_component")).toBeNull()
})

test("component focus suppresses board reset during tab mounting", () => {
  expect(
    shouldResetBoardTransform({
      initialRenderCompleted: false,
      boardSizeChanged: false,
      hasValidFocusRequest: true,
    }),
  ).toBe(false)
  expect(
    shouldResetBoardTransform({
      initialRenderCompleted: true,
      boardSizeChanged: true,
      hasValidFocusRequest: true,
    }),
  ).toBe(false)
  expect(
    shouldResetBoardTransform({
      initialRenderCompleted: false,
      boardSizeChanged: false,
      hasValidFocusRequest: false,
    }),
  ).toBe(true)
})

test("bottom-layer components request the bottom layer", () => {
  expect(
    getPcbComponentFocusTarget(elements, "pcb_component_target")?.layer,
  ).toBe("bottom")
})
