import { Fragment, useEffect, useState } from "react"
import { css } from "@emotion/css"
import { type LayerRef, type PcbTraceError, all_layers } from "circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { LAYER_NAME_TO_COLOR } from "lib/Drawer"
import { useGlobalStore } from "../global-store"
import packageJson from "../../package.json"
import { useHotKey } from "hooks/useHotKey"
import { zIndexMap } from "lib/util/z-index-map"
import { useIsSmallScreen } from "hooks/useIsSmallScreen"

interface Props {
  children?: any
  elements?: AnyCircuitElement[]
}

export const LayerButton = ({
  name,
  selected,
  onClick,
}: {
  name: string
  selected?: boolean
  onClick: (e: any) => any
}) => {
  return (
    <div
      className={css`
        margin-top: 2px;
        padding: 4px;
        padding-left: 8px;
        padding-right: 18px;
        cursor: pointer;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}
      onClick={onClick}
    >
      <span style={{ marginRight: 2, opacity: selected ? 1 : 0 }}>•</span>
      <span
        style={{
          marginLeft: 2,
          fontWeight: 500,
          color: (LAYER_NAME_TO_COLOR as any)[name.replace(/-/, "")],
        }}
      >
        {name}
      </span>
    </div>
  )
}

export const ToolbarButton = ({
  children,
  isSmallScreen,
  onClick,
  ...props
}: any) => (
  <div
    {...props}
    onClick={onClick}
    onTouchEnd={(e: any) => {
      e.preventDefault()
      e.stopPropagation()
      if (onClick) {
        onClick(e)
      }
    }}
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
      touchAction: "manipulation",
      userSelect: "none",
      whiteSpace: "nowrap",
      ...props.style,
    }}
  >
    {children}
  </div>
)
const CheckboxMenuItem = ({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) => {
  return (
    <div
      className={css`
        margin-top: 2px;
        padding: 4px;
        padding-left: 8px;
        padding-right: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
    >
      <input type="checkbox" checked={checked} onChange={() => {}} readOnly />
      <span style={{ color: "#eee" }}>{label}</span>
    </div>
  )
}

export const ToolbarOverlay = ({ children, elements }: Props) => {
  const isSmallScreen = useIsSmallScreen()
  const [isMouseOverContainer, setIsMouseOverContainer] = useGlobalStore(
    (s) => [s.is_mouse_over_container, s.setIsMouseOverContainer],
  ) as [boolean, (isFocused: boolean) => void]
  const [isViewMenuOpen, setViewMenuOpen] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)
  const [isErrorsOpen, setErrorsOpen] = useState(false)
  const [measureToolArmed, setMeasureToolArmed] = useState(false)
  const [selectedLayer, selectLayer] = useGlobalStore(
    (s) => [s.selected_layer, s.selectLayer] as const,
  )
  const [
    in_move_footprint_mode,
    in_draw_trace_mode,
    is_showing_rats_nest,
    is_showing_multiple_traces_length,
    is_showing_autorouting,
    is_showing_drc_errors,
    is_showing_pcb_groups,
  ] = useGlobalStore((s) => [
    s.in_move_footprint_mode,
    s.in_draw_trace_mode,
    s.is_showing_rats_nest,
    s.is_showing_multiple_traces_length,
    s.is_showing_autorouting,
    s.is_showing_drc_errors,
    s.is_showing_pcb_groups,
  ])
  const setEditMode = useGlobalStore((s) => s.setEditMode)
  const setIsShowingRatsNest = useGlobalStore((s) => s.setIsShowingRatsNest)
  const setIsShowingMultipleTracesLength = useGlobalStore(
    (s) => s.setIsShowingMultipleTracesLength,
  )
  const setIsShowingAutorouting = useGlobalStore(
    (s) => s.setIsShowingAutorouting,
  )
  const setIsShowingDrcErrors = useGlobalStore((s) => s.setIsShowingDrcErrors)
  const setIsShowingPcbGroups = useGlobalStore((s) => s.setIsShowingPcbGroups)

  useEffect(() => {
    const arm = () => setMeasureToolArmed(true)
    const disarm = () => setMeasureToolArmed(false)
    window.addEventListener("arm-dimension-tool", arm)
    window.addEventListener("disarm-dimension-tool", disarm)
    return () => {
      window.removeEventListener("arm-dimension-tool", arm)
      window.removeEventListener("disarm-dimension-tool", disarm)
    }
  }, [])

  useHotKey("1", () => selectLayer("top"))
  useHotKey("2", () => selectLayer("bottom"))
  useHotKey("3", () => selectLayer("inner1"))
  useHotKey("4", () => selectLayer("inner2"))
  useHotKey("5", () => selectLayer("inner3"))
  useHotKey("6", () => selectLayer("inner4"))
  useHotKey("7", () => selectLayer("inner5"))
  useHotKey("8", () => selectLayer("inner6"))

  const errorCount =
    elements?.filter((e) => e.type.includes("error")).length ?? 0
  return (
    <div
      style={{ position: "relative", zIndex: "999 !important" }}
      onMouseEnter={() => {
        setIsMouseOverContainer(true)
      }}
      onMouseLeave={(e) => {
        setIsMouseOverContainer(false)
        setLayerMenuOpen(false)
        setViewMenuOpen(false)
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 8,
          pointerEvents: "none",
          color: "white",
          fontSize: 11,
          opacity: isMouseOverContainer ? 0.5 : 0,
          transition: "opacity 1s",
          transitionDelay: "2s",
          fontFamily: "sans-serif",
        }}
      >
        @tscircuit/pcb-viewer@{packageJson.version}
      </div>
      <div
        data-toolbar-overlay
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          opacity: isSmallScreen ? 1 : isMouseOverContainer ? 1 : 0,
          top: 16,
          left: 16,
          right: isSmallScreen ? 16 : "auto",
          transition: isMouseOverContainer
            ? "opacity 100ms linear"
            : "opacity 300ms linear",
          zIndex: zIndexMap.toolbarOverlay,
          color: "red",
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          fontSize: 12,
          fontFamily: "sans-serif",
        }}
      >
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          onClick={() => {
            setLayerMenuOpen(!isLayerMenuOpen)
          }}
          onMouseLeave={() => {
            if (isLayerMenuOpen) {
              setLayerMenuOpen(false)
            }
          }}
        >
          <div>
            layer:{" "}
            <span
              style={{
                marginLeft: 2,
                fontWeight: 500,
                color: (LAYER_NAME_TO_COLOR as any)[selectedLayer as string],
              }}
            >
              {selectedLayer as string}
            </span>
          </div>
          {isLayerMenuOpen && (
            <div style={{ marginTop: 4, minWidth: 120 }}>
              {all_layers
                .map((l) => l.replace(/-/g, "")) // TODO remove when inner-1 becomes inner1
                .map((layer) => (
                  <LayerButton
                    key={layer}
                    name={layer}
                    selected={layer === selectedLayer}
                    onClick={() => {
                      selectLayer(layer.replace(/-/, "") as LayerRef)
                    }}
                  />
                ))}
            </div>
          )}
        </ToolbarButton>
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{
            position: "relative",
            ...(errorCount > 0 ? { color: "red" } : {}),
          }}
          onClick={() => setErrorsOpen(!isErrorsOpen)}
        >
          <div>{errorCount} errors</div>
        </ToolbarButton>
        {isErrorsOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              backgroundColor: "#2a2a2a",
              border: "1px solid #666",
              borderRadius: 4,
              marginTop: 4,
              zIndex: 1000,
              minWidth: isSmallScreen ? "280px" : "400px",
              maxWidth: isSmallScreen ? "90vw" : "600px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            {elements
              ?.filter((e): e is PcbTraceError => e.type.includes("error"))
              .map((e, i) => (
                <div
                  key={i}
                  style={{
                    borderBottom:
                      i <
                      elements.filter((el): el is PcbTraceError =>
                        el.type.includes("error"),
                      ).length -
                        1
                        ? "1px solid #444"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      cursor: "pointer",
                      backgroundColor: "#2a2a2a",
                      transition: "background-color 0.2s ease",
                      touchAction: "manipulation",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#333"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2a2a2a"
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      e.currentTarget.style.backgroundColor = "#333"
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      e.currentTarget.style.backgroundColor = "#2a2a2a"

                      const errorElement = document.querySelector(
                        `[data-error-id="${i}"]`,
                      ) as HTMLElement
                      const arrow = document.querySelector(
                        `[data-arrow-id="${i}"]`,
                      ) as HTMLElement
                      if (errorElement && arrow) {
                        const isVisible = errorElement.style.display !== "none"
                        errorElement.style.display = isVisible
                          ? "none"
                          : "block"
                        arrow.style.transform = isVisible
                          ? "rotate(90deg)"
                          : "rotate(0deg)"
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const errorElement = document.querySelector(
                        `[data-error-id="${i}"]`,
                      ) as HTMLElement
                      const arrow = document.querySelector(
                        `[data-arrow-id="${i}"]`,
                      ) as HTMLElement
                      if (errorElement && arrow) {
                        const isVisible = errorElement.style.display !== "none"
                        errorElement.style.display = isVisible
                          ? "none"
                          : "block"
                        arrow.style.transform = isVisible
                          ? "rotate(90deg)"
                          : "rotate(0deg)"
                      }
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: isSmallScreen ? "12px" : "13px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {e.error_type}
                    </div>
                    <div
                      data-arrow-id={i}
                      style={{
                        color: "#888",
                        fontSize: "16px",
                        transform: "rotate(90deg)",
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      ›
                    </div>
                  </div>
                  <div
                    data-error-id={i}
                    style={{
                      display: "none",
                      padding: "12px 16px",
                      backgroundColor: "#1a1a1a",
                      borderTop: "1px solid #444",
                    }}
                  >
                    <div
                      style={{
                        fontSize: isSmallScreen ? "11px" : "12px",
                        color: "#ccc",
                        lineHeight: 1.5,
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        hyphens: "auto",
                      }}
                    >
                      {e.message}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={() => {
            setEditMode(in_draw_trace_mode ? "off" : "draw_trace")
          }}
        >
          <div>
            {in_draw_trace_mode ? "✖ " : ""}
            Edit Traces
          </div>
        </ToolbarButton>
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={() => {
            setEditMode(in_move_footprint_mode ? "off" : "move_footprint")
          }}
        >
          <div>
            {in_move_footprint_mode ? "✖ " : ""}
            Move Components
          </div>
        </ToolbarButton>
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={() => {
            setIsShowingRatsNest(!is_showing_rats_nest)
          }}
        >
          <div>
            {is_showing_rats_nest ? "✖ " : ""}
            Rats Nest
          </div>
        </ToolbarButton>

        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={measureToolArmed ? { backgroundColor: "#444" } : {}}
          onClick={() => {
            setMeasureToolArmed(true)
            window.dispatchEvent(new Event("arm-dimension-tool"))
          }}
        >
          <div>📏</div>
        </ToolbarButton>

        <ToolbarButton
          isSmallScreen={isSmallScreen}
          onClick={() => {
            setViewMenuOpen(!isViewMenuOpen)
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              View
              <span
                style={{
                  fontSize: "8px",
                  transform: isViewMenuOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.1s ease",
                  display: "inline-block",
                }}
              >
                ▼
              </span>
            </div>
            {isViewMenuOpen && (
              <div style={{ marginTop: 4, minWidth: 120 }}>
                <CheckboxMenuItem
                  label="Show All Trace Lengths"
                  checked={is_showing_multiple_traces_length}
                  onClick={() => {
                    setIsShowingMultipleTracesLength(
                      !is_showing_multiple_traces_length,
                    )
                  }}
                />
                <CheckboxMenuItem
                  label="Show Autorouting Animation"
                  checked={is_showing_autorouting}
                  onClick={() => {
                    setIsShowingAutorouting(!is_showing_autorouting)
                  }}
                />
                <CheckboxMenuItem
                  label="Show DRC Errors"
                  checked={is_showing_drc_errors}
                  onClick={() => {
                    setIsShowingDrcErrors(!is_showing_drc_errors)
                  }}
                />
                <CheckboxMenuItem
                  label="Show PCB Groups"
                  checked={is_showing_pcb_groups}
                  onClick={() => {
                    setIsShowingPcbGroups(!is_showing_pcb_groups)
                  }}
                />
              </div>
            )}
          </div>
        </ToolbarButton>
      </div>
    </div>
  )
}
