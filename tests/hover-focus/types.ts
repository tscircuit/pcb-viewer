import type { ComponentProps } from "react"
import type { PCBViewer } from "../../src/index"

export type CurrentHoverProp = ComponentProps<typeof PCBViewer>["focusOnHover"]
type Props = ComponentProps<typeof PCBViewer>
// @ts-expect-error The legacy prop must remain absent from the public API.
export type RemovedHoverProp = Props["disableAutoFocus"]
