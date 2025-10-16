import type {
  AnyCircuitElement,
  PcbComponent,
  PcbGroup,
  SourceGroup,
} from "circuit-json"
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
  const { is_showing_pcb_groups, pcb_group_view_mode } = useGlobalStore(
    (s) => ({
      is_showing_pcb_groups: s.is_showing_pcb_groups,
      pcb_group_view_mode: s.pcb_group_view_mode,
    }),
  )

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

    const sourceGroups = elements.filter(
      (el): el is SourceGroup => el.type === "source_group",
    ) as SourceGroup[]

    const sourceGroupById = new Map(
      sourceGroups.map((group) => [group.source_group_id, group]),
    )

    const visiblePcbGroups = pcbGroups.filter((group) => {
      if (pcb_group_view_mode === "all") return true
      if (!group.source_group_id) return false
      const sourceGroup = sourceGroupById.get(group.source_group_id)
      if (!sourceGroup) return false
      return sourceGroup.was_automatically_named !== true
    })

    const sourceGroupHierarchy = new Map<string, string[]>()
    sourceGroups.forEach((group) => {
      const groupWithParent = group as any
      if (groupWithParent.parent_source_group_id) {
        const children =
          sourceGroupHierarchy.get(groupWithParent.parent_source_group_id) || []
        children.push(group.source_group_id)
        sourceGroupHierarchy.set(
          groupWithParent.parent_source_group_id,
          children,
        )
      }
    })

    const getAllDescendantSourceGroups = (sourceGroupId: string): string[] => {
      const descendants: string[] = []
      const children = sourceGroupHierarchy.get(sourceGroupId) || []

      for (const child of children) {
        descendants.push(child)
        descendants.push(...getAllDescendantSourceGroups(child))
      }

      return descendants
    }

    const getGroupDepthLevel = (sourceGroupId: string): number => {
      const groupWithParent = sourceGroups.find(
        (g) => g.source_group_id === sourceGroupId,
      ) as any
      if (!groupWithParent?.parent_source_group_id) {
        return 0
      }
      return 1 + getGroupDepthLevel(groupWithParent.parent_source_group_id)
    }

    visiblePcbGroups.forEach((group, groupIndex) => {
      let groupComponents = pcbComponents.filter(
        (comp) => comp.pcb_group_id === group.pcb_group_id,
      )

      if (group.source_group_id) {
        const descendantSourceGroups = getAllDescendantSourceGroups(
          group.source_group_id,
        )

        const childPcbGroups = pcbGroups.filter(
          (pcbGroup) =>
            pcbGroup.source_group_id &&
            descendantSourceGroups.includes(pcbGroup.source_group_id),
        )

        for (const childPcbGroup of childPcbGroups) {
          const childComponents = pcbComponents.filter(
            (comp) => comp.pcb_group_id === childPcbGroup.pcb_group_id,
          )
          groupComponents = [...groupComponents, ...childComponents]
        }
      }

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

      const depthLevel = group.source_group_id
        ? getGroupDepthLevel(group.source_group_id)
        : 0
      const hasChildren = group.source_group_id
        ? getAllDescendantSourceGroups(group.source_group_id).length > 0
        : false

      const basePadding = 1
      const hierarchyPadding = hasChildren ? 0.5 : 0
      const totalPadding = basePadding + hierarchyPadding

      minX -= totalPadding
      maxX += totalPadding
      minY -= totalPadding
      maxY += totalPadding

      const topLeft = applyToPoint(transform, { x: minX, y: maxY })
      const topRight = applyToPoint(transform, { x: maxX, y: maxY })
      const bottomLeft = applyToPoint(transform, { x: minX, y: minY })
      const bottomRight = applyToPoint(transform, { x: maxX, y: minY })

      const groupColor = GROUP_COLORS[groupIndex % GROUP_COLORS.length]
      ctx.strokeStyle = groupColor

      ctx.lineWidth = 2

      const baseDashSize = Math.max(4, Math.min(12, 8 * Math.abs(transform.a)))
      const baseGapSize = Math.max(2, Math.min(6, 4 * Math.abs(transform.a)))
      const dashMultiplier = hasChildren ? 1.3 : 1
      const dashSize = baseDashSize * dashMultiplier
      const gapSize = baseGapSize
      ctx.setLineDash([dashSize, gapSize])

      ctx.beginPath()
      ctx.moveTo(topLeft.x, topLeft.y)
      ctx.lineTo(topRight.x, topRight.y)
      ctx.lineTo(bottomRight.x, bottomRight.y)
      ctx.lineTo(bottomLeft.x, bottomLeft.y)
      ctx.closePath()
      ctx.stroke()

      const baseFontSize = Math.max(8, Math.min(12, 10 * Math.abs(transform.a)))
      const fontSizeReduction =
        depthLevel == 0 || depthLevel == 1 ? 0 : depthLevel * 0.11
      const fontSize = baseFontSize * (1 - fontSizeReduction)
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

      // Draw anchor position if it exists
      if (group.anchor_position) {
        // Calculate where anchor intersects with the group boundary
        const anchor = group.anchor_position
        const groupLeft = minX
        const groupRight = maxX
        const groupTop = maxY
        const groupBottom = minY

        // Find the closest edge point to the anchor
        let edgePoint = { x: anchor.x, y: anchor.y }

        // Determine which edge the anchor is closest to
        const distToLeft = Math.abs(anchor.x - groupLeft)
        const distToRight = Math.abs(anchor.x - groupRight)
        const distToTop = Math.abs(anchor.y - groupTop)
        const distToBottom = Math.abs(anchor.y - groupBottom)

        const minDist = Math.min(
          distToLeft,
          distToRight,
          distToTop,
          distToBottom,
        )

        // Position on the nearest edge
        if (minDist === distToLeft) {
          edgePoint = { x: groupLeft, y: anchor.y }
        } else if (minDist === distToRight) {
          edgePoint = { x: groupRight, y: anchor.y }
        } else if (minDist === distToTop) {
          edgePoint = { x: anchor.x, y: groupTop }
        } else {
          edgePoint = { x: anchor.x, y: groupBottom }
        }

        const anchorScreenPos = applyToPoint(transform, edgePoint)

        // Draw a simple "+" symbol
        ctx.strokeStyle = "white"
        ctx.lineWidth = 1.5
        ctx.setLineDash([])

        const plusSize = Math.max(4, Math.min(8, 6 * Math.abs(transform.a)))

        // Draw horizontal line of "+"
        ctx.beginPath()
        ctx.moveTo(anchorScreenPos.x - plusSize, anchorScreenPos.y)
        ctx.lineTo(anchorScreenPos.x + plusSize, anchorScreenPos.y)
        ctx.stroke()

        // Draw vertical line of "+"
        ctx.beginPath()
        ctx.moveTo(anchorScreenPos.x, anchorScreenPos.y - plusSize)
        ctx.lineTo(anchorScreenPos.x, anchorScreenPos.y + plusSize)
        ctx.stroke()
      }
    })
  }, [
    elements,
    transform,
    width,
    height,
    is_showing_pcb_groups,
    pcb_group_view_mode,
  ])

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
