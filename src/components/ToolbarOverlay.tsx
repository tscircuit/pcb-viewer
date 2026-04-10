import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
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
import { useCopyToClipboard } from "react-use"
import { useMobileTouch } from "hooks/useMobileTouch"

interface Props {
  children?: React.ReactNode
  elements?: AnyCircuitElement[]
}

interface LayerButtonProps {
  name: string
  selected?: boolean
  onClick: (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
  ) => void
}

interface ToolbarButtonProps {
  children: React.ReactNode
  isSmallScreen: boolean
  onClick?: (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
  ) => void
  style?: React.CSSProperties
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
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
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(onClick)
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
      {...touchHandlers}
      style={touchStyle}
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
const CheckboxMenuItem = ({
  label,
  checked,
  onClick,
}: CheckboxMenuItemProps) => {
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(onClick)
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
      {...touchHandlers}
      style={touchStyle}
    >
      <input type="checkbox" checked={checked} onChange={() => {}} readOnly />
      <span style={{ color: "#eee" }}>{label}</span>
    </div>
  )
}

const RadioMenuItem = ({ label, checked, onClick }: RadioMenuItemProps) => {
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(onClick)
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
      {...touchHandlers}
      style={touchStyle}
    >
      <input type="radio" checked={checked} onChange={() => {}} readOnly />
      <span style={{ color: "#eee" }}>{label}</span>
    </div>
  )
}

