import type { Primitive } from "./types"

export const getPrimitivesForDrawer = ({
  primitives,
  isShowingSolderMask,
  isShowingSilkscreen,
  isShowingFabricationNotes,
}: {
  primitives: Primitive[]
  isShowingSolderMask: boolean
  isShowingSilkscreen: boolean
  isShowingFabricationNotes: boolean
}) =>
  primitives
    .filter(
      (primitive) =>
        isShowingSolderMask || !primitive.layer?.includes("soldermask"),
    )
    .filter(
      (primitive) =>
        isShowingSilkscreen || !primitive.layer?.includes("silkscreen"),
    )
    .filter(
      (primitive) =>
        isShowingFabricationNotes || !primitive.layer?.includes("fabrication"),
    )
    .filter((primitive) => primitive.layer !== "board")
    .filter((primitive) => primitive._element?.type !== "pcb_smtpad")
    .filter(
      (primitive) =>
        primitive._element?.type !== "pcb_plated_hole" ||
        primitive.layer === "drill",
    )
    .filter((primitive) => primitive._element?.type !== "pcb_via")
    .filter((primitive) => primitive._element?.type !== "pcb_trace")
    .filter((primitive) => primitive._element?.type !== "pcb_copper_text")
