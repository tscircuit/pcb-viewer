import type { ComponentProps } from "react"
import { PCBViewer } from "../src/PCBViewer"

type PCBViewerProps = ComponentProps<typeof PCBViewer>

const currentApi: PCBViewerProps = {
  circuitJson: [],
  focusOnHover: false,
}

// The legacy prop must stay removed. If it is reintroduced, this directive becomes
// unused and `tsc --noEmit` fails, protecting the public API migration.
// @ts-expect-error disableAutoFocus was replaced by focusOnHover
const legacyApi: PCBViewerProps = { circuitJson: [], disableAutoFocus: true }

void currentApi
void legacyApi
