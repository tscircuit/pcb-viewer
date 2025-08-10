import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { useRef, useEffect } from "react"
import { useMeasure } from "react-use"
import colors from "../lib/colors"
import { zIndexMap } from "../lib/util/z-index-map"

interface Props {
  transform?: Matrix
  elements: AnyCircuitElement[]
  children: any
}

const GROUP_COLORS = [
  "rgb(255, 100, 100)",
  "rgb(100, 255, 100)",
  "rgb(100, 100, 255)",
  "rgb(255, 255, 100)",
  "rgb(255, 100, 255)",
  "rgb(100, 255, 255)",
  "rgb(255, 150, 100)",
  "rgb(150, 100, 255)",
  "rgb(100, 255, 150)",
  "rgb(255, 100, 150)",
]

export const PcbGroupOverlay = ({
  children,
  transform = identity(),
  elements = [],
}: Props) => {
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const is_showing_pcb_groups = useGlobalStore((s) => s.is_showing_pcb_groups)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height) return

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (!is_showing_pcb_groups) return

    const pcbGroups = elements.filter(
      (el): el is PcbGroup => el.type === "pcb_group",
    ) as PcbGroup[]

    const pcbComponents = elements.filter(
      (el): el is PcbComponent => el.type === "pcb_component",
    ) as PcbComponent[]

    pcbGroups.forEach((group, groupIndex) => {
      const groupComponents = pcbComponents.filter(
        (comp) => comp.pcb_group_id === group.pcb_group_id,
      )

      if (groupComponents.length === 0) return

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      groupComponents.forEach((comp) => {
        if (
          comp.center &&
          typeof comp.width === "number" &&
          typeof comp.height === "number"
        ) {
          const left = comp.center.x - comp.width / 2
          const right = comp.center.x + comp.width / 2
          const top = comp.center.y + comp.height / 2
          const bottom = comp.center.y - comp.height / 2

          minX = Math.min(minX, left)
          maxX = Math.max(maxX, right)
          minY = Math.min(minY, bottom)
          maxY = Math.max(maxY, top)
        }
      })

      if (minX === Infinity || maxX === -Infinity) return

      const padding = 1
      minX -= padding
      maxX += padding
      minY -= padding
      maxY += padding

      const topLeft = applyToPoint(transform, { x: minX, y: maxY })
      const topRight = applyToPoint(transform, { x: maxX, y: maxY })
      const bottomLeft = applyToPoint(transform, { x: minX, y: minY })
      const bottomRight = applyToPoint(transform, { x: maxX, y: minY })

      const groupColor = GROUP_COLORS[groupIndex % GROUP_COLORS.length]
      ctx.strokeStyle = groupColor

      ctx.lineWidth = 2

      const dashSize = Math.max(4, Math.min(12, 8 * Math.abs(transform.a)))
      const gapSize = Math.max(2, Math.min(6, 4 * Math.abs(transform.a)))
      ctx.setLineDash([dashSize, gapSize])

      ctx.beginPath()
      ctx.moveTo(topLeft.x, topLeft.y)
      ctx.lineTo(topRight.x, topRight.y)
      ctx.lineTo(bottomRight.x, bottomRight.y)
      ctx.lineTo(bottomLeft.x, bottomLeft.y)
      ctx.closePath()
      ctx.stroke()

      const fontSize = Math.abs(transform.a)
      const labelPadding = 4

      const labelText = group.name || `Group ${groupIndex + 1}`

      ctx.font = `${fontSize}px sans-serif`
      ctx.setLineDash([])

      const labelMetrics = ctx.measureText(labelText)
      const labelWidth = labelMetrics.width + labelPadding * 2
      const labelHeight = fontSize + labelPadding * 2

      const labelX = topLeft.x - 5
      const labelY = topLeft.y - 5

      const borderRadius = 3
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.beginPath()
      ctx.roundRect(
        labelX,
        labelY - labelHeight,
        labelWidth,
        labelHeight,
        borderRadius,
      )
      ctx.fill()

      ctx.fillStyle = groupColor
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(labelText, labelX + labelPadding, labelY - labelHeight / 2)
    })
  }, [elements, transform, width, height, is_showing_pcb_groups])

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
          zIndex: zIndexMap.pcbGroupOverlay,
          display: is_showing_pcb_groups ? "block" : "none",
        }}
      />
    </div>
  )
}
