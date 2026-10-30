import { css } from "@emotion/css"
import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { getToolbarButtonStyle } from "./ToolbarButton"

// A shared slot keeps SVGs and font-dependent emoji on the same toolbar grid.
const iconSize = 18
const iconButtonClass = css`
  &:hover, &:focus-visible { background: #444 !important; }
`

type Props = ComponentPropsWithoutRef<"button"> & { isSmallScreen: boolean }

export const ToolbarIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ children, isSmallScreen, style, ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type="button"
      className={iconButtonClass}
      style={{
        ...getToolbarButtonStyle(isSmallScreen),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxSizing: "content-box",
        lineHeight: 1,
        touchAction: "manipulation",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: iconSize,
          height: iconSize,
          flexShrink: 0,
        }}
      >
        {children}
      </span>
    </button>
  ),
)
