import React, {
  Fragment,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"
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
  children?: React.ReactNode
  elements?: AnyCircuitElement[]
}

interface LayerButtonProps {
  name: string
  selected?: boolean
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
}

interface ToolbarButtonProps {
  children: React.ReactNode
  isSmallScreen: boolean
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  style?: React.CSSProperties
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void
}

interface CheckboxMenuItemProps {
  label: string
  checked: boolean
  onClick: () => void
}

interface RadioMenuItemProps {
  label: string
  checked: boolean
  onClick: () => void
}

export const LayerButton = ({ name, selected, onClick }: LayerButtonProps) => {
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
}: ToolbarButtonProps) => (
  <div
    {...props}
    onClick={onClick}
    onTouchEnd={(e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (onClick) {
        onClick(e as any)
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
}: CheckboxMenuItemProps) => {
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        onClick()
      }}
      onTouchEnd={(e: React.TouchEvent<HTMLDivElement>) => {
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

const RadioMenuItem = ({ label, checked, onClick }: RadioMenuItemProps) => {
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        onClick()
      }}
      onTouchEnd={(e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
    >
      <input type="radio" checked={checked} onChange={() => {}} readOnly />
      <span style={{ color: "#eee" }}>{label}</span>
    </div>
  )
}

export const ToolbarOverlay = ({ children, elements }: Props) => {
  const isSmallScreen = useIsSmallScreen()

  const {
    isMouseOverContainer,
    setIsMouseOverContainer,
    selectedLayer,
    selectLayer,
    editModes,
    viewSettings,
    setEditMode,
    setIsShowingRatsNest,
    setIsShowingMultipleTracesLength,
    setIsShowingAutorouting,
    setIsShowingDrcErrors,
    setIsShowingCopperPours,
    setIsShowingPcbGroups,
    setPcbGroupViewMode,
    setHoveredErrorId,
  } = useGlobalStore((s) => ({
    isMouseOverContainer: s.is_mouse_over_container,
    setIsMouseOverContainer: s.setIsMouseOverContainer,
    selectedLayer: s.selected_layer,
    selectLayer: s.selectLayer,
    editModes: {
      in_move_footprint_mode: s.in_move_footprint_mode,
      in_draw_trace_mode: s.in_draw_trace_mode,
    },
    viewSettings: {
      is_showing_rats_nest: s.is_showing_rats_nest,
      is_showing_multiple_traces_length: s.is_showing_multiple_traces_length,
      is_showing_autorouting: s.is_showing_autorouting,
      is_showing_drc_errors: s.is_showing_drc_errors,
      is_showing_copper_pours: s.is_showing_copper_pours,
      is_showing_pcb_groups: s.is_showing_pcb_groups,
      pcb_group_view_mode: s.pcb_group_view_mode,
    },
    setEditMode: s.setEditMode,
    setIsShowingRatsNest: s.setIsShowingRatsNest,
    setIsShowingMultipleTracesLength: s.setIsShowingMultipleTracesLength,
    setIsShowingAutorouting: s.setIsShowingAutorouting,
    setIsShowingDrcErrors: s.setIsShowingDrcErrors,
    setIsShowingCopperPours: s.setIsShowingCopperPours,
    setIsShowingPcbGroups: s.setIsShowingPcbGroups,
    setPcbGroupViewMode: s.setPcbGroupViewMode,
    setHoveredErrorId: s.setHoveredErrorId,
  }))

  const [isViewMenuOpen, setViewMenuOpen] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)
  const [isErrorsOpen, setErrorsOpen] = useState(false)
  const [measureToolArmed, setMeasureToolArmed] = useState(false)

  const errorElementsRef = useRef<Map<number, HTMLElement>>(new Map())
  const arrowElementsRef = useRef<Map<number, HTMLElement>>(new Map())

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

  const errorCount =
    elements?.filter((e) => e.type.includes("error")).length ?? 0

  const errorElements =
    elements?.filter((el): el is PcbTraceError => el.type.includes("error")) ||
    []

  // Find the PCB board to get the number of layers
  const pcbBoard = elements?.find((el) => el.type === "pcb_board") as any
  const numLayers = pcbBoard?.num_layers || 2

  // Filter layers based on PCB layer count
  const availableLayers =
    numLayers <= 2
      ? ["top", "bottom"]
      : [
          "top",
          ...Array.from({ length: numLayers - 2 }, (_, i) => `inner${i + 1}`),
          "bottom",
        ]

  const processedLayers = availableLayers

  const hotKeyCallbacks = {
    "1": availableLayers[0]
      ? () => selectLayer(availableLayers[0] as LayerRef)
      : () => {},
    "2": availableLayers[1]
      ? () => selectLayer(availableLayers[1] as LayerRef)
      : () => {},
    "3": availableLayers[2]
      ? () => selectLayer(availableLayers[2] as LayerRef)
      : () => {},
    "4": availableLayers[3]
      ? () => selectLayer(availableLayers[3] as LayerRef)
      : () => {},
    "5": availableLayers[4]
      ? () => selectLayer(availableLayers[4] as LayerRef)
      : () => {},
    "6": availableLayers[5]
      ? () => selectLayer(availableLayers[5] as LayerRef)
      : () => {},
    "7": availableLayers[6]
      ? () => selectLayer(availableLayers[6] as LayerRef)
      : () => {},
    "8": availableLayers[7]
      ? () => selectLayer(availableLayers[7] as LayerRef)
      : () => {},
  }

  useHotKey("1", hotKeyCallbacks["1"])
  useHotKey("2", hotKeyCallbacks["2"])
  useHotKey("3", hotKeyCallbacks["3"])
  useHotKey("4", hotKeyCallbacks["4"])
  useHotKey("5", hotKeyCallbacks["5"])
  useHotKey("6", hotKeyCallbacks["6"])
  useHotKey("7", hotKeyCallbacks["7"])
  useHotKey("8", hotKeyCallbacks["8"])

  const handleMouseEnter = useCallback(() => {
    setIsMouseOverContainer(true)
  }, [setIsMouseOverContainer])

  const handleMouseLeave = useCallback(() => {
    setIsMouseOverContainer(false)
    setLayerMenuOpen(false)
    setViewMenuOpen(false)
    setErrorsOpen(false)
    setHoveredErrorId(null)
  }, [setIsMouseOverContainer, setHoveredErrorId])

  const handleLayerMenuToggle = useCallback(() => {
    setLayerMenuOpen(!isLayerMenuOpen)
  }, [isLayerMenuOpen])

  const handleErrorsToggle = useCallback(() => {
    const newErrorsOpen = !isErrorsOpen
    setErrorsOpen(newErrorsOpen)
    if (newErrorsOpen) {
      setViewMenuOpen(false)
    }
    if (!newErrorsOpen) {
      setHoveredErrorId(null)
    }
  }, [isErrorsOpen, setHoveredErrorId])

  const handleEditTraceToggle = useCallback(() => {
    setEditMode(editModes.in_draw_trace_mode ? "off" : "draw_trace")
  }, [editModes.in_draw_trace_mode, setEditMode])

  const handleMoveComponentToggle = useCallback(() => {
    setEditMode(editModes.in_move_footprint_mode ? "off" : "move_footprint")
  }, [editModes.in_move_footprint_mode, setEditMode])

  const handleRatsNestToggle = useCallback(() => {
    setIsShowingRatsNest(!viewSettings.is_showing_rats_nest)
  }, [viewSettings.is_showing_rats_nest, setIsShowingRatsNest])

  const handleMeasureToolClick = useCallback(() => {
    setMeasureToolArmed(true)
    window.dispatchEvent(new Event("arm-dimension-tool"))
  }, [])

  const handleViewMenuToggle = useCallback(() => {
    const newViewMenuOpen = !isViewMenuOpen
    setViewMenuOpen(newViewMenuOpen)
    if (newViewMenuOpen) {
      setErrorsOpen(false)
    }
  }, [isViewMenuOpen])
  return (
    <div
      style={{ position: "relative", zIndex: "999 !important" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
          onClick={handleLayerMenuToggle}
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
              {processedLayers.map((layer) => (
                <LayerButton
                  key={layer}
                  name={layer}
                  selected={layer === selectedLayer}
                  onClick={() => {
                    selectLayer(layer as LayerRef)
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
          onClick={handleErrorsToggle}
        >
          <div>{errorCount} errors</div>
        </ToolbarButton>
        {isErrorsOpen && errorCount > 0 && (
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
            {errorElements.map((e, i) => {
              const errorId =
                e.pcb_trace_error_id ||
                `error_${i}_${e.error_type}_${e.message?.slice(0, 20)}`

              return (
                <div
                  key={i}
                  style={{
                    borderBottom:
                      i < errorElements.length - 1 ? "1px solid #444" : "none",
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
                      setHoveredErrorId(errorId)
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2a2a2a"
                      setHoveredErrorId(null)
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      e.currentTarget.style.backgroundColor = "#333"
                      setHoveredErrorId(errorId)
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      e.currentTarget.style.backgroundColor = "#2a2a2a"
                      setHoveredErrorId(null)

                      const errorElement = errorElementsRef.current.get(i)
                      const arrow = arrowElementsRef.current.get(i)
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
                      const errorElement = errorElementsRef.current.get(i)
                      const arrow = arrowElementsRef.current.get(i)
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
                        color: "#ff6b6b",
                        display: isSmallScreen ? "none" : "block",
                      }}
                    >
                      {e.error_type}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: isSmallScreen ? "12px" : "13px",
                        color: "#ddd",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.message}
                    </div>
                    <div
                      ref={(el) => {
                        if (el) arrowElementsRef.current.set(i, el)
                      }}
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
                    ref={(el) => {
                      if (el) errorElementsRef.current.set(i, el)
                    }}
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
              )
            })}
          </div>
        )}
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={handleEditTraceToggle}
        >
          <div>
            {editModes.in_draw_trace_mode ? "✖ " : ""}
            Edit Traces
          </div>
        </ToolbarButton>
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={handleMoveComponentToggle}
        >
          <div>
            {editModes.in_move_footprint_mode ? "✖ " : ""}
            Move Components
          </div>
        </ToolbarButton>
        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={{}}
          onClick={handleRatsNestToggle}
        >
          <div>
            {viewSettings.is_showing_rats_nest ? "✖ " : ""}
            Rats Nest
          </div>
        </ToolbarButton>

        <ToolbarButton
          isSmallScreen={isSmallScreen}
          style={measureToolArmed ? { backgroundColor: "#444" } : {}}
          onClick={handleMeasureToolClick}
        >
          <div>📏</div>
        </ToolbarButton>

        <ToolbarButton
          isSmallScreen={isSmallScreen}
          onClick={handleViewMenuToggle}
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
                  checked={viewSettings.is_showing_multiple_traces_length}
                  onClick={() => {
                    setIsShowingMultipleTracesLength(
                      !viewSettings.is_showing_multiple_traces_length,
                    )
                  }}
                />
                <CheckboxMenuItem
                  label="Show Autorouting Animation"
                  checked={viewSettings.is_showing_autorouting}
                  onClick={() => {
                    setIsShowingAutorouting(
                      !viewSettings.is_showing_autorouting,
                    )
                  }}
                />
                <CheckboxMenuItem
                  label="Show DRC Errors"
                  checked={viewSettings.is_showing_drc_errors}
                  onClick={() => {
                    setIsShowingDrcErrors(!viewSettings.is_showing_drc_errors)
                  }}
                />
                <CheckboxMenuItem
                  label="Show Copper Pours"
                  checked={viewSettings.is_showing_copper_pours}
                  onClick={() => {
                    setIsShowingCopperPours(
                      !viewSettings.is_showing_copper_pours,
                    )
                  }}
                />
                <CheckboxMenuItem
                  label="Show PCB Groups"
                  checked={viewSettings.is_showing_pcb_groups}
                  onClick={() => {
                    setIsShowingPcbGroups(!viewSettings.is_showing_pcb_groups)
                  }}
                />
                {viewSettings.is_showing_pcb_groups && (
                  <div style={{ marginLeft: 16 }}>
                    <RadioMenuItem
                      label="Show All Groups"
                      checked={viewSettings.pcb_group_view_mode === "all"}
                      onClick={() => {
                        setPcbGroupViewMode("all")
                      }}
                    />
                    <RadioMenuItem
                      label="Show Named Groups"
                      checked={
                        viewSettings.pcb_group_view_mode === "named_only"
                      }
                      onClick={() => {
                        setPcbGroupViewMode("named_only")
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </ToolbarButton>
      </div>
    </div>
  )
}
