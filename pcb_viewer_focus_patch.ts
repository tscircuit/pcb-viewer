/**
 * tscircuit / pcb-viewer focus patch
 * Refactors legacy disableAutoFocus prop to focusOnHover={false}
 */
export interface PcbViewerProps {
  focusOnHover?: boolean;
  /** @deprecated use focusOnHover={false} instead */
  disableAutoFocus?: boolean;
  width?: number;
  height?: number;
}

export function resolveViewerFocusConfig(props: PcbViewerProps): {
  focusOnHover: boolean;
} {
  if (typeof props.focusOnHover === "boolean") {
    return { focusOnHover: props.focusOnHover };
  }
  if (typeof props.disableAutoFocus === "boolean") {
    return { focusOnHover: !props.disableAutoFocus };
  }
  return { focusOnHover: true };
}
