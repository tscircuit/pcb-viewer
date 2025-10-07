import type { AnyCircuitElement } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { useEffect, useRef } from "react"
import { useMeasure } from "react-use"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import colors from "lib/colors"

interface BaseCircuitElement {
  type: string
}

interface PcbComponent extends BaseCircuitElement {
  type: "pcb_component"
  pcb_component_id: string
  width: number
  height: number
  source_component_id: string
  center: { x: number; y: number }
  rotation: number
  layer:
    | "top"
    | "bottom"
    | "inner1"
    | "inner2"
    | "inner3"
    | "inner4"
    | "inner5"
    | "inner6"
  obstructs_within_bounds: boolean
}

interface PcbManualEditConflictWarning extends BaseCircuitElement {
  type: "pcb_manual_edit_conflict_warning"
  pcb_manual_edit_conflict_warning_id: string
  message: string
  pcb_component_id: string
  subcircuit_id: string
  source_component_id: string
  warning_type: "pcb_manual_edit_conflict_warning"
}

interface Props {
  transform?: Matrix
  elements?: AnyCircuitElement[]
  children: any
}

export const WarningGraphicsOverlay = ({
  children,
  transform = identity(),
  elements = [],
}: Props) => {
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height) return

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const pcbComponents = elements.filter(
      (el): el is PcbComponent => el.type === "pcb_component",
    ) as PcbComponent[]

    const warnings = elements.filter(
      (el): el is PcbManualEditConflictWarning =>
        el.type === "pcb_manual_edit_conflict_warning",
    ) as PcbManualEditConflictWarning[]

    ctx.strokeStyle = colors.board.drc_warning
    ctx.lineWidth = 2

    warnings.forEach((warning) => {
      const component = pcbComponents.find(
        (comp) => comp.pcb_component_id === warning.pcb_component_id,
      )

      if (!component) return

      const { width, height, center } = component

      const transformedCenter = applyToPoint(transform, center)

      const scaledWidth = width * Math.abs(transform.a)
      const scaledHeight = height * Math.abs(transform.d)

      const boxPadding = 0.1 * Math.abs(transform.a)

      const boxWidth = scaledWidth + boxPadding * 2
      const boxHeight = scaledHeight + boxPadding * 2
      const x = transformedCenter.x - boxWidth / 2
      const y = transformedCenter.y - boxHeight / 2

      ctx.beginPath()
      ctx.rect(x, y, boxWidth, boxHeight)
      ctx.stroke()

      const labelText = "Manual Edit Conflict"
      const labelPadding = 4
      const fontSize = Math.max(8, Math.min(12, 10 * Math.abs(transform.a)))
      ctx.font = `${fontSize}px sans-serif`
      const labelMetrics = ctx.measureText(labelText)
      const labelWidth = labelMetrics.width + labelPadding * 2
      const labelHeight = fontSize + labelPadding * 2
      const labelX = x + (boxWidth - labelWidth) / 2
      const labelY = y + boxHeight + 5

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.beginPath()
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 3)
      ctx.fill()

      ctx.fillStyle = colors.board.drc_warning
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2)
    })
  }, [elements, transform, width, height])

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {children}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: zIndexMap.warnings,
        }}
      />
    </div>
  )
}
