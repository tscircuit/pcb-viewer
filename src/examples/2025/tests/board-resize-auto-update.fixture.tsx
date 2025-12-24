import { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import type { AnyCircuitElement, PcbBoard, PcbSmtPad } from "circuit-json"

// Helper to create a basic circuit with a board and some components
const createCircuit = (
  boardWidth: number,
  boardHeight: number,
  componentCount: number = 1,
): AnyCircuitElement[] => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: boardWidth,
      height: boardHeight,
    } as PcbBoard,
  ]

  // Add components spread across the board
  for (let i = 0; i < componentCount; i++) {
    const xOffset =
      (i - (componentCount - 1) / 2) * (boardWidth / (componentCount + 1))
    elements.push(
      {
        type: "pcb_component",
        pcb_component_id: `c${i}`,
        center: { x: xOffset, y: 0 },
        width: 2,
        height: 2,
        rotation: 0,
        layer: "top",
      } as AnyCircuitElement,
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad${i}_1`,
        pcb_component_id: `c${i}`,
        shape: "rect",
        x: xOffset - 0.5,
        y: 0,
        width: 0.6,
        height: 1,
        layer: "top",
      } as PcbSmtPad,
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad${i}_2`,
        pcb_component_id: `c${i}`,
        shape: "rect",
        x: xOffset + 0.5,
        y: 0,
        width: 0.6,
        height: 1,
        layer: "top",
      } as PcbSmtPad,
    )
  }

  return elements
}

/**
 * Test: Board Size Change - Width and Height
 *
 * This test verifies that when the board dimensions (width/height) change,
 * the PCBViewer automatically re-centers and rescales to fit the new board.
 *
 * Issue: PCB viewer should auto-resize when board changes (RunFrame key should change)
 */
export const BoardSizeChange = () => {
  const boardSizes = [
    { width: 20, height: 20, label: "Small (20x20mm)" },
    { width: 50, height: 50, label: "Medium (50x50mm)" },
    { width: 100, height: 100, label: "Large (100x100mm)" },
    { width: 150, height: 80, label: "Wide (150x80mm)" },
    { width: 60, height: 120, label: "Tall (60x120mm)" },
  ]

  const [sizeIndex, setSizeIndex] = useState(0)
  const currentSize = boardSizes[sizeIndex]

  const circuit = createCircuit(currentSize.width, currentSize.height, 3)

  const nextSize = () => {
    setSizeIndex((prev) => (prev + 1) % boardSizes.length)
  }

  const prevSize = () => {
    setSizeIndex((prev) => (prev - 1 + boardSizes.length) % boardSizes.length)
  }

  return (
    <div>
      <div
        style={{
          padding: "16px",
          background: "#1a1a2e",
          color: "white",
          marginBottom: "10px",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0" }}>Board Size Change Test</h2>
        <p style={{ margin: "0 0 12px 0", opacity: 0.8 }}>
          Tests that PCBViewer auto-resizes when board dimensions change.
          <br />
          The viewer should automatically re-center and rescale to fit each new
          board size.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={prevSize}
            style={{
              padding: "8px 16px",
              background: "#4a4a6a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Previous
          </button>
          <span
            style={{
              padding: "8px 16px",
              background: "#2a2a4a",
              borderRadius: "4px",
              minWidth: "180px",
              textAlign: "center",
            }}
          >
            {currentSize.label}
          </span>
          <button
            onClick={nextSize}
            style={{
              padding: "8px 16px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Next
          </button>
        </div>

        <div
          style={{
            fontSize: "13px",
            opacity: 0.7,
            background: "#2a2a4a",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <strong>Expected:</strong> Board should be centered and fully visible
          after each size change.
        </div>
      </div>

      <div
        style={{
          height: "500px",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <PCBViewer circuitJson={circuit} height={500} />
      </div>
    </div>
  )
}

/**
 * Test: Board Size Key Calculation Verification
 *
 * This test displays the calculated boardSizeKey alongside the viewer
 * to help verify the key is changing correctly and triggering auto-resize.
 *
 * The boardSizeKey is calculated as:
 * - "empty" if circuitJson is undefined or empty
 * - "no-board" if no pcb_board element exists
 * - outline coordinates joined if board has outline
 * - "{width}_{height}" otherwise
 */
export const BoardSizeKeyVerification = () => {
  const [width, setWidth] = useState(50)
  const [height, setHeight] = useState(50)

  // Calculate what the boardSizeKey would be
  const calculateExpectedKey = () => {
    return `${width}_${height}`
  }

  const circuit = createCircuit(width, height, 2)

  return (
    <div>
      <div
        style={{
          padding: "16px",
          background: "#1a1a2e",
          color: "white",
          marginBottom: "10px",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0" }}>Board Size Key Verification</h2>
        <p style={{ margin: "0 0 12px 0", opacity: 0.8 }}>
          Displays the calculated boardSizeKey for the current configuration.
          <br />
          Verify that changes to width/height trigger key changes and
          auto-resize.
        </p>

        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            Width:
            <input
              type="range"
              min="20"
              max="150"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              style={{ width: "100px" }}
            />
            <span style={{ minWidth: "50px" }}>{width}mm</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            Height:
            <input
              type="range"
              min="20"
              max="150"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              style={{ width: "100px" }}
            />
            <span style={{ minWidth: "50px" }}>{height}mm</span>
          </label>
        </div>

        <div
          style={{
            background: "#2a2a4a",
            padding: "12px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "13px",
            overflowX: "auto",
          }}
        >
          <strong>Expected boardSizeKey:</strong>
          <br />
          <code style={{ color: "#4CAF50" }}>{calculateExpectedKey()}</code>
        </div>
      </div>

      <div
        style={{
          height: "500px",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <PCBViewer circuitJson={circuit} height={500} />
      </div>
    </div>
  )
}

export default {
  BoardSizeChange,
  BoardSizeKeyVerification,
}
