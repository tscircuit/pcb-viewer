import type {
  AnyCircuitElement,
  PcbComponent,
  PcbGroup,
  SourceGroup,
} from "circuit-json"
import { useEffect, useMemo, useRef } from "react"
import { useMeasure } from "react-use"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "../lib/util/z-index-map"

interface Props {
  transform?: Matrix
  elements: AnyCircuitElement[]
  children: any
  hoveredComponentIds?: string[]
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

type SourceGroupId = SourceGroup["source_group_id"]

function getParentSourceGroupId(
  sourceGroup: SourceGroup,
): SourceGroupId | undefined {
  if (!("parent_source_group_id" in sourceGroup)) return undefined
  return typeof sourceGroup.parent_source_group_id === "string"
    ? sourceGroup.parent_source_group_id
    : undefined
}

function getAllDescendantSourceGroups(
  sourceGroupId: SourceGroupId,
  sourceGroupHierarchy: Map<SourceGroupId, SourceGroupId[]>,
): SourceGroupId[] {
  const descendants: SourceGroupId[] = []
  const children = sourceGroupHierarchy.get(sourceGroupId) ?? []

  for (const child of children) {
    descendants.push(child)
    descendants.push(
      ...getAllDescendantSourceGroups(child, sourceGroupHierarchy),
    )
  }

  return descendants
}

function getGroupDepthLevel(
  sourceGroupId: SourceGroupId,
  sourceGroupById: Map<SourceGroupId, SourceGroup>,
): number {
  const sourceGroup = sourceGroupById.get(sourceGroupId)
  if (!sourceGroup) return 0
  const parentSourceGroupId = getParentSourceGroupId(sourceGroup)
  if (!parentSourceGroupId) return 0
  return 1 + getGroupDepthLevel(parentSourceGroupId, sourceGroupById)
}

export const PcbGroupOverlay = ({
  children,
  transform = identity(),
  elements = [],
  hoveredComponentIds = [],
}: Props) => {
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    is_showing_pcb_groups,
    pcb_group_view_mode,
    is_showing_group_anchor_offsets,
  } = useGlobalStore((s) => ({
    is_showing_pcb_groups: s.is_showing_pcb_groups,
    pcb_group_view_mode: s.pcb_group_view_mode,
    is_showing_group_anchor_offsets: s.is_showing_group_anchor_offsets,
  }))
  const { pcbComponents, pcbGroups, sourceGroups } = useMemo(() => {
    const pcbComponents: PcbComponent[] = []
    const pcbGroups: PcbGroup[] = []
    const sourceGroups: SourceGroup[] = []

    for (const element of elements) {
      if (element.type === "pcb_component") pcbComponents.push(element)
      else if (element.type === "pcb_group") pcbGroups.push(element)
      else if (element.type === "source_group") sourceGroups.push(element)
    }

    return { pcbComponents, pcbGroups, sourceGroups }
  }, [elements])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height) return

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (!is_showing_pcb_groups) return

    const sourceGroupById = new Map<SourceGroupId, SourceGroup>(
      sourceGroups.map((group) => [group.source_group_id, group]),
    )

    const visiblePcbGroups = pcbGroups.filter((group) => {
      if (group.name?.toLowerCase().includes("subpanel")) {
        return false
      }

      if (pcb_group_view_mode === "all") return true
      if (!group.source_group_id) return false
      const sourceGroup = sourceGroupById.get(group.source_group_id)
      if (!sourceGroup) return false
      return sourceGroup.was_automatically_named !== true
    })

    const sourceGroupHierarchy = new Map<SourceGroupId, SourceGroupId[]>()
    sourceGroups.forEach((group) => {
      const parentSourceGroupId = getParentSourceGroupId(group)
      if (parentSourceGroupId) {
        const children = sourceGroupHierarchy.get(parentSourceGroupId) ?? []
        children.push(group.source_group_id)
        sourceGroupHierarchy.set(parentSourceGroupId, children)
      }
    })

    const hoveredGroupIds = new Set<string>()
    if (hoveredComponentIds.length > 0) {
      for (const comp of pcbComponents) {
        if (!hoveredComponentIds.includes(comp.pcb_component_id)) continue
        const targetGroupId =
          comp.positioned_relative_to_pcb_group_id ?? comp.pcb_group_id
        if (targetGroupId) hoveredGroupIds.add(targetGroupId)
      }
    }

    visiblePcbGroups.forEach((group, groupIndex) => {
      let groupComponents = pcbComponents.filter(
        (comp) => comp.pcb_group_id === group.pcb_group_id,
      )

      if (group.source_group_id) {
        const descendantSourceGroups = getAllDescendantSourceGroups(
          group.source_group_id,
          sourceGroupHierarchy,
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

      let minX: number
      let minY: number
      let maxX: number
      let maxY: number
      let isExplicitlySized = false

      if (group.center && group.width && group.height) {
        isExplicitlySized = true
        const halfWidth = group.width / 2
        const halfHeight = group.height / 2
        minX = group.center.x - halfWidth
        maxX = group.center.x + halfWidth
        minY = group.center.y - halfHeight
        maxY = group.center.y + halfHeight
      } else {
        if (groupComponents.length === 0) return

        minX = Infinity
        minY = Infinity
        maxX = -Infinity
        maxY = -Infinity

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
      }

      const depthLevel = group.source_group_id
        ? getGroupDepthLevel(group.source_group_id, sourceGroupById)
        : 0
      const hasChildren = group.source_group_id
        ? getAllDescendantSourceGroups(
            group.source_group_id,
            sourceGroupHierarchy,
          ).length > 0
        : false

      if (!isExplicitlySized) {
        const basePadding = 1
        const hierarchyPadding = hasChildren ? 0.5 : 0
        const totalPadding = basePadding + hierarchyPadding

        minX -= totalPadding
        maxX += totalPadding
        minY -= totalPadding
        maxY += totalPadding
      }

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
        depthLevel === 0 || depthLevel === 1 ? 0 : depthLevel * 0.11
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

      const shouldShowAnchorMarker =
        is_showing_group_anchor_offsets &&
        hoveredGroupIds.has(group.pcb_group_id) &&
        Boolean(group.anchor_position)

      if (shouldShowAnchorMarker && group.anchor_position) {
        const anchorPositionValue = Array.isArray(group.anchor_position)
          ? {
              x: group.anchor_position[0] ?? 0,
              y: group.anchor_position[1] ?? 0,
            }
          : { x: group.anchor_position.x, y: group.anchor_position.y }
        const anchorScreenPos = applyToPoint(transform, anchorPositionValue)

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
    height,
    is_showing_pcb_groups,
    is_showing_group_anchor_offsets,
    hoveredComponentIds,
    pcbComponents,
    pcbGroups,
    pcb_group_view_mode,
    sourceGroups,
    transform,
    width,
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
