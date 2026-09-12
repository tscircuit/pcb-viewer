import { useEffect, useId, useRef, useState } from "react"
import { useGlobalStore } from "../global-store"

const modes = [
  ["hidden", "Hidden"],
  ["all", "All connections"],
  ["unconnected", "Only unconnected"],
] as const

export const RatsNestMenu = ({
  isSmallScreen,
  onOpen,
}: {
  isSmallScreen: boolean
  onOpen?: () => void
}) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const radioName = useId()
  const showing = useGlobalStore((s) => s.is_showing_rats_nest)
  const onlyUnconnected = useGlobalStore(
    (s) => s.is_showing_only_unconnected_rats_nest,
  )
  const setMode = useGlobalStore((s) => s.setRatsNestMode)
  const mode = !showing ? "hidden" : onlyUnconnected ? "unconnected" : "all"

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
      },
      { capture: true, signal: controller.signal },
    )
    return () => controller.abort()
  }, [open])

  return (
    <div
      ref={menuRef}
      // Keep radio/button focus: the board focuses itself on bubbled clicks.
      onClick={(event) => event.stopPropagation()}
      style={{
        backgroundColor: "#1F1F1F",
        border: "1px solid #666",
        borderRadius: 2,
        color: "#eee",
        height: "fit-content",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${radioName}-choices`}
        onClick={() => {
          if (!open) onOpen?.()
          setOpen(!open)
        }}
        style={{
          background: "none",
          border: 0,
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
          padding: isSmallScreen ? "4px 8px" : "4px 6px",
        }}
      >
        {showing ? "✖ " : ""}Rats Nest {open ? "▴" : "▾"}
      </button>
      {open && (
        <fieldset
          id={`${radioName}-choices`}
          style={{ border: 0, margin: 0, padding: "2px 8px 6px" }}
        >
          <legend style={{ fontSize: 11 }}>Connections to show</legend>
          {modes.map(([ratsNestMode, label]) => (
            <label
              key={ratsNestMode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={radioName}
                value={ratsNestMode}
                checked={mode === ratsNestMode}
                onChange={() => setMode(ratsNestMode)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  )
}
