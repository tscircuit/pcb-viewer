import type {
  PadComponent,
  ViewSchematicComponentEvent,
} from "../lib/get-pad-component"
import type { XRayGroup } from "../lib/x-ray-net"
import { useRenderingEngine } from "./RenderingEngineContext"
import { css } from "@emotion/css"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useGlobalStore } from "../global-store"

const menuStyle = css`
  background: #222;
  color: #eee;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px;
  font: 12px sans-serif;
  box-shadow: 0 4px 16px #0008;
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
  const opacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const setOpacity = useGlobalStore((s) => s.setHiddenLayerOpacity)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [opacityOpen, setOpacityOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const stacked = window.innerWidth < 480
  const openLeft = !stacked && position.x + 460 > window.innerWidth
  const submenuStyle = stacked
    ? { position: "relative" as const }
    : {
        position: "absolute" as const,
        top: 0,
        ...(openLeft ? { right: "100%" } : { left: "100%" }),
      }

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
    ref.current?.querySelector("button")?.focus()
    window.addEventListener("pointerdown", dismiss, true)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onClose)
    window.addEventListener("scroll", onClose, true)
    return () => {
      window.removeEventListener("pointerdown", dismiss, true)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onClose)
      window.removeEventListener("scroll", onClose, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
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
        if (!button) return
        const menu = button.closest('[role="menu"]')!
        const items = Array.from(
          menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        ).filter((item) => item.closest('[role="menu"]') === menu)
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault()
          const step = event.key === "ArrowDown" ? 1 : -1
          items[
            (items.indexOf(button) + step + items.length) % items.length
          ]?.focus()
        } else if (
          event.key === "ArrowRight" &&
          button.hasAttribute("aria-haspopup")
        ) {
          event.preventDefault()
          button.click()
          requestAnimationFrame(() =>
            button.parentElement
              ?.querySelector<HTMLElement>('[role="menu"] button')
              ?.focus(),
          )
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          menu.parentElement
            ?.querySelector<HTMLElement>(":scope > button")
            ?.focus()
          if (menu.getAttribute("aria-label") === "Hidden Layer Visibility")
            setOpacityOpen(false)
          else if (menu.getAttribute("aria-label") === "Visibility")
            setVisibilityOpen(false)
          else if (menu.getAttribute("aria-label") === "Rendering Engine")
            setRendererOpen(false)
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
              onMouseEnter={() => setOpacityOpen(true)}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={opacityOpen}
                className={itemStyle}
                onClick={() => setOpacityOpen(true)}
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
          </div>
        )}
      </div>
      {engine && (
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => {
            setRendererOpen(true)
            setVisibilityOpen(false)
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
    </div>,
    document.body,
  )
}
