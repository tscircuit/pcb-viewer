import { css } from "@emotion/css"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useGlobalStore } from "../global-store"
import type {
  PadComponent,
  ViewSchematicComponentEvent,
} from "../lib/get-pad-component"
import type { XRayGroup } from "../lib/x-ray-net"
import { useRenderingEngine } from "./RenderingEngineContext"

const menuStyle = css`
  background: #222;
  color: #eee;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px;
  font: 12px sans-serif;
  box-shadow: 0 4px 16px #0008;
  outline: none;
`
const itemStyle = css`
  display: block;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  &:hover, &:focus-visible { background: #444; }
`

export const VisibilityContextMenu = ({
  component,
  onViewSchematicComponent,
  onSimulateReturnCurrent,
  position,
  onClose,
  onXRayNet,
  xRayGroups = [],
  onXRayGroup,
  xRayDisplayName = "Net",
  onExitXRayNet,
}: {
  component?: PadComponent
  onViewSchematicComponent?: (event: ViewSchematicComponentEvent) => void
  onSimulateReturnCurrent?: () => void
  position: { x: number; y: number }
  onClose: () => void
  onXRayNet?: () => void
  xRayGroups?: XRayGroup[]
  onXRayGroup?: (group: XRayGroup) => void
  xRayDisplayName?: string
  onExitXRayNet?: () => void
}) => {
  const engine = useRenderingEngine()
  const [rendererOpen, setRendererOpen] = useState(false)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const opacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const setOpacity = useGlobalStore((s) => s.setHiddenLayerOpacity)
  const copperPourOpacity = useGlobalStore((s) => s.copper_pour_opacity)
  const setCopperPourOpacity = useGlobalStore((s) => s.setCopperPourOpacity)
  const showCopperPours = useGlobalStore((s) => s.is_showing_copper_pours)
  const setShowCopperPours = useGlobalStore((s) => s.setIsShowingCopperPours)
  const [copperPourOpacityOpen, setCopperPourOpacityOpen] = useState(false)
  const effectiveCopperPourOpacity = showCopperPours ? copperPourOpacity : 0
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [opacityOpen, setOpacityOpen] = useState(false)
  const [heightRequiresStacking, setHeightRequiresStacking] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pendingSubmenuFocus = useRef<HTMLButtonElement | null>(null)
  const stacked = window.innerWidth < 480 || heightRequiresStacking
  const openLeft = !stacked && position.x + 460 > window.innerWidth
  const submenuStyle = stacked
    ? { position: "relative" as const }
    : {
        position: "absolute" as const,
        top: 0,
        ...(openLeft ? { right: "100%" } : { left: "100%" }),
      }

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    if (!stacked && menu.scrollHeight > window.innerHeight - 8) {
      setHeightRequiresStacking(true)
      return
    }
    const height = menu.getBoundingClientRect().height
    menu.style.top = `${Math.max(4, Math.min(position.y, window.innerHeight - height - 4))}px`
  }, [
    position.y,
    stacked,
    rendererOpen,
    simulationOpen,
    visibilityOpen,
    opacityOpen,
    copperPourOpacityOpen,
  ])

  useLayoutEffect(() => {
    const firstItem =
      pendingSubmenuFocus.current?.parentElement?.querySelector<HTMLButtonElement>(
        ':scope > [role="menu"] button',
      )
    if (firstItem) {
      pendingSubmenuFocus.current = null
      firstItem.focus()
    }
  })

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        // Dismiss without letting this same press start a canvas drag.
        event.preventDefault()
        onClose()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    const onScroll = (event: Event) => {
      if (
        !(event.target instanceof Node) ||
        !ref.current?.contains(event.target)
      )
        onClose()
    }
    ref.current?.focus()
    window.addEventListener("pointerdown", dismiss, true)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onClose)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      window.removeEventListener("pointerdown", dismiss, true)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onClose)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      aria-label="PCB context menu"
      className={menuStyle}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        const button = (event.target as HTMLElement).closest("button")
        const menu = button?.closest('[role="menu"]') ?? ref.current
        if (!menu) return
        const items = Array.from(
          menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        ).filter((item) => item.closest('[role="menu"]') === menu)
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault()
          const step = event.key === "ArrowDown" ? 1 : -1
          const index = button ? items.indexOf(button) : step === 1 ? -1 : 0
          items[(index + step + items.length) % items.length]?.focus()
        } else if (
          event.key === "ArrowRight" &&
          button?.hasAttribute("aria-haspopup")
        ) {
          event.preventDefault()
          pendingSubmenuFocus.current = button as HTMLButtonElement
          button.click()
          const firstItem =
            button.parentElement?.querySelector<HTMLButtonElement>(
              ':scope > [role="menu"] button',
            )
          if (firstItem) {
            pendingSubmenuFocus.current = null
            firstItem.focus()
          }
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          menu.parentElement
            ?.querySelector<HTMLElement>(":scope > button")
            ?.focus()
          if (menu.getAttribute("aria-label") === "Hidden Layer Visibility")
            setOpacityOpen(false)
          else if (menu.getAttribute("aria-label") === "Copper Pour Visibility")
            setCopperPourOpacityOpen(false)
          else if (menu.getAttribute("aria-label") === "Visibility")
            setVisibilityOpen(false)
          else if (menu.getAttribute("aria-label") === "Rendering Engine")
            setRendererOpen(false)
          else if (menu.getAttribute("aria-label") === "Simulate")
            setSimulationOpen(false)
        } else if (event.key === "Escape") {
          event.preventDefault()
          onClose()
        }
      }}
      style={{
        position: "fixed",
        zIndex: 10000,
        left: Math.max(
          openLeft ? 310 : 4,
          Math.min(position.x, window.innerWidth - (stacked ? 248 : 168)),
        ),
        top: Math.max(
          4,
          Math.min(position.y, window.innerHeight - (stacked ? 340 : 260)),
        ),
        width: stacked ? 230 : 150,
        maxHeight: window.innerHeight - 8,
        boxSizing: "border-box",
        ...(stacked ? { overflowY: "auto" } : {}),
      }}
    >
      {onXRayNet && (
        <button
          type="button"
          role="menuitem"
          className={itemStyle}
          style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
          onClick={() => {
            onXRayNet()
            onClose()
          }}
        >
          X-Ray {xRayDisplayName}
        </button>
      )}
      {onXRayGroup &&
        xRayGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="menuitem"
            className={itemStyle}
            style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
            onClick={() => {
              onXRayGroup(group)
              onClose()
            }}
          >
            X-Ray {group.name}
          </button>
        ))}
      {onExitXRayNet && (
        <button
          type="button"
          role="menuitem"
          className={itemStyle}
          onClick={() => {
            onExitXRayNet()
            onClose()
          }}
        >
          Exit X-Ray Net
        </button>
      )}
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => {
          setVisibilityOpen(true)
          setRendererOpen(false)
          setSimulationOpen(false)
        }}
      >
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={visibilityOpen}
          className={itemStyle}
          onClick={() => {
            setVisibilityOpen(true)
            setRendererOpen(false)
            setSimulationOpen(false)
          }}
        >
          Visibility ▸
        </button>
        {visibilityOpen && (
          <div
            role="menu"
            aria-label="Visibility"
            className={menuStyle}
            style={submenuStyle}
          >
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => {
                setOpacityOpen(true)
                setCopperPourOpacityOpen(false)
              }}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={opacityOpen}
                className={itemStyle}
                onClick={() => {
                  setOpacityOpen(true)
                  setCopperPourOpacityOpen(false)
                }}
              >
                Hidden Layer Visibility ▸
              </button>
              {opacityOpen && (
                <div
                  role="menu"
                  aria-label="Hidden Layer Visibility"
                  className={menuStyle}
                  style={{
                    minWidth: 80,
                    ...submenuStyle,
                  }}
                >
                  {[0, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={opacity === value}
                      className={itemStyle}
                      onClick={() => {
                        setOpacity(value)
                        onClose()
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{ display: "inline-block", width: 16 }}
                      >
                        {opacity === value ? "✓" : ""}
                      </span>
                      {value === 0 ? "Hide" : `${value * 100}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => {
                setCopperPourOpacityOpen(true)
                setOpacityOpen(false)
              }}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={copperPourOpacityOpen}
                className={itemStyle}
                onClick={() => {
                  setCopperPourOpacityOpen(true)
                  setOpacityOpen(false)
                }}
              >
                Copper Pour Visibility ▸
              </button>
              {copperPourOpacityOpen && (
                <div
                  role="menu"
                  aria-label="Copper Pour Visibility"
                  className={menuStyle}
                  style={{ minWidth: 80, ...submenuStyle }}
                >
                  {[0, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={effectiveCopperPourOpacity === value}
                      className={itemStyle}
                      onClick={() => {
                        if (value > 0) setCopperPourOpacity(value)
                        setShowCopperPours(value > 0)
                        onClose()
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{ display: "inline-block", width: 16 }}
                      >
                        {effectiveCopperPourOpacity === value ? "✓" : ""}
                      </span>
                      {value === 0 ? "Hide" : `${value * 100}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {engine && (
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => {
            setRendererOpen(true)
            setVisibilityOpen(false)
            setSimulationOpen(false)
          }}
        >
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={rendererOpen}
            className={itemStyle}
            onClick={() => {
              setRendererOpen(true)
              setVisibilityOpen(false)
              setSimulationOpen(false)
            }}
          >
            Rendering Engine ▸
          </button>
          {rendererOpen && (
            <div
              role="menu"
              aria-label="Rendering Engine"
              className={menuStyle}
              style={submenuStyle}
            >
              {(["canvas", "webgpu"] as const).map((renderer) => (
                <button
                  key={renderer}
                  type="button"
                  role="menuitemradio"
                  aria-checked={engine.renderer === renderer}
                  className={itemStyle}
                  onClick={() => {
                    engine.setRenderer(renderer)
                    onClose()
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ display: "inline-block", width: 16 }}
                  >
                    {engine.renderer === renderer ? "✓" : ""}
                  </span>
                  {renderer === "canvas" ? "Canvas" : "WebGPU (experimental)"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {component && onViewSchematicComponent && (
        <button
          type="button"
          role="menuitem"
          className={itemStyle}
          style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
          onClick={() => {
            onClose()
            onViewSchematicComponent({
              source_component_id: component.source_component_id,
              pcb_component_id: component.pcb_component_id,
              refdes: component.refdes,
            })
          }}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: "-1px", marginRight: 5 }}
          >
            <path d="M5 11 11 5M5 5h6v6" />
          </svg>
          {component.refdes} on Schematic
        </button>
      )}
      {component?.manufacturer_part_number && (
        <button
          type="button"
          role="menuitem"
          disabled
          aria-label={`Manufacturer part number: ${component.manufacturer_part_number}`}
          className={itemStyle}
          style={{
            marginTop: 4,
            background: "#292929",
            color: "#aaa",
            cursor: "default",
            whiteSpace: "normal",
            overflowWrap: "anywhere",
          }}
        >
          MPN: {component.manufacturer_part_number}
        </button>
      )}
      {onSimulateReturnCurrent && (
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => {
            setSimulationOpen(true)
            setVisibilityOpen(false)
            setRendererOpen(false)
          }}
        >
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={simulationOpen}
            className={itemStyle}
            onClick={() => {
              setSimulationOpen(true)
              setVisibilityOpen(false)
              setRendererOpen(false)
            }}
          >
            Simulate ▸
          </button>
          {simulationOpen && (
            <div
              role="menu"
              aria-label="Simulate"
              className={menuStyle}
              style={{
                ...submenuStyle,
                ...(!stacked ? { top: "auto", bottom: 0 } : {}),
              }}
            >
              <button
                type="button"
                role="menuitem"
                className={itemStyle}
                onClick={() => {
                  onClose()
                  onSimulateReturnCurrent()
                }}
              >
                Return Current Simulation
              </button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
