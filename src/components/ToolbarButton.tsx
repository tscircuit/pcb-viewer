import type React from "react"
import { useMobileTouch } from "hooks/useMobileTouch"

export interface ToolbarButtonProps {
  children: React.ReactNode
  isSmallScreen: boolean
  onClick?: (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
  ) => void
  style?: React.CSSProperties
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
}

export const ToolbarButton = ({
  children,
  isSmallScreen,
  onClick,
  ...props
}: ToolbarButtonProps) => {
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(onClick)

  return (
    <div
      {...props}
      {...touchHandlers}
      style={{
        backgroundColor: "#1F1F1F",
        border: "1px solid #666",
        margin: 0,
        padding: 4,
        paddingLeft: isSmallScreen ? 8 : 6,
        paddingRight: isSmallScreen ? 8 : 6,
        borderRadius: 2,
        color: "#eee",
        cursor: "pointer",
        fontSize: 12,
        height: "fit-content",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...touchStyle,
        ...props.style,
      }}
    >
      {children}
    </div>
  )
}
