import React, { useEffect, useState } from "react"
import type { HighlightedPrimitive } from "./MouseElementTracker"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "lib/util/z-index-map"
import type {
  AnyCircuitElement,
  PcbPlatedHoleOval,
  PcbSmtPadRotatedPill,
} from "circuit-json"
import { getTraceOverlayInfo } from "lib/get-trace-overlay-text"
import { filterTracesIfMultiple } from "lib/filter-traces-if-multiple"

const containerStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  pointerEvents: "none",
  color: "red",
  fontFamily: "sans-serif",
  fontSize: 12,
  textShadow: "0 0 2px black",
} as const

export const getTextForHighlightedPrimitive = (
  prim: HighlightedPrimitive,
): string => {
  const {
    _element: element,
    _parent_pcb_component,
    _parent_source_component,
    _source_port,
  } = prim
  switch (element.type) {
    case "pcb_trace": {
      if (element.trace_length) {
        return `${element.trace_length.toFixed(3)}`
      }
      return ""
    }
    case "pcb_smtpad":
    case "pcb_plated_hole": {
      const selectors: string[] = []

      const port_hints = Array.from(
        new Set(
          (element.port_hints ?? []).concat(
            (_source_port as any)?.port_hints ?? [],
          ),
        ),
      )
        .filter((ph) => !/^[0-9]+$/.test(ph))
        .filter((ph) => !ph.includes("unnamed_"))
        // reverse alphabetical order
        .sort((a, b) => b.localeCompare(a))

      const parentName =
        _parent_source_component &&
        "name" in _parent_source_component &&
        _parent_source_component.name &&
        !_parent_source_component.name.includes("unnamed_")
          ? _parent_source_component.name
          : null

      if (port_hints.length > 0) {
        if (parentName) {
          selectors.push(
            ...port_hints.map((ph: string) => `${parentName}.${ph}`),
          )
        } else {
          selectors.push(...port_hints)
        }
      } else if (parentName) {
        selectors.push(parentName)
      }

      return selectors.join(", ")
    }
    default: {
      return ""
    }
  }
}

const layerColorHightlightMap = {
  top: "red",
  bottom: "aqua",
}

