import React, { useEffect, useState } from "react"
import { HighlightedPrimitive } from "./MouseElementTracker"
import colors from "lib/colors"
import { useGlobalStore } from "global-store"

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
      s += (element.port_hints ?? element._source_port?.port_hints)
        .map((ph: string) => `port.${ph}`)
        .join(", ")
      return s
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
}: {
  primitive: HighlightedPrimitive
}) => {
  const [finalState, setFinalState] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setFinalState(true)
    }, 100)
  }, [])

  let [x, y, w, h] = [
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

  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2 - 8,
        top: y - h / 2 - 8,
        width: w + 16,
        height: h + 16,
        color,
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
            left: 0,
            bottom: h + 20 + sip * si,
            marginLeft: finalState ? `${-sip * si}px` : 0,
            marginBottom: finalState ? 0 : -sip * si,
            transition: "margin-left 0.2s, margin-bottom 0.2s",
            lineHeight: "0.8em",
          }}
        >
          {getTextForHighlightedPrimitive(primitive)}
        </div>
      </div>
    </div>
  )
}

export const ElementOverlayBox = ({
  highlightedPrimitives,
}: {
  highlightedPrimitives: HighlightedPrimitive[]
}) => {
  const is_moving_component = useGlobalStore((s) => s.is_moving_component)

  return (
    <div style={containerStyle}>
      {!is_moving_component &&
        highlightedPrimitives.map((primitive, i) => (
          <HighlightedPrimitiveBoxWithText key={i} primitive={primitive} />
        ))}
    </div>
  )
}
