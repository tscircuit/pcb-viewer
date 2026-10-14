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

  useEffect(() => {
    if (!open) return
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
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        Search
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
            aria-label="Component name"
            placeholder="Search component name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && normalizedQuery && matches[0]) {
                event.preventDefault()
                select(matches[0].id)
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
            <ul
              aria-label="Matching components"
              style={{
                listStyle: "none",
                padding: 0,
                margin: "8px 0 0",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {matches.map((component) => (
                <li key={component.id}>
                  <button
                    type="button"
                    className={buttonClass}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                    onClick={() => select(component.id)}
                  >
                    <span>{component.name}</span>
                    <span style={{ color: "#aaa" }}>{component.layer}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
