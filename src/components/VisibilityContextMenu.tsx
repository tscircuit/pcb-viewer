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
  position,
  onClose,
}: {
  position: { x: number; y: number }
  onClose: () => void
}) => {
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
      if (!ref.current?.contains(event.target as Node)) onClose()
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
        const items = Array.from(menu.querySelectorAll("button")).filter(
          (item) => item.closest('[role="menu"]') === menu,
        )
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
          Math.min(position.x, window.innerWidth - (stacked ? 248 : 148)),
        ),
        top: Math.max(
          4,
          Math.min(position.y, window.innerHeight - (stacked ? 340 : 260)),
        ),
        width: stacked ? 230 : 130,
        maxHeight: window.innerHeight - 8,
        ...(stacked ? { overflowY: "auto" } : {}),
      }}
    >
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setVisibilityOpen(true)}
      >
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={visibilityOpen}
          className={itemStyle}
          onClick={() => setVisibilityOpen(true)}
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
                  {[0, 0.1, 0.2, 0.4, 0.6, 0.8, 1].map((value) => (
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
    </div>,
    document.body,
  )
}
