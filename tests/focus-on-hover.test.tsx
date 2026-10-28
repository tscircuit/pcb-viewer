import { expect, test } from "bun:test"
import type { ComponentProps } from "react"
import { PCBViewer } from "../src/PCBViewer"
import boardFixtures, {
  FocusOnHoverDisabled,
} from "../src/examples/2025/board.fixture"

type PCBViewerProps = ComponentProps<typeof PCBViewer>

test("PCBViewer accepts focusOnHover={false} and rejects legacy disableAutoFocus prop", () => {
  const validProps: PCBViewerProps = {
    circuitJson: [],
    focusOnHover: false,
  }

  // @ts-expect-error disableAutoFocus has been removed in favor of focusOnHover={false}
  const legacyProps: PCBViewerProps = {
    circuitJson: [],
    disableAutoFocus: true,
  }

  expect(validProps.focusOnHover).toBe(false)
  expect(legacyProps).toBeDefined()
})

test("board.fixture exports FocusOnHoverDisabled with focusOnHover={false}", () => {
  expect(typeof FocusOnHoverDisabled).toBe("function")
  expect(boardFixtures.FocusOnHoverDisabled).toBe(FocusOnHoverDisabled)
  expect("DisabledAutoFocus" in boardFixtures).toBe(false)

  const element = FocusOnHoverDisabled()
  expect(element.props.children.type).toBe(PCBViewer)
  expect(element.props.children.props.focusOnHover).toBe(false)
})
