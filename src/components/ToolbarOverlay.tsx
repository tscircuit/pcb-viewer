import { useState } from "react"
import { css } from "@emotion/css"
import { all_layers } from "@tscircuit/builder"
import { LAYER_NAME_TO_COLOR } from "lib/Drawer"

interface Props {
  children?: any
}

export const LayerButton = ({
  name,
  selected,
  onClick,
}: {
  name: string
  selected?: boolean
  onClick: (e: any) => any
}) => {
  return (
    <div
      className={css`
        margin-top: 2px;
        padding: 4px;
        padding-left: 8px;
        padding-right: 18px;
        cursor: pointer;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}
      onClick={onClick}
    >
      <span style={{ marginRight: 2, opacity: selected ? 1 : 0 }}>•</span>
      <span
        style={{
          marginLeft: 2,
          fontWeight: 500,
          color: (LAYER_NAME_TO_COLOR as any)[name.replace(/-/, "")],
        }}
      >
        {name}
      </span>
    </div>
  )
}

export const ToolbarOverlay = ({ children }: Props) => {
  const [isMouseOverContainer, setIsMouseOverContainer] = useState(false)
  const [isLayerMenuOpen, setLayerMenuOpen] = useState(false)

  const selectedLayer = "top"

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => {
        setIsMouseOverContainer(true)
      }}
      onMouseLeave={() => {
        setIsMouseOverContainer(false)
        setLayerMenuOpen(false)
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          opacity: isMouseOverContainer ? 1 : 0,
          top: 0,
          left: 0,
          transition: isMouseOverContainer
            ? "opacity 100ms linear"
            : "opacity 1s linear",
          zIndex: 100,
          color: "red",
          fontSize: 12,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "#1F1F1F",
            border: "1px solid #666",
            margin: 16,
            padding: 4,
            paddingLeft: 6,
            paddingRight: 6,
            borderRadius: 2,
            color: "#eee",
            cursor: "pointer",
          }}
          onClick={() => {
            setLayerMenuOpen(true)
          }}
          onMouseLeave={() => {
            if (isLayerMenuOpen) {
              setLayerMenuOpen(false)
            }
          }}
        >
          <div>
            layer:{" "}
            <span style={{ marginLeft: 2, fontWeight: 500, color: "#CD0000" }}>
              {selectedLayer}
            </span>
          </div>
          {isLayerMenuOpen && (
            <div style={{ marginTop: 4 }}>
              {all_layers.map((layer) => (
                <LayerButton
                  key={layer}
                  name={layer}
                  selected={layer === selectedLayer}
                  onClick={() => {
                    // TODO
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
