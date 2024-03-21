import React from "react"
import { HighlightedPrimitive } from "./MouseElementTracker"

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
  prim: HighlightedPrimitive
): string => {
  const {
    _element: element,
    _parent_pcb_component,
    _parent_source_component,
  } = prim
  switch (element.type) {
    case "pcb_smtpad":
    case "pcb_plated_hole": {
      let s = ""

      if (
        _parent_source_component &&
        "name" in _parent_source_component &&
        _parent_source_component.name
      ) {
        s += `.${_parent_source_component.name} > `
      }
      s += element.port_hints.map((ph) => `port.${ph}`).join(", ")
      return s
    }
    default: {
      return ""
    }
  }
}

export const ElementOverlayBox = ({
  highlightedPrimitives,
}: {
  highlightedPrimitives: HighlightedPrimitive[]
}) => {
  return (
    <div style={containerStyle}>
      {highlightedPrimitives.map((primitive, i) => (
        <div
          key={`${i}-box`}
          style={{
            position: "absolute",
            left: primitive.screen_x - primitive.screen_w / 2 - 8,
            top: primitive.screen_y - primitive.screen_h / 2 - 8,
            width: primitive.screen_w + 16,
            height: primitive.screen_h + 16,
            border: "1px solid red",
          }}
        />
      ))}
      {highlightedPrimitives.map((primitive, i) => (
        <div
          key={`${i}-text`}
          style={{
            position: "absolute",
            left: primitive.screen_x - primitive.screen_w / 2 - 8,
            top: primitive.screen_y - primitive.screen_h / 2 - 8,
            whiteSpace: "pre-line",
            width: Math.max(100, primitive.screen_w + 16),
          }}
        >
          <div style={{ position: "absolute", left: 0, bottom: 0 }}>
            {getTextForHighlightedPrimitive(primitive)}
          </div>
        </div>
      ))}
    </div>
  )
}
