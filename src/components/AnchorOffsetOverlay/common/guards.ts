import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
} from "circuit-json"

export const isPcbComponent = (
  element?: AnyCircuitElement,
): element is PcbComponent => element?.type === "pcb_component"

export const isPcbGroup = (element?: AnyCircuitElement): element is PcbGroup =>
  element?.type === "pcb_group"

export const isPcbBoard = (element?: AnyCircuitElement): element is PcbBoard =>
  element?.type === "pcb_board"

export type BoardAnchoredComponent = PcbComponent & {
  positioned_relative_to_pcb_board_id?: string
}

export const isBoardAnchoredComponent = (
  component: PcbComponent,
): component is BoardAnchoredComponent =>
  "positioned_relative_to_pcb_board_id" in component
