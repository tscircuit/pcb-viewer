import React, { useEffect, useState } from "react"
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

export const HighlightedPrimitiveBoxWithText = ({
  primitive,
}: {
  primitive: HighlightedPrimitive
}) => {
  const [finalState, setFinalState] = useState(false)

  useEffect(() => {
    // let a = false
    // const interval = setInterval(() => {
    //   setFinalState(!a)
    //   a = !a
    // }, 500)
    // return () => {
    //   clearInterval(interval)
    // }
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

  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2 - 8,
        top: y - h / 2 - 8,
        width: w + 16,
        height: h + 16,
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
          border: "1px solid red",
          transition:
            "width 0.2s, height 0.2s, margin-left 0.2s, margin-top 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: finalState ? h + 20 + sip * si : h + 20,
            transition: "left 0.2s, bottom 0.2s",
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
  console.log({ highlightedPrimitives })
  return (
    <div style={containerStyle}>
      {highlightedPrimitives.map((primitive, i) => (
        <HighlightedPrimitiveBoxWithText key={i} primitive={primitive} />
      ))}
      {/* {highlightedPrimitives.map((primitive, i) => (
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
      ))} */}
    </div>
  )
}
