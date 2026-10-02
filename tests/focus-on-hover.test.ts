import { describe, expect, it } from "bun:test"
import type { ComponentProps } from "react"
import type { PCBViewer } from "../src/PCBViewer"

describe("focusOnHover vs disableAutoFocus", () => {
  it("accepts focusOnHover prop and rejects disableAutoFocus", () => {
    type PCBViewerProps = ComponentProps<typeof PCBViewer>

    type HasFocusOnHover = "focusOnHover" extends keyof PCBViewerProps
      ? true
      : false
    type HasDisableAutoFocus = "disableAutoFocus" extends keyof PCBViewerProps
      ? true
      : false

    const hasFocusOnHover: HasFocusOnHover = true
    const hasDisableAutoFocus: HasDisableAutoFocus = false

    expect(hasFocusOnHover).toBe(true)
    expect(hasDisableAutoFocus).toBe(false)
  })
})
