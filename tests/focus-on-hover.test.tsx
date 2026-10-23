import { expect, test } from "bun:test"
import React from "react"
import { FocusOnHoverFalse } from "../src/examples/2025/board.fixture"

test("FocusOnHoverFalse fixture renders with focusOnHover disabled", () => {
  const element = FocusOnHoverFalse()
  expect(element).toBeDefined()
  expect(element.props.style.backgroundColor).toBe("black")
  const pcbViewer = element.props.children
  expect(pcbViewer.props.focusOnHover).toBe(false)
})
