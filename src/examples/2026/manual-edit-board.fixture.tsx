import { useMemo, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"
import type { EditableBoard } from "../../lib/board-editing"

const createCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "board-main",
      center: { x: 0, y: 0 },
      width: 40,
      height: 24,
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "u1",
      center: { x: -8, y: 2 },
      width: 6,
      height: 6,
      layer: "top",
      rotation: 0,
    } as any,
    {
      type: "pcb_component",
      pcb_component_id: "r1",
      center: { x: 12, y: -4 },
      width: 4,
      height: 2,
      layer: "top",
      rotation: 0,
    } as any,
  ]
}

export const ManualEditBoard = () => {
  const circuitJson = useMemo(() => createCircuit(), [])
  const [boardState, setBoardState] = useState<EditableBoard | null>(null)
  const [status, setStatus] = useState(
    "Toggle Edit Board, then drag the board or a handle.",
  )

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div
        style={{
          padding: 16,
          background: "#121212",
          color: "#f5f5f5",
          borderRadius: 10,
          fontFamily: "sans-serif",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Manual Board Editing</h2>
        <p style={{ opacity: 0.8, marginBottom: 12 }}>
          Use the <strong>Edit Board</strong> toolbar mode to resize the board
          from any edge or corner, or drag the board body to offset it relative
          to the placed parts.
        </p>
        <div
          style={{
            display: "grid",
            gap: 8,
            fontSize: 13,
            background: "#1d1d1d",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div>Status: {status}</div>
          <div>
            Board:{" "}
            {boardState
              ? `${boardState.width.toFixed(1)}mm × ${boardState.height.toFixed(
                  1,
                )}mm at (${boardState.center.x.toFixed(
                  1,
                )}, ${boardState.center.y.toFixed(1)})`
              : "No edits yet"}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 520,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #2d2d2d",
        }}
      >
        <PCBViewer
          circuitJson={circuitJson}
          height={520}
          onBoardChanged={(board, options) => {
            setBoardState(board)
            setStatus(
              options.inProgress ? "Editing board..." : "Board edit complete.",
            )
          }}
        />
      </div>
    </div>
  )
}