const CopyErrorButton = ({
  errorId,
  errorMessage,
  copiedErrorId,
  onCopy,
}: {
  errorId: string
  errorMessage: string
  copiedErrorId: string | null
  onCopy: (errorMessage: string, errorId: string) => void
}) => {
  const { style: touchStyle, ...touchHandlers } = useMobileTouch(() =>
    onCopy(errorMessage, errorId),
  )

  return (
    <button
      type="button"
      aria-label={
        copiedErrorId === errorId
          ? "Error message copied"
          : "Copy error message"
      }
      style={{
        position: "absolute",
        top: 12,
        right: 16,
        cursor: "pointer",
        color: "#888",
        fontSize: 16,
        background: "none",
        border: "none",
        padding: 0,
        display: "flex",
        alignItems: "center",
        ...touchStyle,
      }}
      {...touchHandlers}
    >
      {copiedErrorId === errorId ? (
        <span style={{ color: "#4caf50", fontSize: 12 }}>Copied!</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
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
    setIsShowingCourtyards,
    setIsShowingPcbGroups,
    setIsShowingGroupAnchorOffsets,
    setIsShowingSolderMask,
    setIsShowingSilkscreen,
    setIsShowingFabricationNotes,
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
      is_showing_courtyards: s.is_showing_courtyards,
      is_showing_pcb_groups: s.is_showing_pcb_groups,
      is_showing_group_anchor_offsets: s.is_showing_group_anchor_offsets,
      is_showing_solder_mask: s.is_showing_solder_mask,
      is_showing_silkscreen: s.is_showing_silkscreen,
      is_showing_fabrication_notes: s.is_showing_fabrication_notes,
      pcb_group_view_mode: s.pcb_group_view_mode,
    },
    setEditMode: s.setEditMode,
    setIsShowingRatsNest: s.setIsShowingRatsNest,
    setIsShowingMultipleTracesLength: s.setIsShowingMultipleTracesLength,
    setIsShowingAutorouting: s.setIsShowingAutorouting,
    setIsShowingDrcErrors: s.setIsShowingDrcErrors,
    setIsShowingCopperPours: s.setIsShowingCopperPours,
    setIsShowingCourtyards: s.setIsShowingCourtyards,
    setIsShowingPcbGroups: s.setIsShowingPcbGroups,
    setIsShowingGroupAnchorOffsets: s.setIsShowingGroupAnchorOffsets,
    setIsShowingSolderMask: s.setIsShowingSolderMask,
    setIsShowingSilkscreen: s.setIsShowingSilkscreen,
    setIsShowingFabricationNotes: s.setIsShowingFabricationNotes,
    setPcbGroupViewMode: s.setPcbGroupViewMode,
    setHoveredErrorId: s.setHoveredErrorId,
  }))

  const [isViewMenuOpen, setViewMenuOpen] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)
  const [isErrorsOpen, setErrorsOpen] = useState(false)
  const [measureToolArmed, setMeasureToolArmed] = useState(false)
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null)
  const [collapsedErrorGroups, setCollapsedErrorGroups] = useState<Set<string>>(
    new Set(),
  )
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(
    new Set(),
  )

  const [, copyToClipboard] = useCopyToClipboard()

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

  const getErrorId = useCallback((error: PcbTraceError, index: number) => {
    return (
      error.pcb_trace_error_id ||
      `error_${index}_${error.error_type}_${error.message?.slice(0, 20)}`
    )
  }, [])

  const groupedErrorElements = useMemo(() => {
    const groups = new Map<
      string,
      { error: PcbTraceError; index: number; errorId: string }[]
    >()

    errorElements.forEach((error, index) => {
      const errorType = error.error_type || "unknown_error"
      const existingGroup = groups.get(errorType) || []
      existingGroup.push({
        error,
        index,
        errorId: getErrorId(error, index),
      })
      groups.set(errorType, existingGroup)
    })

    return Array.from(groups.entries()).map(([errorType, errors]) => ({
      errorType,
      errors,
    }))
  }, [errorElements, getErrorId])

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

  const hasRunInitialMouseCheck = useRef(false)
  const hotkeyBoundaryRef = useRef<HTMLDivElement>(null)

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

  useHotKey("1", hotKeyCallbacks["1"], hotkeyBoundaryRef)
  useHotKey("2", hotKeyCallbacks["2"], hotkeyBoundaryRef)
  useHotKey("3", hotKeyCallbacks["3"], hotkeyBoundaryRef)
  useHotKey("4", hotKeyCallbacks["4"], hotkeyBoundaryRef)
  useHotKey("5", hotKeyCallbacks["5"], hotkeyBoundaryRef)
  useHotKey("6", hotKeyCallbacks["6"], hotkeyBoundaryRef)
  useHotKey("7", hotKeyCallbacks["7"], hotkeyBoundaryRef)
  useHotKey("8", hotKeyCallbacks["8"], hotkeyBoundaryRef)

  useLayoutEffect(() => {
    if (hasRunInitialMouseCheck.current) return
    hasRunInitialMouseCheck.current = true

    const checkMousePosition = (e: MouseEvent) => {
      if (hotkeyBoundaryRef.current) {
        const rect = hotkeyBoundaryRef.current.getBoundingClientRect()
        const isInside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom

        if (isInside) {
          setIsMouseOverContainer(true)
        }
      }
      document.removeEventListener("mousemove", checkMousePosition)
    }

    document.addEventListener("mousemove", checkMousePosition)
    return () => {
      document.removeEventListener("mousemove", checkMousePosition)
    }
  }, [setIsMouseOverContainer])

  const handleMouseEnter = useCallback(() => {
    setIsMouseOverContainer(true)
  }, [setIsMouseOverContainer])

  const handleMouseMove = useCallback(() => {
    if (!isMouseOverContainer) {
      setIsMouseOverContainer(true)
    }
  }, [isMouseOverContainer, setIsMouseOverContainer])

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

  const toggleErrorGroup = useCallback((errorType: string) => {
    setCollapsedErrorGroups((prev) => {
      const next = new Set(prev)
      if (next.has(errorType)) {
        next.delete(errorType)
      } else {
        next.add(errorType)
      }
      return next
    })
  }, [])

  const toggleExpandedError = useCallback((errorId: string) => {
    setExpandedErrorIds((prev) => {
      const next = new Set(prev)
      if (next.has(errorId)) {
        next.delete(errorId)
      } else {
        next.add(errorId)
      }
      return next
    })
  }, [])

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

  const stopCanvasInteractionPropagation = useCallback(
    (
      event:
        | React.MouseEvent<HTMLElement>
        | React.TouchEvent<HTMLElement>
        | React.WheelEvent<HTMLElement>
        | React.PointerEvent<HTMLElement>,
    ) => {
      event.stopPropagation()
    },
    [],
  )

  return (
    <div
      ref={hotkeyBoundaryRef}
      style={{ position: "relative", zIndex: "999 !important" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
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
        onMouseDown={stopCanvasInteractionPropagation}
        onMouseMove={stopCanvasInteractionPropagation}
        onMouseUp={stopCanvasInteractionPropagation}
        onPointerDown={stopCanvasInteractionPropagation}
        onPointerMove={stopCanvasInteractionPropagation}
        onPointerUp={stopCanvasInteractionPropagation}
        onWheel={stopCanvasInteractionPropagation}
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
              maxHeight: "400px",
              overflow: "auto",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            {groupedErrorElements.map(({ errorType, errors }, groupIndex) => {
              const isGroupCollapsed = collapsedErrorGroups.has(errorType)
              return (
                <div
                  key={errorType}
                  style={{
                    borderBottom:
                      groupIndex < groupedErrorElements.length - 1
                        ? "1px solid #444"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      cursor: "pointer",
                      backgroundColor: "#232323",
                      transition: "background-color 0.2s ease",
                      touchAction: "manipulation",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#303030"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#232323"
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      e.currentTarget.style.backgroundColor = "#303030"
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      e.currentTarget.style.backgroundColor = "#232323"
                      toggleErrorGroup(errorType)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleErrorGroup(errorType)
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#ff6b6b",
                      }}
                    >
                      <div
                        style={{
                          color: "#888",
                          fontSize: "16px",
                          transform: isGroupCollapsed
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                        }}
                      >
                        ›
                      </div>
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: isSmallScreen ? "12px" : "13px",
                        }}
                      >
                        {errorType}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: isSmallScreen ? "12px" : "13px",
                        color: "#aaa",
                        whiteSpace: "nowrap",
                        marginLeft: 12,
                      }}
                    >
                      {errors.length}
                    </div>
                  </div>
                  {!isGroupCollapsed &&
                    errors.map(({ error, index, errorId }) => {
                      const isExpanded = expandedErrorIds.has(errorId)

                      return (
                        <div
                          key={errorId}
                          style={{
                            borderTop: "1px solid #3a3a3a",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px 12px 24px",
                              cursor: "pointer",
                              backgroundColor: "#2a2a2a",
                              transition: "background-color 0.2s ease",
                              touchAction: "manipulation",
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
                              toggleExpandedError(errorId)
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpandedError(errorId)
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                fontSize: isSmallScreen ? "12px" : "13px",
                                color: "#ddd",
                                lineHeight: 1.4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                userSelect: "text",
                              }}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {error.message}
                            </div>
                            <div
                              style={{
                                color: "#888",
                                fontSize: "16px",
                                transform: isExpanded
                                  ? "rotate(0deg)"
                                  : "rotate(90deg)",
                                transition: "transform 0.2s ease",
                                flexShrink: 0,
                              }}
                            >
                              ›
                            </div>
                          </div>
                          {isExpanded && (
                            <div
                              data-error-id={index}
                              style={{
                                display: "block",
                                padding: "12px 16px 12px 24px",
                                backgroundColor: "#1a1a1a",
                                borderTop: "1px solid #444",
                                position: "relative",
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
                                  userSelect: "text",
                                  paddingRight: 30,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {error.message}
                              </div>
                              <CopyErrorButton
                                errorId={errorId}
                                errorMessage={error.message}
                                copiedErrorId={copiedErrorId}
                                onCopy={(msg, id) => {
                                  copyToClipboard(msg)
                                  setCopiedErrorId(id)
                                  setTimeout(() => setCopiedErrorId(null), 2000)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
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
                  label="Show Courtyards"
                  checked={viewSettings.is_showing_courtyards}
                  onClick={() => {
                    setIsShowingCourtyards(!viewSettings.is_showing_courtyards)
                  }}
                />
                <CheckboxMenuItem
                  label="Show Solder Mask"
                  checked={viewSettings.is_showing_solder_mask}
                  onClick={() => {
                    setIsShowingSolderMask(!viewSettings.is_showing_solder_mask)
                  }}
                />
                <CheckboxMenuItem
                  label="Show Silkscreen"
                  checked={viewSettings.is_showing_silkscreen}
                  onClick={() => {
                    setIsShowingSilkscreen(!viewSettings.is_showing_silkscreen)
                  }}
                />
                <CheckboxMenuItem
                  label="Show Fabrication Notes"
                  checked={viewSettings.is_showing_fabrication_notes}
                  onClick={() => {
                    setIsShowingFabricationNotes(
                      !viewSettings.is_showing_fabrication_notes,
                    )
                  }}
                />
                <CheckboxMenuItem
                  label="Show Group Anchor Offsets"
                  checked={viewSettings.is_showing_group_anchor_offsets}
                  onClick={() => {
                    setIsShowingGroupAnchorOffsets(
                      !viewSettings.is_showing_group_anchor_offsets,
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
