import type {
  AnyCircuitElement,
  PcbConnectorNotInAccessibleOrientationWarning,
  PcbManualEditConflictWarning,
} from "circuit-json";

export type HighlightablePcbWarning =
  PcbManualEditConflictWarning | PcbConnectorNotInAccessibleOrientationWarning;

export const isHighlightablePcbWarning = (
  element: AnyCircuitElement,
): element is HighlightablePcbWarning =>
  element.type === "pcb_manual_edit_conflict_warning" ||
  element.type === "pcb_connector_not_in_accessible_orientation_warning";

export const getPcbWarningHighlightLabel = (
  warning: HighlightablePcbWarning,
): string => {
  if (warning.type === "pcb_connector_not_in_accessible_orientation_warning") {
    return `Connector faces ${warning.facing_direction}; expected ${warning.recommended_facing_direction}`;
  }

  return "Manual Edit Conflict";
};
