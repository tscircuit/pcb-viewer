import { css } from "@emotion/css"
import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useId, useMemo, useRef, useState } from "react"

const buttonClass = css`
  background: #1f1f1f;
  border: 1px solid #666;
  border-radius: 2px;
  color: #eee;
  padding: 4px 8px;
  font: inherit;
  cursor: pointer;
  &:hover, &:focus-visible { background: #444; }
`

export const ComponentSearch = ({
  elements,
  onSelect,
}: {
  elements: AnyCircuitElement[]
  onSelect: (pcbComponentId: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  )
  const container = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const components = useMemo(() => {
    const names = new Map(
      elements.flatMap((element) =>
        element.type === "source_component"
          ? [[element.source_component_id, element.name] as const]
          : [],
      ),
    )
    return elements
      .flatMap((element) => {
        if (element.type !== "pcb_component") return []
        const name = names.get(element.source_component_id)
        return name
          ? [{ id: element.pcb_component_id, name, layer: element.layer }]
          : []
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      )
  }, [elements])
  const normalizedQuery = query.trim().toLowerCase()
  const matches = components.filter((component) =>
    component.name.toLowerCase().includes(normalizedQuery),
  )

  const activeIndex = matches.findIndex(
    (component) => component.id === activeComponentId,
  )
  const activeOptionId =
    activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined
  useEffect(() => {
    if (open && activeOptionId)
      document
        .getElementById(activeOptionId)
        ?.scrollIntoView({ block: "nearest" })
  }, [open, activeOptionId])

  useEffect(() => {
    if (!open) return
    setActiveComponentId(null)
    input.current?.focus()
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [open])

  const select = (id: string) => {
    onSelect(id)
    setOpen(false)
    toggle.current?.focus()
  }

  return (
    <div
      ref={container}
      style={{ position: "relative", height: "fit-content" }}
      onKeyDown={(event) => {
        if (
          (event.key === "ArrowDown" || event.key === "ArrowUp") &&
          open &&
          normalizedQuery &&
          matches.length
        ) {
          event.preventDefault()
          event.stopPropagation()
          const nextIndex =
            activeIndex < 0
              ? event.key === "ArrowDown"
                ? 0
                : matches.length - 1
              : (activeIndex +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  matches.length) %
                matches.length
          const component = matches[nextIndex]
          setActiveComponentId(component.id)
          onSelect(component.id)
          input.current?.focus()
        }
        if (event.key === "Escape") {
          event.stopPropagation()
          setOpen(false)
          toggle.current?.focus()
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        className={buttonClass}
        aria-label="Search components"
        title="Search components"
        style={{ display: "flex", alignItems: "center", padding: "4px 6px" }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            width: "min(260px, calc(100vw - 140px))",
            padding: 8,
            border: "1px solid #666",
            borderRadius: 4,
            background: "#1f1f1f",
            color: "#eee",
            boxSizing: "border-box",
          }}
        >
          <input
            ref={input}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${panelId}-results`}
            aria-activedescendant={activeOptionId}
            aria-label="Component name"
            placeholder="Search component name…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveComponentId(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && normalizedQuery && matches[0]) {
                event.preventDefault()
                select(matches[activeIndex >= 0 ? activeIndex : 0].id)
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 6,
              background: "#111",
              color: "#eee",
              border: "1px solid #666",
              borderRadius: 2,
            }}
          />
          {!normalizedQuery ? (
            <output style={{ display: "block", marginTop: 8 }}>
              Type a component name.
            </output>
          ) : matches.length === 0 ? (
            <output style={{ display: "block", marginTop: 8 }}>
              No matching components.
            </output>
          ) : (
            <div
              id={`${panelId}-results`}
              // biome-ignore lint/a11y/useSemanticElements: Custom combobox popup keeps focus in the input.
              role="listbox"
              tabIndex={-1}
              aria-label="Matching components"
              style={{
                listStyle: "none",
                padding: 0,
                margin: "8px 0 0",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {matches.map((component, index) => (
                <div key={component.id} role="presentation">
                  <button
                    type="button"
                    // biome-ignore lint/a11y/useSemanticElements: Custom combobox options are clickable and use aria-activedescendant.
                    role="option"
                    id={`${panelId}-option-${index}`}
                    aria-selected={component.id === activeComponentId}
                    tabIndex={-1}
                    className={buttonClass}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      border: "none",
                      borderTop: index > 0 ? "1px solid #444" : undefined,
                      borderRadius: 0,
                      padding: "8px 6px",
                      backgroundColor:
                        component.id === activeComponentId
                          ? "#34506e"
                          : undefined,
                    }}
                    onClick={() => select(component.id)}
                  >
                    <span>{component.name}</span>
                    <span style={{ color: "#aaa" }}>{component.layer}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
