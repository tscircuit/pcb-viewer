import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react"
import { css } from "@emotion/css"
import { type LayerRef } from "circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { LAYER_NAME_TO_COLOR } from "lib/Drawer"
import { useGlobalStore } from "../global-store"
import packageJson from "../../package.json"
import { useHotKey } from "hooks/useHotKey"
import { zIndexMap } from "lib/util/z-index-map"
import { useIsSmallScreen } from "hooks/useIsSmallScreen"
import { useMobileTouch } from "hooks/useMobileTouch"
import { ToolbarButton } from "./ToolbarButton"
import { ToolbarErrorDropdown } from "./ToolbarErrorDropdown"

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
    setFocusedErrorId,
  } = useGlobalStore((s) => ({
    isMouseOverContainer: s.is_mouse_over_container,
    setIsMouseOverContainer: s.setIsMouseOverContainer,
    selectedLayer: s.selected_layer,
    selectLayer: s.selectLayer,
    editModes: {
      in_move_footprint_mode: s.in_move_footprint_mode,
      in_draw_trace_mode: s.in_draw_trace_mode,
      in_edit_board_mode: s.in_edit_board_mode,
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
    setFocusedErrorId: s.setFocusedErrorId,
  }))

  const [isViewMenuOpen, setViewMenuOpen] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)
  const [isErrorsOpen, setErrorsOpen] = useState(false)
  const [measureToolArmed, setMeasureToolArmed] = useState(false)

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

  // Find the PCB board to get the number of layers
  const pcbBoard = elements?.find((el) => el.type === "pcb_board") as any
  const numLayers = pcbBoard?.num_layers || 2
  const boardHasExplicitSize =
    pcbBoard &&
    pcbBoard.width != null &&
    pcbBoard.height != null &&
    !pcbBoard.outline?.length

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
  }, [setIsMouseOverContainer])

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

  const closeErrorsMenu = useCallback(() => {
    setErrorsOpen(false)
  }, [])

  const handleEditTraceToggle = useCallback(() => {
    setEditMode(editModes.in_draw_trace_mode ? "off" : "draw_trace")
  }, [editModes.in_draw_trace_mode, setEditMode])

  const handleMoveComponentToggle = useCallback(() => {
    setEditMode(editModes.in_move_footprint_mode ? "off" : "move_footprint")
  }, [editModes.in_move_footprint_mode, setEditMode])

  const handleEditBoardToggle = useCallback(() => {
    setEditMode(editModes.in_edit_board_mode ? "off" : "edit_board")
  }, [editModes.in_edit_board_mode, setEditMode])

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
        <ToolbarErrorDropdown
          elements={elements}
          isOpen={isErrorsOpen}
          isSmallScreen={isSmallScreen}
          onToggle={handleErrorsToggle}
          onClose={closeErrorsMenu}
          setHoveredErrorId={setHoveredErrorId}
          setFocusedErrorId={setFocusedErrorId}
        />
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
        {boardHasExplicitSize && (
          <ToolbarButton
            isSmallScreen={isSmallScreen}
            style={{}}
            onClick={handleEditBoardToggle}
          >
            <div>
              {editModes.in_edit_board_mode ? "✖ " : ""}
              Edit Board
            </div>
          </ToolbarButton>
        )}
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
