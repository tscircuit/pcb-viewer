import type { NinePointAnchor, PcbGroup } from "circuit-json"

type Point = { x: number; y: number }

export const getGroupAnchorPosition = (group: PcbGroup): Point | null => {
  if (group.anchor_position) return group.anchor_position

  if (!group.center || !group.width || !group.height) return null

  const { x: cx, y: cy } = group.center
  const w = typeof group.width === "number" ? group.width : Number(group.width)
  const h =
    typeof group.height === "number" ? group.height : Number(group.height)

  return computeAnchorFromAlignment(cx, cy, w, h, group.anchor_alignment)
}

export const computeAnchorFromAlignment = (
  cx: number,
  cy: number,
  w: number,
  h: number,
  alignment: NinePointAnchor,
): Point => {
  const hw = w / 2
  const hh = h / 2

  switch (alignment) {
    case "top_left":
      return { x: cx - hw, y: cy + hh }
    case "top_center":
      return { x: cx, y: cy + hh }
    case "top_right":
      return { x: cx + hw, y: cy + hh }
    case "center_left":
      return { x: cx - hw, y: cy }
    case "center":
      return { x: cx, y: cy }
    case "center_right":
      return { x: cx + hw, y: cy }
    case "bottom_left":
      return { x: cx - hw, y: cy - hh }
    case "bottom_center":
      return { x: cx, y: cy - hh }
    case "bottom_right":
      return { x: cx + hw, y: cy - hh }
    default:
      return { x: cx, y: cy }
  }
}