export const HighlightedPrimitiveBoxWithText = ({
  primitive,
  mousePos,
  elements,
}: {
  elements: AnyCircuitElement[]
  primitive: HighlightedPrimitive
  mousePos: { x: number; y: number }
}) => {
  const [finalState, setFinalState] = useState(false)
  const primitiveElement = primitive._element

  useEffect(() => {
    setTimeout(() => {
      setFinalState(true)
    }, 100)
  }, [])

  const [x, y, w, h] = [
    primitive.screen_x,
    primitive.screen_y,
    primitive.screen_w,
    primitive.screen_h,
  ]

  const si = primitive.same_space_index ?? 0
  const sip = 26

  const color: string =
    layerColorHightlightMap[
      (primitive as any)?._element
        ?.layer as keyof typeof layerColorHightlightMap
    ] ?? "red"

  // Check for rotation on the parent PCB component
  let rotation = 0
  if (
    primitiveElement.type === "pcb_smtpad" &&
    primitiveElement?.shape === "rotated_rect"
  ) {
    rotation = primitiveElement?.ccw_rotation ?? 0
  } else if (
    primitiveElement.type === "pcb_smtpad" &&
    (primitiveElement?.shape === "pill" ||
      primitiveElement?.shape === "rotated_pill") &&
    "ccw_rotation" in primitive
  ) {
    rotation = (primitiveElement as PcbSmtPadRotatedPill).ccw_rotation ?? 0
  } else if (
    primitiveElement.type === "pcb_plated_hole" &&
    (primitiveElement?.shape === "pill" ||
      primitiveElement?.shape === "oval") &&
    "ccw_rotation" in primitive
  ) {
    rotation = (primitiveElement as PcbPlatedHoleOval).ccw_rotation ?? 0
  }
  // In HighlightedPrimitiveBoxWithText component
  if (primitiveElement.type === "pcb_trace") {
    const traceTextContext = { primitiveElement, elements }
    const overlayInfo = getTraceOverlayInfo(traceTextContext)
    if (!overlayInfo) return null

    const yOffset = mousePos.y - 35

    return (
      <div
        style={{
          zIndex: zIndexMap.elementOverlay,
          position: "absolute",
          left: mousePos.x,
          top: yOffset,
          color,
          pointerEvents: "none",
          transform: "translateX(-50%)",
        }}
      >
        <div
          style={{
            backgroundColor: "#f2efcc",
            color: overlayInfo.isOverLength ? "red" : "black",
            textShadow: "none",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            padding: "6px 6px",
            borderRadius: "6px",
            fontSize: "14px",
            minWidth: "45px",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {overlayInfo.text}
        </div>
      </div>
    )
  }

  const label = getTextForHighlightedPrimitive(primitive)
  if (label.trim().length === 0) {
    return null
  }

  return (
    <div
      style={{
        zIndex: zIndexMap.elementOverlay,
        position: "absolute",
        left: x - w / 2 - 8,
        top: y - h / 2 - 8,
        width: w + 16,
        height: h + 16,
        color,
        transform: `rotate(${-rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div
        style={{
          // width: finalState ? `${100 + 20 * si}%` : "100%",
          // height: finalState ? `${100 + 20 * si}%` : "100%",
          // marginLeft: finalState ? `${-10 * si}%` : 0,
          // marginTop: finalState ? `${-10 * si}%` : 0,
          width: finalState ? `calc(100% + ${sip * 2 * si}px)` : "100%",
          height: finalState ? `calc(100% + ${sip * 2 * si}px)` : "100%",
          marginLeft: finalState ? `${-sip * si}px` : 0,
          marginTop: finalState ? `${-sip * si}px` : 0,
          border: `1px solid ${color}`,
          opacity: finalState ? 1 : si === 0 ? 1 : 0,
          transition:
            "width 0.2s, height 0.2s, margin-left 0.2s, margin-top 0.2s, opacity 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: h + 20 + sip * si,
            marginRight: finalState ? `${-sip * si}px` : 0,
            marginBottom: finalState ? 0 : -sip * si,
            transition: "margin-right 0.2s, margin-bottom 0.2s",
            backgroundColor: "#f2efcc",
            color: "black",
            textShadow: "none",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            padding: "6px 6px",
            borderRadius: "6px",
            fontSize: "14px",
            transform: `rotate(${rotation}deg)`,
            minWidth: "45px",
            textAlign: "center",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

export const ElementOverlayBox = ({
  highlightedPrimitives,
  mousePos,
  elements,
}: {
  elements: AnyCircuitElement[]
  highlightedPrimitives: HighlightedPrimitive[]
  mousePos: { x: number; y: number }
}) => {
  const [is_moving_component, is_showing_multiple_traces_length] =
    useGlobalStore((s) => [
      s.is_moving_component,
      s.is_showing_multiple_traces_length,
    ])
  const hasSmtPadAndTrace =
    highlightedPrimitives.some((p) => p._element.type === "pcb_smtpad") &&
    highlightedPrimitives.some((p) => p._element.type === "pcb_trace")

  let primitives = highlightedPrimitives
  // If both smtpad and trace are present, only return smtpads
  if (hasSmtPadAndTrace) {
    primitives = primitives.filter((p) => p._element.type === "pcb_smtpad")
  }
  // When having multiple traces filter traces to get only the shortest one
  primitives = filterTracesIfMultiple({
    primitives,
    is_showing_multiple_traces_length,
    elements,
  })

  return (
    <div style={containerStyle}>
      {!is_moving_component &&
        primitives.map((primitive, i) => (
          <HighlightedPrimitiveBoxWithText
            key={i}
            primitive={primitive}
            mousePos={mousePos}
            elements={elements}
          />
        ))}
    </div>
  )
}
